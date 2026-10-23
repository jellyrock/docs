/** @type {import('prettier').Config} */
export default {
	printWidth: 120,
	semi: true,
	singleQuote: true,
	tabWidth: 2,
	trailingComma: 'es5',
	useTabs: true,

	plugins: ['prettier-plugin-astro'],
	// The whitespace rules the sites compile with (`compressHTML: true` in both astro.config.mjs),
	// so a reformat never changes what they render. The plugin's own default, 'jsx', is Astro 7's.
	astroCompressHTML: 'html',

	overrides: [{ files: '*.astro', options: { parser: 'astro' } }],
};
