import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import esModuleInterop from 'rollup-plugin-es-module-interop';
import progress from 'rollup-plugin-progress';
import json from 'rollup-plugin-json';

export default ['src/index.js'].map((file) => ({
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
    progress({
      clearLine: false,
    }),
  ],
}));
