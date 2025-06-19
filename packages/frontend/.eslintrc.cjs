module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react/recommended",
    "prettier",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs", "vite.config.ts", "vitest.config.ts", "vitest.setup.ts", "e2e"],
  overrides: [
    {
      files: ["**/__tests__/**/*", "**/test/**/*", "**/*.test.*", "**/*.spec.*", "**/test-utils.tsx"],
      rules: {
        "react-refresh/only-export-components": "off",
      },
    },
    {
      files: ["**/hooks/useAuth.tsx"],
      rules: {
        "react-refresh/only-export-components": ["warn", { allowConstantExport: true, allowExportNames: ["useAuth"] }],
      },
    },
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json", "./tsconfig.node.json"],
    tsconfigRootDir: __dirname,
  },
  plugins: ["react-refresh"],
  rules: {
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "@typescript-eslint/no-unused-vars": ["error", { 
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
    }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "no-console": ["warn", { allow: ["warn", "error", "log"] }],
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};