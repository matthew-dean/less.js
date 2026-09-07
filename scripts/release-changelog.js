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

// Less variable names like `@block1` or `@1` in subjects would otherwise render
// as GitHub @-mentions. Emit the `@` as an HTML entity so it stays literal text.
function escapeMentions(text) {
  return text.replace(/@(?=[\w-])/g, '&#64;');
}

function renderCommit(commit, url) {
  const scope = commit.scope ? `**${commit.scope}:** ` : '';
  // Linkify #refs first, then escape @mentions — the &#64; entity contains a
  // "#64" that linkify would otherwise mistake for an issue reference.
  let line = `- \`${commit.sha}\` ${scope}${escapeMentions(linkify(commit.description, url))}`;

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

const TAG = /^v?(\d+)\.(\d+)\.(\d+)(?:-alpha\.(\d+))?$/;

function parseTag(tag) {
  const m = TAG.exec(tag.trim());
  if (!m) return null;
  // A stable X.Y.Z sorts above its own -alpha.N; Infinity puts it last-wins.
  return {
    tag: tag.trim(),
    nums: [+m[1], +m[2], +m[3], m[4] === undefined ? Infinity : +m[4]],
    isAlpha: m[4] !== undefined,
  };
}

function compareNums(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

// Pick the newest tag that belongs to the release lane we're publishing, so an
// alpha PR ranges from the previous alpha (never a stable tag merged into alpha,
// and vice versa). Tags must already be filtered to HEAD's ancestors.
function pickPreviousTag(tags, base) {
  const wantAlpha = base === 'alpha';
  const candidates = tags
    .map(parseTag)
    .filter(Boolean)
    .filter(t => (base === 'alpha' || base === 'master') ? t.isAlpha === wantAlpha : true)
    .sort((a, b) => compareNums(b.nums, a.nums));
  return candidates.length ? candidates[0].tag : '';
}

function previousReleaseTag(base) {
  let reachable;
  try {
    reachable = git(['tag', '--merged', 'HEAD']).split('\n');
  } catch {
    return '';
  }
  const picked = pickPreviousTag(reachable, base);
  if (picked) return picked;
  // No lane-matching tag (e.g. the first alpha ever): fall back to nearest tag.
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
  const since = argv[0] || previousReleaseTag(process.env.RELEASE_BASE);
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

  // Lane-aware tag selection: alpha ignores a newer stable tag merged in.
  const tags = ['v4.9.0', 'v5.0.0-alpha.2', 'v5.0.0-alpha.10', 'v4.9.1'];
  assert.strictEqual(pickPreviousTag(tags, 'alpha'), 'v5.0.0-alpha.10');
  assert.strictEqual(pickPreviousTag(tags, 'master'), 'v4.9.1');

  // `@`-prefixed Less variables must not become GitHub mentions.
  const mention = renderCommit(
    classify(parseLog(['e5', 'fix(functions): rename @1 to @block1', ''].join('\x00'))[0]),
    'https://github.com/less/less.js',
  );
  assert.ok(!/@block1/.test(mention) && mention.includes('&#64;block1'));
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
  pickPreviousTag,
  renderCommit,
};
