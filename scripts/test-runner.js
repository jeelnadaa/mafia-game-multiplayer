#!/usr/bin/env node
const fs = require('fs');
const ts = require('typescript');

require('./patch-exfat.js');

const path = require('path');
const Module = require('module');

// Alias @/ to project root
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    request = path.join(__dirname, '..', request.slice(2));
  }
  return origResolve.call(this, request, parent, isMain, options);
};

// Mock lucide-react in node tests
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'lucide-react') {
    const React = require('react');
    return new Proxy({}, {
      get: (_, prop) => (props) => React.createElement('svg', { 'data-icon': prop, ...props }),
    });
  }
  return origLoad.call(this, request, parent, isMain);
};

// Register TypeScript on-the-fly compiler for .ts and .tsx files
function compileTs(module, filename) {
  const src = fs.readFileSync(filename, 'utf8');
  const out = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  module._compile(out, filename);
}
require.extensions['.ts'] = compileTs;
require.extensions['.tsx'] = compileTs;

// Execute test suites
require('../lib/engine/engine.test.ts');
require('../lib/net.test.ts');
require('../lib/storage.test.ts');
if (fs.existsSync(path.join(__dirname, '../components/ui.test.tsx'))) {
  require('../components/ui.test.tsx');
}
