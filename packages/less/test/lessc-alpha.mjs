import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import less from '../lib/index.js';
import { compilerOptionsOf, createLessOptions, getCompilerCacheKey } from '../lib/options.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessc = path.join(packageRoot, 'bin', 'lessc');
const ESC = String.fromCharCode(0x1B);
const BEL = String.fromCharCode(0x07);

function runLessc(args, input = '') {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [lessc, ...args], {
            cwd: packageRoot,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';

        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', chunk => { stdout += chunk; });
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.on('error', reject);
        child.on('close', code => resolve({ code, stdout, stderr }));
        child.stdin.end(input);
    });
}

function stripTerminalFormatting(value) {
    const osc8Link = new RegExp(`${ESC}\\]8;;[^${ESC}]*(?:${ESC}\\\\|${BEL})`, 'gu');
    const terminalCode = new RegExp(`${ESC}\\[[0-?]*[ -/]*[@-~]`, 'gu');
    return value
        .replace(osc8Link, '')
        .replace(terminalCode, '');
}

function assertNoUiControlSequences(value, label) {
    assert.doesNotMatch(value, new RegExp(`${ESC}\\[\\?\\d+[hl]`, 'u'),
        `${label} must not use alternate-screen or private terminal mode controls`);
    assert.doesNotMatch(value, new RegExp(`${ESC}\\]9;`, 'u'),
        `${label} must not use OSC live-region controls`);
}

const compilerEntrypoint = fileURLToPath(import.meta.resolve('@jesscss/compiler'));
// A local Jess build linked as test/README.md describes resolves into the Jess
// checkout instead; LESS_TEST_LINKED_JESS=1 says so, and skips this one check.
if (process.env.LESS_TEST_LINKED_JESS !== '1') {
    assert.match(compilerEntrypoint, /[/\\]@jesscss[/\\]compiler[/\\]lib[/\\]index\.js$/,
        'the Less CLI must resolve the built generic Jess compiler entrypoint');
}
await realpath(compilerEntrypoint);

