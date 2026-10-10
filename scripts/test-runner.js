#!/usr/bin/env node
const fs = require('fs');
const ts = require('typescript');

require('./patch-exfat.js');

// Register TypeScript on-the-fly compiler for .ts files
require.extensions['.ts'] = function (module, filename) {
  const src = fs.readFileSync(filename, 'utf8');
  const out = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  module._compile(out, filename);
};

// Execute test suites
require('../lib/engine/engine.test.ts');
require('../lib/net.test.ts');
require('../lib/storage.test.ts');
