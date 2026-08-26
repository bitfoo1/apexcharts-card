import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
// @rollup/plugin-terser replaces the deprecated rollup-plugin-terser, which
// pinned a vulnerable serialize-javascript and blocked the Rollup 4 upgrade.
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import json from '@rollup/plugin-json';

// eslint-disable-next-line no-undef
const dev = process.env.ROLLUP_WATCH;

const serveopts = {
  // ./dev holds the local harness (index.html + mock-hass.js), ./dist the build
  // output it imports, so the card can be developed in a plain browser without a
  // Home Assistant instance or a HACS release.
  contentBase: ['./dist', './dev'],
  host: '0.0.0.0',
  // Not 5000: on macOS that port belongs to Control Center's AirPlay Receiver,
  // which answers 403 and makes it look as though the dev server were broken.
  // eslint-disable-next-line no-undef
  port: Number(process.env.DEV_PORT ?? 5050),
  allowCrossOrigin: true,
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
};

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
  dev && serve(serveopts),
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
