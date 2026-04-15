// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkGithubAlerts from 'remark-github-alerts';
import { fetchDocs } from '../shared/fetch-docs.mjs';
import { fetchSharedUi } from '../shared/fetch-shared-ui.mjs';

// Pull shared UI + markdown from repos at build time
await fetchSharedUi();
await fetchDocs('user');

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.jellyrock.app',
	integrations: [
		starlight({
			title: 'JellyRock Docs',
			description: 'User documentation for JellyRock, a Jellyfin client for Roku.',
			favicon: '/favicon.png',
			head: [
				{
					tag: 'script',
					attrs: {
						defer: true,
						src: 'https://analytics.jellyrock.app/script.js',
						'data-website-id': 'f86f75e9-4236-40c4-bf32-7ef74f1939d8',
					},
				},
			],
			customCss: ['./src/shared-ui/tokens.css', './src/styles/theme.css', './src/styles/custom.css'],
			components: {
				Header: './src/components/Header.astro',
				Footer: './src/components/Footer.astro',
				PageFrame: './src/components/PageFrame.astro',
			},
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/jellyrock/jellyrock' },
				{ icon: 'matrix', label: 'Matrix', href: 'https://matrix.to/#/#jellyrock-app:matrix.org' },
			],
			editLink: {
				// Note: the edit link path will include src/content/docs/ as a prefix.
				// Starlight doesn't support stripping this, so edit links won't resolve
				// directly to the jellyrock repo. TODO: upstream fix or custom Edit component.
				baseUrl: 'https://github.com/jellyrock/jellyrock/edit/main/docs/user/',
			},
		}),
	],
	markdown: {
		remarkPlugins: [remarkGithubAlerts],
	},
});
