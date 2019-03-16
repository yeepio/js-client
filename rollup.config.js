import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import filesize from 'rollup-plugin-filesize';
import progress from 'rollup-plugin-progress';

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
    resolve(),
    babel({
      exclude: 'node_modules/**',
    }),
    progress({
      clearLine: false,
    }),
    filesize(),
  ],
}));
