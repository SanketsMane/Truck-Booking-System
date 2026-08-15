import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // styled-components' tagged-template output isn't statically
    // recognizable as a "component" by this rule, so it flags every
    // multi-export UI-kit/theme file as a fast-refresh boundary violation.
    // Context files have the same false positive for the paired
    // Provider-component + hook export pattern.
    files: ['src/components/ui/**/*.{js,jsx}', 'src/theme/**/*.{js,jsx}', 'src/context/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
