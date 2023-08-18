import esbuild from 'rollup-plugin-esbuild';
import dts from 'rollup-plugin-dts';
import rollupPluginPreserveJsx from './plugins/rollup-plugin-preserve-jsx.js';
import renameChunkPlugin from './plugins/rollup-plugin-rename-chunk.mjs';
import tests from './rollup.fixtures.config.mjs';
import plugins from './rollup.plugins.config.mjs';

//
//

const __DEV__ = !!process.env.ROLLUP_WATCH;

//
//

const addons = [...plugins, ...tests];

//
//

if (!__DEV__) {
  //
  //  Add the typescript definition file build
  addons.push(
    {
      input: './dist-test/types/index.d.ts',
      output: { file: 'dist/index.d.ts', format: 'es' },
      plugins: [dts()],
    },
    {
      input: './dist-test/types/svelte/svelte-actions.d.ts',
      output: { file: 'dist/svelte-actions.d.ts', format: 'es' },
      plugins: [dts()],
    },
    {
      input: './dist-test/types/solid/solid.d.ts',
      output: { file: 'dist/solid.d.ts', format: 'es' },
      plugins: [dts()],
    },
  );
}

//
//

export default [
  {
    input: [
      './src/index.ts',
      './src/svelte/svelte-actions.ts',
      './src/solid/solid.tsx',
    ],
    output: {
      dir: './dist',
      format: 'es',
      sourcemap: false,
      manualChunks(id) {
        if (id.includes('src')) {
          if (id.includes('svelte-actions')) {
            return 'svelte-actions';
          }

          if (id.includes('solid')) {
            return 'solid';
          }

          return 'index';
        }
      },
      entryFileNames: `[name].js`,
      chunkFileNames: `[name].js`,
      assetFileNames: `[name].[ext]`,
    },
    external: [
      'svelte',
      'svelte/internal',
      'svelte/internal/disclose-version',
      'solid-js',
      'solid-js/web',
    ],
    watch: {
      clearScreen: false,
      include: 'src/**',
    },
    plugins: [
      esbuild({
        sourceMap: false,
        minify: false,
      }),
      // babel({
      //   extensions: ['.tsx'],
      //   babelHelpers: 'bundled',
      //   presets: [['solid', { generate: 'ssr', hydratable: true }]],
      // }),
      rollupPluginPreserveJsx(),
      renameChunkPlugin({
        oldName: 'solid.js',
        newName: 'solid.jsx',
      }),
    ],
  },
  ...addons,
];
