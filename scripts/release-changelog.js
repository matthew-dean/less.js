#!/usr/bin/env node

'use strict';

// Build a grouped, linked changelog for the auto-created release PR body.
//
// Reads `git log <since>..<until>`, groups commits by conventional-commit type
// (feat/fix/…), and links every `#NNN` and `Closes/Fixes #NNN` reference to the
// repository's issues. Dependency-light on purpose: git + string parsing only.
//
// Usage:
//   node scripts/release-changelog.js [<sinceRef>] [<untilRef>]
//   node scripts/release-changelog.js --selftest
//
// <sinceRef> defaults to the most recent tag reachable from HEAD; <untilRef>
// defaults to HEAD. GITHUB_REPOSITORY (owner/repo) picks the link target and
// falls back to less/less.js.

const { execFileSync } = require('child_process');

// Conventional-commit type → heading, in the order they should appear.
const GROUPS = [
  ['feat', 'Features'],
  ['fix', 'Bug Fixes'],
  ['perf', 'Performance'],
  ['refactor', 'Refactoring'],
  ['revert', 'Reverts'],
  ['docs', 'Documentation'],
  ['test', 'Tests'],
  ['build', 'Build System'],
  ['ci', 'Continuous Integration'],
  ['style', 'Styles'],
  ['chore', 'Chores'],
  ['other', 'Other Changes'],
];

const GROUP_HEADINGS = new Map(GROUPS);
const CONVENTIONAL = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;
const CLOSES = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
const ISSUE_REF = /#(\d+)/g;
// Release commits are the PR's own bump commit — never changelog material.
const RELEASE_SUBJECT = /^chore: (?:alpha )?release v/;

function repoUrl(repo) {
  return `https://github.com/${repo || 'less/less.js'}`;
}

// Split `git log` output (records separated by \x1e, fields by \x00).
function parseLog(raw) {
  return raw
    .split('\x1e')
    .map(record => record.trim())
    .filter(Boolean)
    .map(record => {
      const [sha, subject, body = ''] = record.split('\x00');
      return { sha: (sha || '').trim(), subject: (subject || '').trim(), body: body.trim() };
    })
    .filter(commit => commit.sha && commit.subject);
}

function classify(commit) {
  const match = commit.subject.match(CONVENTIONAL);
  const type = match && GROUP_HEADINGS.has(match[1].toLowerCase())
    ? match[1].toLowerCase()
    : 'other';
  const scope = match ? match[2] : null;
  const description = match ? match[4] : commit.subject;
  return { ...commit, type, scope, description };
}

function issuesFrom(text) {
  return new Set((text.match(ISSUE_REF) || []).map(ref => ref.slice(1)));
}

function closesFrom(text) {
  const refs = new Set();
  let m;
  CLOSES.lastIndex = 0;
  while ((m = CLOSES.exec(text)) !== null) refs.add(m[1]);
  return refs;
}

function linkIssue(number, url) {
  return `[#${number}](${url}/issues/${number})`;
}

function linkify(text, url) {
  return text.replace(ISSUE_REF, (_, n) => linkIssue(n, url));
}

function renderCommit(commit, url) {
  const scope = commit.scope ? `**${commit.scope}:** ` : '';
  let line = `- \`${commit.sha}\` ${scope}${linkify(commit.description, url)}`;

  // Surface "Closes/Fixes #N" from the body when it isn't already in the subject.
  const inSubject = issuesFrom(commit.subject);
  const closes = [...closesFrom(commit.body)].filter(n => !inSubject.has(n));
  if (closes.length) {
    line += ` (closes ${closes.map(n => linkIssue(n, url)).join(', ')})`;
  }
  return line;
}

function buildChangelog(commits, { repo, since } = {}) {
  const url = repoUrl(repo);
  const kept = commits
    .filter(c => !RELEASE_SUBJECT.test(c.subject))
    .map(classify);

  const heading = since ? `## Changes since ${since}` : '## Changes';
  if (kept.length === 0) {
    return `${heading}\n\n_No changes found in this range._`;
  }

  const sections = [];
  for (const [type, title] of GROUPS) {
    const group = kept.filter(c => c.type === type);
    if (group.length === 0) continue;
    sections.push(`### ${title}\n\n${group.map(c => renderCommit(c, url)).join('\n')}`);
  }

  return `${heading}\n\n${sections.join('\n\n')}`;
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function lastTag() {
  try {
    return git(['describe', '--tags', '--abbrev=0']).trim();
  } catch {
    return '';
  }
}

function readCommits(since, until) {
  const range = since ? `${since}..${until}` : until;
  const args = ['log', '--no-merges', '--format=%h%x00%s%x00%b%x1e'];
  if (!since) args.push('--max-count=100');
  args.push(range);
  return parseLog(git(args));
}

function generate(argv) {
  const since = argv[0] || lastTag();
  const until = argv[1] || 'HEAD';
  const commits = readCommits(since, until);
  return buildChangelog(commits, { repo: process.env.GITHUB_REPOSITORY, since });
}

function selftest() {
  const assert = require('assert');
  const commits = parseLog(
    [
      ['a1', 'feat(parser): add thing (#10)', 'Closes #11'].join('\x00'),
      ['b2', 'fix: crash on empty', 'Fixes #12'].join('\x00'),
      ['c3', 'chore: release v5.0.0-alpha.5', ''].join('\x00'),
      ['d4', 'random subject without type', ''].join('\x00'),
    ].join('\x1e'),
  );
  assert.strictEqual(commits.length, 4);

  const out = buildChangelog(commits, { repo: 'less/less.js', since: 'v5.0.0-alpha.4' });
  assert.ok(out.includes('## Changes since v5.0.0-alpha.4'));
  assert.ok(out.includes('### Features'));
  assert.ok(out.includes('**parser:**'));
  // Subject reference is linked; body "Closes #11" is appended.
  assert.ok(out.includes('[#10](https://github.com/less/less.js/issues/10)'));
  assert.ok(out.includes('(closes [#11](https://github.com/less/less.js/issues/11))'));
  // fix group present, release commit dropped, untyped commit falls to Other.
  assert.ok(out.includes('### Bug Fixes'));
  assert.ok(!out.includes('chore: release'));
  assert.ok(out.includes('### Other Changes'));
  // Empty range yields a friendly note, not an empty body.
  assert.ok(buildChangelog([], { since: 'v1' }).includes('_No changes found'));
  console.log('release-changelog selftest passed');
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv[0] === '--selftest') {
    selftest();
  } else {
    process.stdout.write(generate(argv) + '\n');
  }
}

module.exports = {
  buildChangelog,
  classify,
  closesFrom,
  issuesFrom,
  linkify,
  parseLog,
  renderCommit,
};
