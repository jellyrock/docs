// @ts-check
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
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
await fetchDocs('user');

// Pages that moved within jellyrock/jellyrock's docs/user/: old path to new path. Each old URL
// redirects only once the fetched content has no page there, so a redirect never shadows a
// page, and this list can land before or after the move upstream.
const MOVED_PAGES = {
	'deep-linking': 'features/deep-linking',
	'manage-subtitles': 'features/manage-subtitles',
	'media-segments': 'features/media-segments',
};
const contentDir = new URL('./src/content/docs/', import.meta.url);
const redirects = Object.fromEntries(
	Object.entries(MOVED_PAGES)
		.filter(([from]) => !fs.existsSync(new URL(`${from}.md`, contentDir)))
		.map(([from, to]) => [`/${from}`, `/${to}/`])
);

// https://astro.build/config
export default defineConfig({
	// Astro 7 defaults to 'jsx', which drops the whitespace between elements on separate lines.
	// true is the lossless compression Astro 6 used (and .prettierrc.mjs formats for).
	compressHTML: true,
	site: DOCS_SITES.user,
	redirects,
	integrations: [
		starlight({
			// Fails the build on a link to a page or #anchor that doesn't exist. `#top` needs no
			// anchor: browsers scroll to the top of the page for it (HTML spec, as on GitHub).
			plugins: [starlightLinksValidator({ exclude: ({ link }) => link === '#top' })],
			title: 'JellyRock Docs',
			description: 'User documentation for JellyRock, a Jellyfin client for Roku.',
			favicon: '/favicon.png',
			head: [
				{
					tag: 'script',
					attrs: {
						defer: true,
						// First-party Umami tracker via the same-origin /_a proxy
						// (ADR-0006) so the CSP can stay strict script-src 'self'.
						src: '/_a/script.js',
						'data-website-id': 'f86f75e9-4236-40c4-bf32-7ef74f1939d8',
						'data-host-url': 'https://docs.jellyrock.app/_a',
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
		}),
	],
	markdown: {
		// remark plugins need the unified processor; Astro 7 defaults to Sätteri.
		processor: unified({
			remarkPlugins: [
				remarkGithubAlerts,
				[
					remarkUpstreamLinks,
					{ docType: 'user', contentDir: fileURLToPath(new URL('./src/content/docs/', import.meta.url)) },
				],
			],
		}),
	},
});
