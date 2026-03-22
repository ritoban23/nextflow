/** @type {import("prettier").Config} */
module.exports = {
  semi: true,
  trailingComma: "all",
  printWidth: 80,
  tabWidth: 2,
  bracketSpacing: true,
  plugins: [
    "prettier-plugin-organize-imports",
    "prettier-plugin-tailwindcss",
  ],
};
