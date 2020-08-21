// eslint-disable-next-line no-undef
module.exports = {
  env: {
    browser: true,
    es2020: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 11,
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint", "only-warn"],
  rules: {
    "no-restricted-globals": ["warn", "localStorage"],
    "no-restricted-properties": [
      "warn",
      {
        object: "window",
        property: "localStorage",
      },
    ],
    "no-console": ["warn", { allow: ["warn", "error"] }],

    "@typescript-eslint/no-extra-semi": "off",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-floating-promises": "warn",
    "@typescript-eslint/no-misused-promises": "warn",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
  },
};
