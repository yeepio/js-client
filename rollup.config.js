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
          targets: [
            { src: 'README.md', dest: 'dist' },
            { src: 'LICENSE', dest: 'dist' },
            { src: 'package.json', dest: 'dist' },
          ],
        })
      : null,
    progress({
      clearLine: false,
    }),
  ],
}));
