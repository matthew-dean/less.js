#!/usr/bin/env node
// Portable benchmark runner - dropped into each version's worktree
// Finds the Less compiler, compiles the given file N times, reports JSON results.
//
// Usage: node benchmark-runner.js <benchmark-file> [runs=30] [warmup=5]

var fs = require('fs');
var path = require('path');
var url = require('url');

var file = process.argv[2];
var totalRuns = parseInt(process.argv[3]) || 30;
var warmupRuns = parseInt(process.argv[4]) || 5;
var extraOpts = {};

// Parse --key=value options from remaining args
for (var ai = 5; ai < process.argv.length; ai++) {
    var optMatch = process.argv[ai].match(/^--([a-z-]+)=(.*)$/);
    if (optMatch) { extraOpts[optMatch[1]] = optMatch[2]; }
}

if (!file) {
    console.error('Usage: node benchmark-runner.js <file.less> [runs] [warmup]');
    process.exit(1);
}

// Find Less compiler - try fresh ESM source entry first, then older CJS layouts
var less;
var lessPath = '';
var tryPaths = [
    { path: './lib/index.js', mode: 'import' },
    { path: './lib/less-node', mode: 'require' },
    { path: '.', mode: 'require' },
    { path: 'less', mode: 'require' }
];

async function loadLessCompiler() {
    for (var i = 0; i < tryPaths.length; i++) {
        var candidate = tryPaths[i];
        try {
            var mod;
            if (candidate.mode === 'import') {
                var resolved = path.resolve(candidate.path);
                mod = await import(url.pathToFileURL(resolved).href);
            } else {
                mod = require(candidate.path.startsWith('.') ? path.resolve(candidate.path) : candidate.path);
            }
            var maybeLess = mod && mod.default ? mod.default : mod;
            if (maybeLess && (maybeLess.render || maybeLess.parse)) {
                less = maybeLess;
                lessPath = candidate.path;
                return;
            }
        } catch (e) {
            // try next candidate
        }
    }

    console.error(JSON.stringify({
        error: 'Could not find Less compiler',
        tried: tryPaths.map(function(candidate) { return candidate.path; })
    }));
    process.exit(2);
}

function getVersionString(less) {
    if (!less || !less.version) return 'unknown';
    if (Array.isArray(less.version)) return less.version.join('.');
    return String(less.version);
}

var filePath = path.resolve(file);
var data = fs.readFileSync(filePath, 'utf8');
var fileDir = path.dirname(filePath);

// Use less.render() - stable across all versions
var renderTimes = [];
var parseTimes = [];
var completed = 0;
var errors = [];

function hrNow() {
    var hr = process.hrtime();
    return hr[0] * 1000 + hr[1] / 1e6;
}

function runOnce(callback) {
    var start = hrNow();
    var opts = {
        filename: filePath,
        paths: [fileDir]
    };
    // Forward extra options (e.g. --math=always)
    for (var key in extraOpts) { opts[key] = extraOpts[key]; }
    less.render(data, opts, function (err, output) {
        var end = hrNow();
        if (err) {
            errors.push({ run: completed, error: err.message || String(err) });
            callback(err);
            return;
        }
        renderTimes.push(end - start);
        completed++;
        callback(null);
    });
}

function runAll(i) {
    if (i >= totalRuns) {
        reportResults();
        return;
    }
    runOnce(function (err) {
        if (err && errors.length > 3) {
            // Too many errors, bail
            reportResults();
            return;
        }
        runAll(i + 1);
    });
}

function analyze(times, skipWarmup) {
    var start = skipWarmup ? warmupRuns : 0;
    if (times.length <= start) return null;
    var effective = times.slice(start);
    var total = 0, min = Infinity, max = 0;
    for (var i = 0; i < effective.length; i++) {
        total += effective[i];
        min = Math.min(min, effective[i]);
        max = Math.max(max, effective[i]);
    }
    var avg = total / effective.length;

    // Median
    var sorted = effective.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    var median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    // Standard deviation and coefficient of variation
    var sumSqDiff = 0;
    for (var i = 0; i < effective.length; i++) {
        sumSqDiff += (effective[i] - avg) * (effective[i] - avg);
    }
    var stddev = Math.sqrt(sumSqDiff / effective.length);
    var variancePct = avg === 0 ? 0 : (stddev / avg) * 100;

    return {
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        avg: Math.round(avg * 100) / 100,
        median: Math.round(median * 100) / 100,
        stddev: Math.round(stddev * 100) / 100,
        variance_pct: Math.round(variancePct * 100) / 100,
        samples: effective.length,
        throughput_kbs: Math.round(1000 / avg * data.length / 1024)
    };
}

function reportResults() {
    var result = {
        version: getVersionString(less),
        lessPath: lessPath,
        file: path.basename(file),
        fileSize: data.length,
        fileSizeKB: Math.round(data.length / 1024 * 10) / 10,
        totalRuns: totalRuns,
        warmupRuns: warmupRuns,
        completedRuns: completed,
        errors: errors.length > 0 ? errors : undefined,
        render: analyze(renderTimes, true)
    };
    console.log(JSON.stringify(result));
}

(async function main() {
    await loadLessCompiler();
    runAll(0);
})().catch(function(err) {
    console.error(JSON.stringify({ error: err && err.message ? err.message : String(err) }));
    process.exit(2);
});
