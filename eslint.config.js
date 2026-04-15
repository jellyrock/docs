import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import astroEslintParser from 'astro-eslint-parser';
import typescriptParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
	js.configs.recommended,
	...eslintPluginAstro.configs['flat/recommended'],
	...tseslint.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	{
		files: ['**/*.astro'],
		languageOptions: {
			parser: astroEslintParser,
			parserOptions: {
				parser: '@typescript-eslint/parser',
				extraFileExtensions: ['.astro'],
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
