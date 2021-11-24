module.exports = {
  root: true,
  env: {
    es2017: true,
    node: true,
  },
  parser: "",
  parserOptions: {
    ecmaVersion: 10,
  },
  extends: ["eslint:recommended", "prettier"],
  ignorePatterns: ["*.d.ts"],
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      plugins: ["@typescript-eslint/eslint-plugin"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
      },
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
      ],
      rules: {
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
};
