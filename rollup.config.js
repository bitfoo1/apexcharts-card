import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
// @rollup/plugin-terser replaces the deprecated rollup-plugin-terser, which
// pinned a vulnerable serialize-javascript and blocked the Rollup 4 upgrade.
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';

// eslint-disable-next-line no-undef
const dev = process.env.ROLLUP_WATCH;

const plugins = [
  nodeResolve({}),
  commonjs(),
  typescript(),
  json(),
  babel({
    exclude: 'node_modules/**',
    babelHelpers: 'bundled',
    babelrc: false,
    presets: [
      '@babel/preset-env',
      {
        useBuiltIns: 'entry',
        targets: '> 0.25%, not dead',
      },
    ],
  }),
  !dev &&
    terser({
      format: {
        comments: false,
      },
      mangle: {
        safari10: true,
      },
    }),
];

export default [
  {
    input: 'src/apexcharts-card.ts',
    output: {
      dir: './dist',
      format: 'es',
      sourcemap: dev ? true : false,
      globals: {
        apexcharts: 'ApexCharts',
      },
    },
    plugins: [...plugins],
    watch: {
      exclude: 'node_modules/**',
    },
  },
];
