module.exports = {
  presets: [
    [
      '@babel/preset-env',
      process.env.NODE_ENV === 'test'
        ? {
            targets: {
              node: 'current',
            },
          }
        : {
            targets: {
              browsers: ['last 2 versions', 'ie >= 11'],
            },
          },
    ],
  ],
  plugins: [['@babel/plugin-proposal-class-properties', { loose: true }]],
};
