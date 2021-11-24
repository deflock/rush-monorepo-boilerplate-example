// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('@myscope/eslint-config/patch/modern-module-resolution');

module.exports = {
  extends: ['@myscope/eslint-config'],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
};
