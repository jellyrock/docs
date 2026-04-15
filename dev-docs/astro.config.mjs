// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkGithubAlerts from 'remark-github-alerts';
import { fetchDocs } from '../shared/fetch-docs.mjs';
import { fetchSharedUi } from '../shared/fetch-shared-ui.mjs';

// Pull shared UI + markdown from repos at build time
await fetchSharedUi();
await fetchDocs('dev');

// https://astro.build/config
export default defineConfig({
	site: 'https://dev.jellyrock.app',
	integrations: [
		starlight({
			title: 'JellyRock Dev Guide',
			description: 'Developer documentation for JellyRock, a Jellyfin client for Roku.',
			favicon: '/favicon.png',
			head: [
				{
					tag: 'script',
					attrs: {
						defer: true,
						src: 'https://analytics.jellyrock.app/script.js',
						'data-website-id': 'de160b80-2b3e-488e-b9df-d9a92ca42e1c',
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
				baseUrl: 'https://github.com/jellyrock/jellyrock/edit/main/docs/dev/',
			},
		}),
	],
	markdown: {
		remarkPlugins: [remarkGithubAlerts],
	},
});