{
    // `output` is a single file-less array entry carrying the projection/
    // serialization options (collapseNesting, compress, sourceMap) so a render
    // option overrides a file-local config; `{}` when the caller set none.
    assert.deepEqual(createLessOptions({}).configOptions.output, {});
    assert.deepEqual(
        createLessOptions({ collapseNesting: true }).configOptions.output,
        [{ collapseNesting: true }]
    );
    // The enum passes through unchanged (true stays the deprecated alias).
    for (const mode of [false, 'native', 'compact']) {
        assert.deepEqual(
            createLessOptions({ collapseNesting: mode }).configOptions.output,
            [{ collapseNesting: mode }],
            `collapseNesting: ${JSON.stringify(mode)} passes through`
        );
    }
    assert.throws(
        () => createLessOptions({ collapseNesting: 'flatten' }),
        /collapseNesting must be false, 'native', 'compact', or true/,
        'an unknown collapseNesting value is rejected'
    );
    // An explicit `undefined` (spread/forwarded options) is treated as omitted,
    // not validated — it must default to nested, never throw.
    assert.deepEqual(
        createLessOptions({ collapseNesting: undefined }).configOptions.output,
        {},
        'collapseNesting: undefined falls back to the default'
    );

    // compress + sourceMap map into output; URL options go to the Less plugin.
    assert.deepEqual(createLessOptions({ compress: true }).configOptions.output, [{ compress: true }]);
    assert.deepEqual(createLessOptions({ sourceMap: true }).configOptions.output, [{ sourceMap: true }]);
    assert.deepEqual(
        createLessOptions({ sourceMap: { sourceMapFileInline: true } }).configOptions.output,
        [{ sourceMap: { sourceMapFileInline: true } }],
        'sourceMap object form passes through'
    );
    {
        // Flat legacy sourceMap* options fold into the object form.
        const out = createLessOptions({ sourceMap: true, sourceMapURL: 'x.map' }).configOptions.output;
        assert.deepEqual(out, [{ sourceMap: { sourceMapURL: 'x.map' } }]);
    }
    // Combined options share one entry (compiler resolves all keys from it).
    assert.deepEqual(
        createLessOptions({ collapseNesting: 'native', compress: true, sourceMap: true }).configOptions.output,
        [{ collapseNesting: 'native', compress: true, sourceMap: true }],
        'collapseNesting + compress + sourceMap combine in one entry'
    );
    // The Less options the caller set go to `language.less`, which the compiler
    // merges over a file-local styles.config before building the Less plugin; an
    // option the caller left unset is left out, so the config or the default applies.
    const lessLanguage = options => createLessOptions(options).configOptions.language.less;
    assert.equal(lessLanguage({}), undefined, 'no Less option is set unless the caller set one');
    // A mode the caller sets is a Less option, never a compile mode: a compile
    // mode would reach every file, an imported .jess or .scss file included, and
    // with none set the Less default (math 'parens-division') applies.
    for (const options of [{}, { math: 'parens', strictMath: true, unitMode: 'strict', strictUnits: true }]) {
        assert.deepEqual(Object.keys(createLessOptions(options).configOptions.compile), ['searchPaths', 'plugins'],
            `no compile mode is set for ${JSON.stringify(options)}`);
    }
    assert.deepEqual(
        lessLanguage({ moduleMode: 'modern', math: 'always', unitMode: 'strict', rootpath: '/cdn/', processImports: false }),
        { moduleMode: 'modern', mathMode: 'always', unitMode: 'strict', rootpath: '/cdn/', processImports: false },
        'explicit Less options reach language.less, math as mathMode'
    );
    assert.throws(
        () => createLessOptions({ moduleMode: 'legacy' }),
        /moduleMode must be 'auto' or 'modern'/,
        'an unknown moduleMode value is rejected'
    );
    assert.throws(
        () => createLessOptions({ math: 'alwys' }),
        /math must be 'always', 'parens-division', 'parens' or 'strict' \(or 0-3\); got "alwys"/,
        'an unknown math value is rejected'
    );
    // The compiler cache key tells apart configs that differ only inside a Set
    // (the remote-import plugin keeps its allow list as one), so a render never
    // reuses a compiler built for another allow list.
    assert.notEqual(
        getCompilerCacheKey({ compile: { plugins: [{ allow: new Set(['a.example.com']) }] } }),
        getCompilerCacheKey({ compile: { plugins: [{ allow: new Set(['b.example.com']) }] } }),
        'a Set is part of the compiler cache key'
    );
    assert.throws(
        () => createLessOptions({ allowRemoteImports: 'cdn.example.com' }),
        /allowRemoteImports must be an array of host names; got "cdn\.example\.com"/,
        'a non-array allowRemoteImports is rejected as an option error'
    );
    // banner / globalVars / modifyVars reach language.less, where the compiler's
    // prepareSource hook reads them; javascriptEnabled stays rejected.
    assert.deepEqual(
        lessLanguage({ banner: '/* b */\n', globalVars: { a: '1' }, modifyVars: { b: '2' } }),
        { banner: '/* b */\n', globalVars: { a: '1' }, modifyVars: { b: '2' } },
        'banner, globalVars and modifyVars reach language.less'
    );
    // Each render passes them, so they are left out of the cached compiler: a
    // process that renders many themes shares one compiler instead of caching
    // one per set of values.
    const compilerKey = options => getCompilerCacheKey(compilerOptionsOf(createLessOptions(options).configOptions));
    assert.equal(
        compilerKey({ math: 'always', modifyVars: { b: '2' } }),
        compilerKey({ math: 'always', modifyVars: { b: '3' }, globalVars: { a: '1' }, banner: '/* b */\n' }),
        'banner, globalVars and modifyVars are not part of the compiler cache key'
    );
    assert.notEqual(compilerKey({ math: 'always' }), compilerKey({ math: 'parens' }),
        'the other Less options still are');
    // `relativeUrls` is the deprecated Less 4.x alias of `rewriteUrls: 'all'`,
    // and an explicit `rewriteUrls` wins. `insecure` reaches the compiler, which
    // warns that it has no effect; `ieCompat` warns here and goes no further.
    assert.deepEqual(lessLanguage({ relativeUrls: true }), { rewriteUrls: 'all' },
        "relativeUrls: true is rewriteUrls: 'all'");
    assert.deepEqual(lessLanguage({ relativeUrls: true, rewriteUrls: 'local' }), { rewriteUrls: 'local' },
        'an explicit rewriteUrls wins over relativeUrls');
    assert.equal(lessLanguage({ relativeUrls: false }), undefined, 'relativeUrls: false sets no rewriteUrls');
    assert.deepEqual(lessLanguage({ insecure: true }), { insecure: true }, 'insecure reaches language.less');
    assert.equal(lessLanguage({ ieCompat: true }), undefined, 'ieCompat sets no Less option');
    assert.throws(
        () => createLessOptions({ javascriptEnabled: true }),
        /javascriptEnabled is not supported/,
        'javascriptEnabled still rejected'
    );

    // 'native' distributes the child selector list (each branch keeps its own
    // specificity); 'compact' folds it into a single :is().
    const listNest = '.a, .b { .c, .d { x: 1 } }\n';
    const nativeCss = (await less.render(listNest, { collapseNesting: 'native' })).css;
    assert.match(nativeCss, /:is\(\.a, \.b\) \.c/, "'native' distributes .c");
    assert.match(nativeCss, /:is\(\.a, \.b\) \.d/, "'native' distributes .d");
    assert.doesNotMatch(nativeCss, /:is\(\.c, \.d\)/, "'native' does not fold the child list");
    const compactCss = (await less.render(listNest, { collapseNesting: 'compact' })).css;
    assert.match(compactCss, /:is\(\.a, \.b\) :is\(\.c, \.d\)/, "'compact' folds the child list");

    const source = '.parent { before: 1; .child { inside: 2; } after: 3; }\n';
    assert.equal((await less.render(source)).css, `.parent {
  before: 1;
  .child {
    inside: 2;
  }
  after: 3;
}
`);
    assert.equal((await less.render(source, { collapseNesting: true })).css, `.parent {
  before: 1;
}
.parent .child {
  inside: 2;
}
.parent {
  after: 3;
}
`);

    await assert.rejects(
        less.render('@Eight: 8;\n@charset "UTF-@{Eight}";\n', {
            filename: 'dynamic-charset.less'
        }),
        error => {
            assert.equal(error.type, 'parse');
            assert.equal(error.message, 'Interpolation is not valid in @charset.');
            assert.equal(error.filename, 'dynamic-charset.less');
            assert.equal(error.line, 2);
            assert.equal(error.column, 1);
            assert.deepEqual(error.extract, [
                '@Eight: 8;',
                '@charset "UTF-@{Eight}";',
                ''
            ]);
            assert.equal(String(error), 'Error: Interpolation is not valid in @charset.');
            assert.doesNotMatch(String(error), /offset/i);
            assert.equal(error.jessErrors?.[0]?.code, 'parse/dynamic-charset');
            assert.equal(error.jessErrors?.[0]?.message, error.message);
            assert.deepEqual(error.jessErrors?.[0]?.lines, {
                1: '@Eight: 8;',
                2: '@charset "UTF-@{Eight}";',
                3: ''
            });
            return true;
        },
        'Less 5 rejects dynamic @charset with a dedicated parse diagnostic'
    );
}

