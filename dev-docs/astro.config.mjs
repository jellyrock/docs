// @ts-check
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import remarkGithubAlerts from 'remark-github-alerts';
import { fetchDocs } from '../shared/fetch-docs.mjs';
import { fetchSharedUi } from '../shared/fetch-shared-ui.mjs';
import { DOCS_SITES, remarkUpstreamLinks } from '../shared/remark-upstream-links.mjs';

// Pull shared UI + markdown from repos at build time
await fetchSharedUi();
await fetchDocs('dev');

// BrightScript TextMate grammar vendored from rokucommunity (MIT). Version
// tracked in src/syntaxes/.version-info; sync-brightscript-grammar workflow
// re-fetches when Renovate bumps the ref.
const brightscriptGrammar = JSON.parse(
	readFileSync(new URL('./src/syntaxes/brightscript.tmLanguage.json', import.meta.url), 'utf8')
);

// https://astro.build/config
export default defineConfig({
	// Astro 7 defaults to 'jsx', which drops the whitespace between elements on separate lines.
	// true is the lossless compression Astro 6 used (and .prettierrc.mjs formats for).
	compressHTML: true,
	site: DOCS_SITES.dev,
	integrations: [
		starlight({
			// Fails the build on a link to a page or #anchor that doesn't exist. `#top` needs no
			// anchor: browsers scroll to the top of the page for it (HTML spec, as on GitHub).
			plugins: [starlightLinksValidator({ exclude: ({ link }) => link === '#top' })],
			title: 'JellyRock Dev Guide',
			description: 'Developer documentation for JellyRock, a Jellyfin client for Roku.',
			favicon: '/favicon.png',
			expressiveCode: {
				shiki: {
					// The grammar names itself `BrightScript` and Shiki matches names exactly, so register
					// it under the name the code fences use. Set here, not in the JSON: the sync overwrites it.
					langs: [{ ...brightscriptGrammar, name: 'brightscript' }],
					langAlias: {
						brighterscript: 'brightscript',
						bs: 'brightscript',
					},
				},
			},
			head: [
				{
					tag: 'script',
					attrs: {
						defer: true,
						// First-party Umami tracker via the same-origin /_a proxy
						// (ADR-0006) so the CSP can stay strict script-src 'self'.
						src: '/_a/script.js',
						'data-website-id': 'de160b80-2b3e-488e-b9df-d9a92ca42e1c',
						'data-host-url': 'https://dev.jellyrock.app/_a',
					},
				},
			],
			customCss: ['./src/shared-ui/tokens.css', './src/styles/theme.css', './src/styles/custom.css'],
			components: {
				Header: './src/components/Header.astro',
				Footer: './src/components/Footer.astro',
				PageFrame: './src/components/PageFrame.astro',
				Sidebar: './src/components/Sidebar.astro',
			},
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/jellyrock/jellyrock' },
				{ icon: 'matrix', label: 'Matrix', href: 'https://matrix.to/#/#jellyrock-app:matrix.org' },
			],
			editLink: {
				baseUrl: 'https://github.com/jellyrock/jellyrock/edit/main/docs/dev/',
			},
		}),
	],
	markdown: {
		// remark plugins need the unified processor; Astro 7 defaults to Sätteri.
		processor: unified({
			remarkPlugins: [
				remarkGithubAlerts,
				[
					remarkUpstreamLinks,
					{ docType: 'dev', contentDir: fileURLToPath(new URL('./src/content/docs/', import.meta.url)) },
				],
			],
		}),
	},
});
