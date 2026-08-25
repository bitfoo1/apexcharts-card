// Flat config, required since ESLint 9; replaces the former .eslintrc.yaml.
// The rule set is a 1:1 port of that file, with the browser globals it declared
// expanded to the full browser set (the old config only listed the three that
// happened to be needed).
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'src/types-config-ti.ts'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    /*
     * Two concessions to keep this fork rebaseable onto upstream.
     *
     * reportUnusedDisableDirectives: typescript-eslint 8 no longer reports what
     * v5 did, which makes ~30 inherited eslint-disable comments "unused".
     * Deleting them would touch 30 upstream lines for zero behavioural gain and
     * would conflict on every rebase.
     *
     * no-useless-assignment is new in ESLint 10 and fires on the
     * `let x = null; [a, x] = f();` destructuring style used throughout
     * graphEntry.ts. Rewriting that is a logic change in inherited code.
     */
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-useless-assignment': 'off',
      'no-else-return': 'off',
      'no-underscore-dangle': 'off',
      'nonblock-statement-body-position': 'off',
      curly: 'off',
      'no-return-assign': 'off',
      'consistent-return': 'off',
      'no-mixed-operators': 'off',
      'class-methods-use-this': 'off',
      'no-nested-ternary': 'off',
      camelcase: 'off',
    },
  },
  {
    files: ['src/action-handler-directive.ts'],
    rules: {
      /*
       * The class-plus-interface merge is the standard way to type a custom
       * element whose members come from both a base class and a declared
       * interface; it is how Home Assistant's own action handler is written.
       * Restructuring inherited code to satisfy the rule buys nothing.
       */
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      // Test fixtures cast trimmed-down objects to the real HA types.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
