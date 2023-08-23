import { test, expect } from '@playwright/test';
import { hoistImportDeps } from '../src/hoistImportDeps';
import { Parser } from 'acorn';

//
//

test('add __loadDeps wrapper if module has dynamic import', async ({}) => {
  const plugin = hoistImportDeps() as any;

  plugin.parse = (code: any) => {
    return Parser.parse(code, { sourceType: 'module', ecmaVersion: 11 });
  };
  plugin.warn = (...args: any) => {
    console.log(...args);
  };

  const code = `
function load() {
  const module = import('./module');
  console.log(module);
};`;

  // @ts-ignore
  const output = plugin.transform(code, 'test.ts');

  console.log('[output]', output);

  expect(output.code).toMatchSnapshot();
});

//
//

test(`don't add __loadDeps wrapper if module has no dynamic imports`, (t) => {
  const plugin = hoistImportDeps() as any;
  let parseCalled = false;
  plugin.parse = (code: any) => {
    parseCalled = true;
    return Parser.parse(code, { sourceType: 'module', ecmaVersion: 11 });
  };
  plugin.warn = (...args: any) => {
    console.log(...args);
  };

  const ret = plugin.transform(
    `import {a} from './a.js';
     function t() {return 10;}`,
    'test.js',
  );

  // First pass saw there were no dynamic imports.
  // So AST parse was never called.

  expect(ret).toBe(null);
  expect(parseCalled).toBe(false);
});

//
//

test(`don't add __loadDeps wrapper if module has no (actual) dynamic imports`, (t) => {
  const plugin = hoistImportDeps() as any;
  let parseCalled = false;
  plugin.parse = (code: any) => {
    parseCalled = true;
    return Parser.parse(code, { sourceType: 'module', ecmaVersion: 11 });
  };
  plugin.warn = (...args: any) => {
    console.log(...args);
  };

  const ret = plugin.transform(
    `import {a} from './a.js';
    /* Hey I'm a comment to trick the first pass - import('blah') */
     function t() {return 10;}`,
    'test.js',
  );

  // Code not transformed even though first pass thought there was a dynamic
  // import.
  expect(ret).toBe(null);
  // AST parse was acyually called before realizing there were no dynamic
  // imports.
  expect(parseCalled).toBe(true);
});

//
//

test(`preloaddeps:import must match with snapshot`, () => {
  const plugin = hoistImportDeps({ baseUrl: 'client' }) as any;
  const moduleCode = plugin.load('preloaddeps:import');
  expect(moduleCode).toMatchSnapshot();
});
