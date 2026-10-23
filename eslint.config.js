import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import typescriptParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
	js.configs.recommended,
	...tseslint.configs.recommended,
	// After typescript-eslint, whose config sets its parser for every file: the Astro
	// config must win for .astro files (astro-eslint-parser, with the TS parser inside).
	...eslintPluginAstro.configs['flat/recommended'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	{
		files: ['**/*.{ts,tsx}', '**/*.astro/*.js'],
		languageOptions: {
			parser: typescriptParser,
		},
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
				},
			],
		},
	},
	{
		ignores: [
			'node_modules',
			'**/node_modules',
			'**/dist',
			'**/.astro',
			'**/src/content/docs',
			'**/src/shared-ui',
			'.jellyrock-repo',
			'.shared-ui-repo',
		],
	},
];
