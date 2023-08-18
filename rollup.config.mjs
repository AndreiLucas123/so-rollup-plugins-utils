import esbuild from 'rollup-plugin-esbuild';
import dts from 'rollup-plugin-dts';

//
//

export default [
  {
    input: './src/index.ts',
    output: {
      file: './dist/index.js',
      format: 'es',
      sourcemap: false,
    },
    external: ['estree-walker', 'magic-string', 'acorn-jsx'],
    watch: {
      clearScreen: false,
      include: 'src/**',
    },
    plugins: [
      esbuild({
        sourceMap: false,
        minify: false,
      }),
    ],
  },

  {
    input: './dist/types/index.d.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins: [dts()],
  },
];
