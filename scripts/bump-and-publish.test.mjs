import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  determineAlphaVersion,
  getAlreadyPublishedPackages,
  getJessPublishVersion,
  verifyJessRuntimePublishedVersion,
  verifyScriptPluginOptionalPeer,
  verifyReleaseManifestVersions,
  verifyRemoteTagCommit,
  verifyUnpublishedVersion,
} = require('./bump-and-publish.js');

test('preserves an explicitly configured first Less v5 alpha when unpublished', () => {
  assert.equal(
    determineAlphaVersion('5.0.0-alpha.1', null),
    '5.0.0-alpha.1',
  );
});

test('does not silently increment a committed alpha manifest', () => {
  assert.equal(
    determineAlphaVersion('5.0.0-alpha.1', '5.0.0-alpha.1'),
    '5.0.0-alpha.1',
  );
});

test('rejects an environment version that does not match the committed alpha', () => {
  assert.throws(
    () => determineAlphaVersion('5.0.0-alpha.1', null, '5.0.0-alpha.2'),
    /must match the committed alpha manifest/u,
  );
});

test('requires an exact Jess alpha for a Less alpha publish', () => {
  assert.equal(getJessPublishVersion(), '2.0.0-alpha.10');
});

test('requires Jess runtime packages to be published before a non-dry Less alpha publish', () => {
  assert.equal(
    verifyJessRuntimePublishedVersion('2.0.0-alpha.10', (_name, version) => version),
    '2.0.0-alpha.10',
  );
  assert.throws(
    () => verifyJessRuntimePublishedVersion('2.0.0-alpha.10', name =>
      name === '@jesscss/compiler' ? null : '2.0.0-alpha.10'),
    /@jesscss\/compiler@2\.0\.0-alpha\.10/u,
  );
});

test('keeps plugin-js as an optional peer instead of a shipped dependency', () => {
  assert.equal(
    verifyScriptPluginOptionalPeer('2.0.0-alpha.10', {
      peerDependencies: { '@jesscss/plugin-js': '2.0.0-alpha.10' },
      peerDependenciesMeta: { '@jesscss/plugin-js': { optional: true } }
    }),
    '2.0.0-alpha.10',
  );
  assert.throws(
    () => verifyScriptPluginOptionalPeer('2.0.0-alpha.10', {
      dependencies: { '@jesscss/plugin-js': '2.0.0-alpha.10' },
      peerDependencies: { '@jesscss/plugin-js': '2.0.0-alpha.10' },
      peerDependenciesMeta: { '@jesscss/plugin-js': { optional: true } }
    }),
    /must not be a Less runtime dependency/u,
  );
  assert.throws(
    () => verifyScriptPluginOptionalPeer('2.0.0-alpha.10', {
      optionalDependencies: { '@jesscss/plugin-js': '2.0.0-alpha.10' },
      peerDependencies: { '@jesscss/plugin-js': '2.0.0-alpha.10' },
      peerDependenciesMeta: { '@jesscss/plugin-js': { optional: true } }
    }),
    /not an optionalDependency/u,
  );
  assert.throws(
    () => verifyScriptPluginOptionalPeer('2.0.0-alpha.10', {
      dependencies: { jess: '2.0.0-alpha.10' },
      peerDependencies: { '@jesscss/plugin-js': '2.0.0-alpha.10' },
      peerDependenciesMeta: { '@jesscss/plugin-js': { optional: true } }
    }),
    /jess must not be a Less runtime dependency/u,
  );
});

test('requires every public release manifest to use the committed alpha version', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'less-release-manifests-'));
  const matching = path.join(dir, 'matching.json');
  const stale = path.join(dir, 'stale.json');
  fs.writeFileSync(matching, '{"version":"5.0.0-alpha.1"}\n');
  fs.writeFileSync(stale, '{"version":"5.0.0-alpha.2"}\n');

  assert.doesNotThrow(() => verifyReleaseManifestVersions('5.0.0-alpha.1', [matching]));
  assert.throws(
    () => verifyReleaseManifestVersions('5.0.0-alpha.1', [matching, stale]),
    /stale\.json has version 5\.0\.0-alpha\.2/u,
  );
});

test('rejects an already-published Less alpha before release mutations', () => {
  assert.doesNotThrow(() => verifyUnpublishedVersion('less', '5.0.0-alpha.1', () => null));
  assert.throws(
    () => verifyUnpublishedVersion('less', '5.0.0-alpha.1', () => '5.0.0-alpha.1'),
    /already published/u,
  );
});

test('detects already-published packages for alpha publish reruns', () => {
  const packages = [
    { name: 'less' },
    { name: '@less/test-data' },
    { name: '@less/private-fixture' },
  ];
  const published = getAlreadyPublishedPackages(
    packages,
    '5.0.0-alpha.1',
    name => name === 'less' ? '5.0.0-alpha.1' : null,
  );
  assert.deepEqual(published, [{ name: 'less' }]);
});

test('rejects a remote release tag that points away from HEAD', () => {
  assert.doesNotThrow(() => verifyRemoteTagCommit('v5.0.0-alpha.1', 'abc123', 'abc123'));
  assert.throws(
    () => verifyRemoteTagCommit('v5.0.0-alpha.1', 'abc123', 'def456'),
    /Remote tag v5\.0\.0-alpha\.1 points at abc123, which differs from HEAD def456; aborting publish/u,
  );
});
