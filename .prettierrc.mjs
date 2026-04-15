/** @type {import('prettier').Config} */
export default {
	printWidth: 120,
	semi: true,
	singleQuote: true,
	tabWidth: 2,
	trailingComma: 'es5',
	useTabs: true,

	plugins: ['prettier-plugin-astro'],

	overrides: [{ files: '*.astro', options: { parser: 'astro' } }],
};
