import { defineConfig, devices } from '@playwright/test';

// Browser tests run against both production builds (user-docs/dist, dev-docs/dist), each served
// the way Caddy serves it (shared-ui's testing/serve-dist.mjs, with
// tests/support/production-headers.json). Build first: `npm run build`, which also fetches
// shared-ui into each site's src/shared-ui/.
//
// Screenshot tests (tagged @visual) only match pixel-for-pixel inside the official Playwright
// image CI uses, so run those through `npm run test:visual` (Docker), never a local browser.
const sites = [
	{ name: 'user', dist: 'user-docs/dist', port: 4341 },
	{ name: 'dev', dist: 'dev-docs/dist', port: 4342 },
];
const viewports = [
	{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
	{ name: 'phone', use: { ...devices['Pixel 7'] } },
];

export default defineConfig({
	testDir: 'tests/e2e',
	snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
	use: {
		trace: 'retain-on-failure',
	},
	expect: {
		toHaveScreenshot: {
			animations: 'disabled',
			caret: 'hide',
			scale: 'css',
			maxDiffPixels: 0,
		},
	},
	// One project per site and screen size; each site's spec file runs only against its own server.
	projects: sites.flatMap((site) =>
		viewports.map((viewport) => ({
			name: `${site.name}-${viewport.name}`,
			testMatch: `${site.name}-docs.spec.ts`,
			use: { ...viewport.use, baseURL: `http://localhost:${site.port}` },
		}))
	),
	// Both sites fetch the same shared-ui release, so either copy of its server will do.
	webServer: sites.map((site) => ({
		command: `node user-docs/src/shared-ui/testing/serve-dist.mjs --root ${site.dist} --port ${site.port} --headers tests/support/production-headers.json`,
		url: `http://localhost:${site.port}/`,
		reuseExistingServer: !process.env.CI,
	})),
});