const tempDir = await mkdtemp(path.join(tmpdir(), 'lessc-alpha-'));
try {
    const imported = path.join(tempDir, 'imported.less');
    const input = path.join(tempDir, 'input.less');
    const output = path.join(tempDir, 'output.css');
    const nested = path.join(tempDir, 'nested.less');
    const nestedOutput = path.join(tempDir, 'nested.css');
    const broken = path.join(tempDir, 'broken.less');
    const dynamicCharset = path.join(tempDir, 'dynamic-charset.less');

    await writeFile(path.join(tempDir, 'styles.config.cjs'), [
        'module.exports = {',
        '  output: [{ file: \'{name}.css\', collapseNesting: false }]',
        '};',
        ''
    ].join('\n'));
    await writeFile(imported, '.from-import { color: green; }\n');
    await writeFile(input, '@import "imported.less";\n.from-file { width: (1 + 1); }\n');
    await writeFile(nested, '.parent { before: 1; .child { inside: 2; } after: 3; }\n');
    await writeFile(broken, '.broken { color: red;\n');
    await writeFile(dynamicCharset, '@Eight: 8;\n@charset "UTF-@{Eight}";\n');

    const collapsedCss = `.parent {
  before: 1;
}
.parent .child {
  inside: 2;
}
.parent {
  after: 3;
}
`;

    assert.equal(
        (await less.renderFile(nested, { collapseNesting: true })).css,
        collapsedCss,
        'an explicit Less renderFile option overrides a file-local output config'
    );

    // A file-local styles.config `language.less` applies to the options a call
    // leaves unset, and an explicit option wins over it, as for `output`.
    const configured = path.join(tempDir, 'configured');
    await mkdir(configured);
    await writeFile(path.join(configured, 'styles.config.cjs'),
        "module.exports = { language: { less: { moduleMode: 'modern', math: 'always', rootpath: '/cdn/' } } };\n");
    const configuredInput = path.join(configured, 'input.less');
    await writeFile(configuredInput, '.a { p: min(-5px, 1px); w: 2 + 3; b: url(img.png); }\n');
    assert.equal((await less.renderFile(configuredInput)).css,
        '.a {\n  p: min(-5px, 1px);\n  w: 5;\n  b: url(/cdn/img.png);\n}\n',
        'file-local language.less options apply when the call leaves them unset');
    assert.equal(
        (await less.renderFile(configuredInput, { moduleMode: 'auto', math: 'parens', rootpath: '/x/' })).css,
        '.a {\n  p: -5px;\n  w: 2 + 3;\n  b: url(/x/img.png);\n}\n',
        'an explicit render option wins over the file-local language.less option');

    // The same holds for a file-local `compile` mode and the `strict` preset,
    // which rank below `language.less`: an explicit option still wins.
    const compileConfigured = path.join(tempDir, 'compile-configured');
    await mkdir(compileConfigured);
    await writeFile(path.join(compileConfigured, 'styles.config.cjs'),
        "module.exports = { compile: { strict: true, mathMode: 'always' } };\n");
    const compileInput = path.join(compileConfigured, 'input.less');
    await writeFile(compileInput, '.a { w: 2 + 3; u: (1px + 2em); }\n');
    await assert.rejects(less.renderFile(compileInput), /Invalid unit arithmetic/,
        "the file-local strict preset's unitMode applies when the call leaves it unset");
    assert.equal(
        (await less.renderFile(compileInput, { math: 'parens', unitMode: 'preserve' })).css,
        '.a {\n  w: 2 + 3;\n  u: calc(1px + 2em);\n}\n',
        'an explicit render option wins over a file-local compile mode');
    const compileLessc = await runLessc(['--math=parens', '--unit-mode=preserve', compileInput]);
    assert.equal(compileLessc.code, 0, compileLessc.stderr);
    assert.equal(compileLessc.stdout, '.a {\n  w: 2 + 3;\n  u: calc(1px + 2em);\n}\n',
        'a lessc flag wins over a file-local compile mode');

    // dumpLineNumbers warns for a file input as for a source string.
    const fileLineNumbers = await less.renderFile(compileInput, { dumpLineNumbers: 'comments', unitMode: 'preserve' });
    assert.ok(fileLineNumbers.warnings?.some(warning => warning.code === 'deprecation/dump-line-numbers-option'),
        `renderFile dumpLineNumbers must warn; got ${JSON.stringify(fileLineNumbers.warnings?.map(warning => warning.code))}`);
    const fileLineNumbersLessc = await runLessc(['--no-color', '--line-numbers=comments', '--unit-mode=preserve', compileInput]);
    assert.equal(fileLineNumbersLessc.code, 0, fileLineNumbersLessc.stderr);
    assert.match(fileLineNumbersLessc.stderr, /deprecation\/dump-line-numbers-option/,
        '--line-numbers warns for a file input');

    const version = await runLessc(['--version']);
    assert.equal(version.code, 0, version.stderr);
    assert.match(version.stdout, /^lessc \d+\.\d+\.\d+-alpha\.\d+ \(Less Compiler\) \[Jess\]\n$/);
    assert.equal(version.stderr, '');

    const help = await runLessc(['--help']);
    assert.equal(help.code, 0, help.stderr);
    assert.match(help.stdout, /--collapse-nesting/,
        'lessc help documents the supported alpha nesting flag');
    assert.match(help.stdout, /This release intentionally supports a smaller CLI surface/,
        'lessc help explicitly scopes the supported CLI surface');
    assert.match(help.stdout, /--source-map\[=FILE\]/,
        'lessc help documents the supported source-map flag');
    assert.match(help.stdout, /--compress/,
        'lessc help documents the supported compress flag');
    assert.match(help.stdout, /--module-mode=MODE/,
        'lessc help documents the module-mode flag');
    for (const flag of [
        '--strict-math', '--line-numbers', '--allow-remote-imports=HOSTS', '--global-var=NAME=VALUE', '--modify-var=NAME=VALUE',
        '--relative-urls', '--insecure', '--ie-compat', '-ru, --rewrite-urls', '-rp, --rootpath=PATH'
    ]) {
        assert.ok(help.stdout.includes(flag), `lessc help documents ${flag}`);
    }
    assert.doesNotMatch(help.stdout, /--plugin=/,
        'lessc help must not advertise unsupported plugin flags in alpha.1');

    for (const flag of ['--clean-css', '--plugin=less-plugin-clean-css', '--bogus']) {
        const unsupported = await runLessc([flag, '-'], '.unsupported { color: red; }\n');
        assert.equal(unsupported.code, 1, `${flag} must fail instead of silently no-oping`);
        assert.equal(unsupported.stdout, '', `${flag} must not emit CSS after rejecting the option`);
        assert.match(unsupported.stderr, /not supported/,
            `${flag} must explain the alpha CLI surface`);
    }

    const stdin = await runLessc(['-'], '.from-stdin { color: blue; }\n');
    assert.equal(stdin.code, 0, stdin.stderr);
    assert.match(stdin.stdout, /\.from-stdin\s*\{[\s\S]*color:\s*blue;/);
    assert.equal(stdin.stderr, '');

    const warning = await runLessc(['-'], '.warn { color: lighten(red, nope); }\n');
    assert.equal(warning.code, 0, warning.stderr);
    assert.match(warning.stdout, /\.warn\s*\{[\s\S]*color:\s*lighten\(red, nope\);/,
        'warning-producing compiles still emit CSS on stdout');
    assert.doesNotMatch(warning.stdout, /function\/unresolved/,
        'lessc must not mix warnings into CSS stdout');
    // jess DESIGN-DECISIONS C17/R3 + function-error-public-semantics.test.ts: a
    // lenient (default functionMode) un-evaluable Less function is preserved
    // VERBATIM with no diagnostic; strict functionMode:'error' would reject with
    // eval/invalid-function. There is no `function/unresolved` warning in jess's
    // vocabulary, so a successful default compile emits nothing on stderr.
    assert.equal(warning.stderr, '',
        'lenient un-evaluable Less functions are preserved verbatim with no stderr diagnostic (jess C17/R3)');

    const quietWarning = await runLessc(['--quiet', '-'], '.warn { color: lighten(red, nope); }\n');
    assert.equal(quietWarning.code, 0, quietWarning.stderr);
    assert.match(quietWarning.stdout, /\.warn\s*\{/);
    assert.equal(quietWarning.stderr, '', '--quiet suppresses successful warning diagnostics');

    const collapsed = await runLessc(
        ['--collapse-nesting', '-'],
        '.parent { before: 1; .child { inside: 2; } after: 3; }\n'
    );
    assert.equal(collapsed.code, 0, collapsed.stderr);
    assert.equal(collapsed.stderr, '');
    assert.equal(collapsed.stdout, `.parent {
  before: 1;
}
.parent .child {
  inside: 2;
}
.parent {
  after: 3;
}
`);

    const collapsedFile = await runLessc(['--collapse-nesting', nested, nestedOutput]);
    assert.equal(collapsedFile.code, 0, collapsedFile.stderr);
    assert.equal(collapsedFile.stderr, '');
    assert.equal(await readFile(nestedOutput, 'utf8'), collapsedCss,
        'file-mode lessc preserves declaration source order while collapsing nesting');

    // --compress / --math / --url-args / --rootpath forward to the render options
    // the API already supports (see alpha-support.mjs for the API-level coverage).
    const urlInput = path.join(tempDir, 'urls.less');
    await writeFile(urlInput, '.a { color: red; background: url(img.png); }\n');

    const compressed = await runLessc(['--compress', urlInput]);
    assert.equal(compressed.code, 0, compressed.stderr);
    assert.doesNotMatch(compressed.stdout, /\n\s*\n/, '--compress strips blank lines');
    assert.match(compressed.stdout, /color:red/, '--compress minifies declarations');

    const mathAlways = await runLessc(['--math=always', '-'], '.a { width: 2 + 3 * 4; }\n');
    assert.equal(mathAlways.code, 0, mathAlways.stderr);
    assert.match(mathAlways.stdout, /width:\s*14/, '--math=always evaluates unparenthesized math');

    // --module-mode=modern: an unimported Less built-in keeps its call shape.
    const builtin = '.a { padding: min(-5px, 1px); }\n';
    const autoMode = await runLessc(['-'], builtin);
    assert.equal(autoMode.code, 0, autoMode.stderr);
    assert.match(autoMode.stdout, /padding: -5px;/, 'by default a legacy file computes Less built-ins');
    const modernMode = await runLessc(['--module-mode=modern', '-'], builtin);
    assert.equal(modernMode.code, 0, modernMode.stderr);
    assert.match(modernMode.stdout, /padding: min\(-5px, 1px\);/,
        "--module-mode=modern keeps an unimported built-in's call shape");
    const badMode = await runLessc(['--module-mode=legacy', '-'], builtin);
    assert.equal(badMode.code, 1, 'an unknown --module-mode value fails');
    assert.equal(badMode.stdout, '');
    assert.match(badMode.stderr, /moduleMode must be 'auto' or 'modern'/);

    // --global-var / --modify-var, repeatable: a global variable the file can
    // override, and a modified one that overrides the file. The value is
    // everything after the name's `=`.
    const vars = await runLessc(
        ['--global-var=c=red', '--global-var=@d=1px', '--modify-var=d=2px', '--modify-var=e=url(a?b=c)', '-'],
        '.a { color: @c; width: @d; background: @e; }\n@d: 3px;\n'
    );
    assert.equal(vars.code, 0, vars.stderr);
    assert.equal(vars.stdout, '.a {\n  color: red;\n  width: 2px;\n  background: url(a?b=c);\n}\n');
    for (const flag of ['--global-var', '--global-var=c', '--modify-var==red']) {
        const badVar = await runLessc([flag, '-'], '.a { color: red; }\n');
        assert.equal(badVar.code, 1, `${flag} fails`);
        assert.equal(badVar.stdout, '');
        assert.match(badVar.stderr, /-var takes NAME=VALUE/, `${flag} says what it takes`);
    }

    // --strict-math (and -sm), deprecated: on is --math=parens, off the default.
    const sum = '.a { w: 2 + 3; }\n';
    // Every Less 4.x boolean spelling, in any case, is accepted.
    for (const flag of ['--strict-math', '--strict-math=on', '-sm=on', '--strict-math=true', '--strict-math=YES', '-sm=t']) {
        const strictMath = await runLessc([flag, '-'], sum);
        assert.equal(strictMath.code, 0, strictMath.stderr);
        assert.match(strictMath.stdout, /w: 2 \+ 3;/, `${flag} requires parens for math`);
        assert.match(strictMath.stderr, /strictMath is deprecated; use math\. strictMath: true now means math: 'parens'/,
            `${flag} warns with the mapping`);
    }
    for (const flag of ['--strict-math=off', '--strict-math=false', '-sm=No']) {
        const strictMathOff = await runLessc([flag, '-'], sum);
        assert.equal(strictMathOff.code, 0, strictMathOff.stderr);
        assert.match(strictMathOff.stdout, /w: 5;/, `${flag} is the default math`);
        assert.match(strictMathOff.stderr, /strictMath: false now means no math option \(the default is 'parens-division'\)/);
    }
    const badStrictMath = await runLessc(['--strict-math=maybe', '-'], sum);
    assert.equal(badStrictMath.code, 1, 'a non-boolean --strict-math value fails');
    assert.equal(badStrictMath.stdout, '');
    assert.match(badStrictMath.stderr, /unable to parse maybe as a boolean\. use one of on\/t\/true\/y\/yes\/off\/f\/false\/n\/no/);

    // --strict-units (and -su) takes the same spellings.
    const mixedUnits = '.a { u: (1px + 2em); }\n';
    for (const flag of ['--strict-units=true', '-su=y']) {
        const strictUnits = await runLessc(['--no-color', flag, '-'], mixedUnits);
        assert.equal(strictUnits.code, 1, `${flag} is unitMode: 'strict'`);
        assert.match(strictUnits.stderr, /Invalid unit arithmetic/);
    }
    const strictUnitsOff = await runLessc(['--strict-units=false', '-'], mixedUnits);
    assert.equal(strictUnitsOff.code, 0, strictUnitsOff.stderr);
    assert.match(strictUnitsOff.stdout, /u: calc\(1px \+ 2em\);/, '--strict-units=false is the default unit mode');

    // --line-numbers, deprecated: accepted as in Less 4.x, ignored, and warned about.
    for (const flag of ['--line-numbers', '--line-numbers=comments', '--line-numbers=mediaquery', '--line-numbers=all']) {
        const lineNumbers = await runLessc(['--no-color', flag, '-'], sum);
        assert.equal(lineNumbers.code, 0, lineNumbers.stderr);
        assert.equal(lineNumbers.stdout, '.a {\n  w: 5;\n}\n', `${flag} has no effect on the CSS`);
        assert.match(lineNumbers.stderr, /deprecation\/dump-line-numbers-option/, `${flag} warns that it has no effect`);
    }
    const badLineNumbers = await runLessc(['--line-numbers=sass', '-'], sum);
    assert.equal(badLineNumbers.code, 1, 'an unknown --line-numbers type fails');
    assert.equal(badLineNumbers.stdout, '');
    assert.match(badLineNumbers.stderr, /--line-numbers takes comments, mediaquery or all/);

    // --relative-urls, deprecated: --rewrite-urls=all, with a warning. An
    // explicit --rewrite-urls wins, in either order, and then nothing warns.
    const relativeDir = path.join(tempDir, 'relative');
    await mkdir(path.join(relativeDir, 'sub'), { recursive: true });
    await writeFile(path.join(relativeDir, 'sub', 'b.less'), '.b { background: url(img.png); }\n');
    const relativeInput = path.join(relativeDir, 'main.less');
    await writeFile(relativeInput, '@import "sub/b.less";\n');
    const relativeUrls = await runLessc(['--relative-urls', relativeInput]);
    assert.equal(relativeUrls.code, 0, relativeUrls.stderr);
    assert.equal(relativeUrls.stdout, '.b {\n  background: url(sub/img.png);\n}\n',
        '--relative-urls rewrites an imported url() as --rewrite-urls=all');
    assert.equal(relativeUrls.stderr,
        "relativeUrls is deprecated; use rewriteUrls. relativeUrls: true now means rewriteUrls: 'all'\n",
        '--relative-urls warns once, with the mapping');
    for (const args of [['--rewrite-urls=off', '--relative-urls'], ['--relative-urls', '--rewrite-urls=off']]) {
        const explicit = await runLessc([...args, relativeInput]);
        assert.equal(explicit.code, 0, explicit.stderr);
        assert.equal(explicit.stdout, '.b {\n  background: url(img.png);\n}\n',
            `${args.join(' ')}: the explicit --rewrite-urls wins`);
        assert.equal(explicit.stderr, '', `${args.join(' ')}: nothing warns`);
    }
    // As in Less 4.x, --relative-urls ignores a value, and -ru is the short
    // form of --rewrite-urls, with or without one.
    const relativeUrlsValue = await runLessc(['--relative-urls=off', relativeInput]);
    assert.equal(relativeUrlsValue.code, 0, relativeUrlsValue.stderr);
    assert.equal(relativeUrlsValue.stdout, relativeUrls.stdout, '--relative-urls=VALUE is --relative-urls');
    assert.equal(relativeUrlsValue.stderr, relativeUrls.stderr, '--relative-urls=VALUE warns as --relative-urls');
    for (const [args, url] of [[['-ru'], 'sub/img.png'], [['-ru=all'], 'sub/img.png'], [['-ru=off'], 'img.png']]) {
        const short = await runLessc([...args, relativeInput]);
        assert.equal(short.code, 0, short.stderr);
        assert.equal(short.stdout, `.b {\n  background: url(${url});\n}\n`, `${args.join(' ')} is --rewrite-urls`);
        assert.equal(short.stderr, '', `${args.join(' ')}: nothing warns`);
    }
    // -rp=PATH is the short form of --rootpath=PATH.
    const rootpathShort = await runLessc(['-rp=/cdn/', '-'], '.a { b: url(img.png); }\n');
    assert.equal(rootpathShort.code, 0, rootpathShort.stderr);
    assert.equal(rootpathShort.stdout, '.a {\n  b: url(/cdn/img.png);\n}\n', '-rp=PATH is --rootpath=PATH');

    // --insecure and --ie-compat: accepted as in Less 4.x, with no effect on the
    // CSS and one warning each.
    for (const [flag, warning] of [
        ['--insecure', /deprecation\/insecure-option/g],
        ['--ie-compat', /ieCompat is deprecated and has no effect: Less 5 makes no IE 8 compatibility checks/g]
    ]) {
        const ignored = await runLessc(['--no-color', flag, '-'], sum);
        assert.equal(ignored.code, 0, ignored.stderr);
        assert.equal(ignored.stdout, '.a {\n  w: 5;\n}\n', `${flag} has no effect on the CSS`);
        assert.equal(ignored.stderr.match(warning)?.length, 1, `${flag} warns once; got ${JSON.stringify(ignored.stderr)}`);
    }

    // --allow-remote-imports, as the jess CLI's flag. The plugin is an optional
    // install that this suite leaves out (it ships with a later Jess alpha), so a
    // default install reports that it is missing; with it linked from a local
    // Jess build, an import from a host off the list is refused before any request.
    const remote = '@import "https://other.example.com/x.less";\n';
    let remoteImportPluginInstalled = true;
    try {
        import.meta.resolve('@jesscss/plugin-remote-import');
    } catch {
        remoteImportPluginInstalled = false;
    }
    for (const args of [['--allow-remote-imports=cdn.example.com'], ['--allow-remote-imports', 'cdn.example.com']]) {
        const allowRemote = await runLessc(['--no-color', ...args, '-'], remote);
        assert.equal(allowRemote.code, 1, allowRemote.stderr);
        assert.equal(allowRemote.stdout, '');
        assert.match(allowRemote.stderr, remoteImportPluginInstalled
            ? /other\.example\.com is not on the\s+remote-import allow list/
            : /allowRemoteImports needs @jesscss\/plugin-remote-import\. Install it next to less\./,
        `${args.join(' ')} wires the remote-import plugin with that allow list`);
    }
    // The render API takes the same list. Two lists never share a compiler,
    // so one render's allow list cannot leak into another's.
    if (remoteImportPluginInstalled) {
        await assert.rejects(less.render(remote, { allowRemoteImports: ['cdn.example.com'] }),
            /other\.example\.com is not on the\s+remote-import allow list/,
            'less.render honours allowRemoteImports');
        const remoteKey = hosts => getCompilerCacheKey(createLessOptions({ allowRemoteImports: hosts }).configOptions);
        assert.notEqual(remoteKey(['a.example.com']), remoteKey(['b.example.com']),
            'each allow list gets its own compiler');
    } else {
        await assert.rejects(less.render(remote, { allowRemoteImports: ['cdn.example.com'] }),
            /allowRemoteImports needs @jesscss\/plugin-remote-import\. Install it next to less\./,
            'less.render reports the missing remote-import plugin');
    }
    const noHosts = await runLessc(['--allow-remote-imports=', '-'], remote);
    assert.equal(noHosts.code, 1, '--allow-remote-imports needs hosts');
    assert.match(noHosts.stderr, /--allow-remote-imports needs a comma-separated host list/);

    const urlArgs = await runLessc(['--url-args=v=9', urlInput]);
    assert.equal(urlArgs.code, 0, urlArgs.stderr);
    assert.match(urlArgs.stdout, /url\(img\.png\?v=9\)/, '--url-args appends the query');

    const rootpath = await runLessc(['--rootpath=/cdn/', urlInput]);
    assert.equal(rootpath.code, 0, rootpath.stderr);
    assert.match(rootpath.stdout, /url\(\/cdn\/img\.png\)/, '--rootpath prepends to url() references');

    // Source maps: `--source-map` writes a sidecar <output>.map and annotates the
    // CSS with its basename; `--source-map-inline` embeds a data URI instead.
    const smOutput = path.join(tempDir, 'sm.css');
    const sm = await runLessc(['--source-map', input, smOutput]);
    assert.equal(sm.code, 0, sm.stderr);
    assert.match(sm.stdout, /lessc: wrote .+sm\.css\.map\n/, '--source-map reports the sidecar map it wrote');
    const smCss = await readFile(smOutput, 'utf8');
    assert.match(smCss, /\/\*# sourceMappingURL=sm\.css\.map \*\/$/,
        '--source-map annotates the CSS with the sidecar map basename, as its last bytes (Less 4.x)');
    const smMap = JSON.parse(await readFile(`${smOutput}.map`, 'utf8'));
    assert.equal(smMap.version, 3, 'the sidecar map is source-map v3');
    assert.equal(smMap.file, 'sm.css', 'map.file is the CSS output name');
    assert.ok(smMap.sources.some(s => s.endsWith('input.less')), 'the map carries the input source');

    // A map written to a different directory than the CSS must be annotated
    // relative to the CSS output directory, not as a bare basename.
    const crossMap = path.join(tempDir, 'maps', 'app.map');
    const crossCss = path.join(tempDir, 'dist', 'app.css');
    const cross = await runLessc([`--source-map=${crossMap}`, input, crossCss]);
    assert.equal(cross.code, 0, cross.stderr);
    assert.match(await readFile(crossCss, 'utf8'), /sourceMappingURL=\.\.\/maps\/app\.map \*\//,
        'a cross-directory --source-map annotates the CSS with a path relative to the output dir');

    const inlineOut = path.join(tempDir, 'inline.css');
    const inlineSm = await runLessc(['--source-map-inline', input, inlineOut]);
    assert.equal(inlineSm.code, 0, inlineSm.stderr);
    assert.match(await readFile(inlineOut, 'utf8'), /sourceMappingURL=data:application\/json;base64,/,
        '--source-map-inline embeds the map as a data URI');
    await assert.rejects(readFile(`${inlineOut}.map`, 'utf8'),
        '--source-map-inline writes no sidecar .map file');

    // Path variants: basepath strips, rootpath prepends, include-source embeds
    // content, --source-map-url overrides the annotation. basepath must match the
    // real (symlink-resolved) tempDir the compiler records for the source.
    const realTempDir = await realpath(tempDir);
    const variantMapPath = path.join(tempDir, 'variant.map');
    const variantOut = path.join(tempDir, 'variant.css');
    const variant = await runLessc([
        `--source-map=${variantMapPath}`,
        `--source-map-basepath=${realTempDir}`,
        '--source-map-rootpath=http://cdn/',
        '--source-map-include-source',
        '--source-map-url=/assets/variant.map',
        input, variantOut
    ]);
    assert.equal(variant.code, 0, variant.stderr);
    assert.match(await readFile(variantOut, 'utf8'), /sourceMappingURL=\/assets\/variant\.map \*\//,
        '--source-map-url overrides the annotation URL');
    const variantMap = JSON.parse(await readFile(variantMapPath, 'utf8'));
    assert.ok(variantMap.sources.length > 0 && variantMap.sources.every(s => s.startsWith('http://cdn/')),
        '--source-map-rootpath prepends every source');
    assert.ok(variantMap.sources.every(s => !s.includes(realTempDir)),
        '--source-map-basepath strips the base from every source');
    assert.ok(Array.isArray(variantMap.sourcesContent) && variantMap.sourcesContent.length > 0,
        '--source-map-include-source embeds sourcesContent');

    const file = await runLessc([input, output]);
    assert.equal(file.code, 0, file.stderr);
    assert.match(file.stdout, /^lessc: wrote .+output\.css\n$/);
    assert.equal(file.stderr, '');
    const css = await readFile(output, 'utf8');
    assert.match(css, /\.from-import\s*\{[\s\S]*color:\s*green;/,
        'file compilation resolves a sibling import through the CLI');
    assert.match(css, /\.from-file\s*\{[\s\S]*width:\s*2;/);

    const failure = await runLessc([broken]);
    assert.equal(failure.code, 1, 'a Less error is a failing lessc process');
    assert.equal(failure.stdout, '');
    assert.ok(failure.stderr.includes(`${ESC}[91m`),
        'lessc reports colored Linecraft diagnostics by default');
    assertNoUiControlSequences(failure.stderr, 'lessc diagnostics');
    assert.match(failure.stderr, /[\u256d\u2570]/u,
        'lessc reports Linecraft source framing by default');
    const failureStderr = stripTerminalFormatting(failure.stderr);
    assert.match(failureStderr, /parse\/syntax-error \[parse\]/,
        'lessc reports the Linecraft diagnostic code on stderr');
    assert.match(failureStderr, /broken\.less:2:1/,
        'lessc reports filename, line, and column on stderr');
    assert.match(failureStderr, /\.broken \{ color: red;/,
        'lessc reports the source line on stderr');
    assert.doesNotMatch(failureStderr, /offset/i,
        'lessc diagnostics must not expose raw offsets to users');
    assert.doesNotMatch(failureStderr, / on line \d+, column \d+/,
        'lessc must not reformat Linecraft diagnostics into Less 4-style text');
    assert.doesNotMatch(failureStderr, /^Error: Less parser error\.$/m,
        'lessc must not append a duplicate plain Error after a Linecraft diagnostic');

    const dynamicCharsetFailure = await runLessc([dynamicCharset]);
    assert.equal(dynamicCharsetFailure.code, 1, 'dynamic @charset is a failing lessc process');
    assert.equal(dynamicCharsetFailure.stdout, '');
    const dynamicCharsetStderr = stripTerminalFormatting(dynamicCharsetFailure.stderr);
    assert.match(dynamicCharsetStderr, /parse\/dynamic-charset \[parse\]/,
        'lessc reports the canonical Jess diagnostic code for dynamic @charset');
    assert.match(dynamicCharsetStderr, /Interpolation is not valid in @charset\./,
        'lessc preserves the canonical Jess diagnostic message');
    assert.doesNotMatch(dynamicCharsetStderr, /Interpolation in @charset is not supported\./,
        'lessc must not restore the old Less wrapper message rewrite');

    const silentFailure = await runLessc(['--silent', broken]);
    assert.equal(silentFailure.code, 1, '--silent should still fail malformed input');
    assert.equal(silentFailure.stdout, '');
    assert.equal(silentFailure.stderr, '', '--silent must suppress Jess diagnostics');

    const noColorFailure = await runLessc(['--no-color', broken]);
    assert.equal(noColorFailure.code, 1, '--no-color should still fail malformed input');
    assert.equal(noColorFailure.stdout, '');
    assert.equal(noColorFailure.stderr.includes(ESC), false,
        '--no-color must suppress ANSI and terminal control sequences');
} finally {
    await rm(tempDir, { recursive: true, force: true });
}

console.log('Jess-powered lessc alpha tests passed');
