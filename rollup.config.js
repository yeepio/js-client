import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import esModuleInterop from 'rollup-plugin-es-module-interop';
import progress from 'rollup-plugin-progress';
import json from 'rollup-plugin-json';
import copy from 'rollup-plugin-copy';

export default ['src/index.js'].map((file, i) => ({
  input: file,
  output: [
    {
      file: file.replace('src', 'dist'),
      format: 'cjs',
    },
    {
      file: file.replace('src', 'dist/es'),
      format: 'esm',
    },
  ],
  plugins: [
    resolve({
      jail: '/src/',
    }),
    babel({
      exclude: 'node_modules/**',
    }),
    commonjs(),
    json(),
    esModuleInterop(),
    i === 0
      ? copy({
          'README.md': 'dist/README.md',
          LICENSE: 'dist/LICENSE',
          'package.json': 'dist/package.json',
        })
      : null,
    progress({
      clearLine: false,
    }),
  ],
}));
