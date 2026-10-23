// Screenshot comparison of the pages this repo owns (the landing page from shared/templates/ and
// the 404 page), at desktop and phone size, so a dependency bump that changes how a site looks
// (Starlight, Astro, the shared-ui header and footer) turns CI red.
//
// - Content pages are not compared: their text comes from jellyrock/jellyrock main at build time
//   and changes there without a PR here. The functional tests cover them.
// - Masked: images (the logo comes from the same upstream repo), and the sidebar's page list and
//   the previous/next links, which list upstream page titles.
// - Deploys skip these tests (ci.yml): the theme colours come from upstream settings.json too, so
//   only a pull request here, where baselines can be refreshed, compares screenshots.
//
// Baselines live in tests/e2e/__screenshots__ and only match inside the Playwright image CI uses.
// After a deliberate design change, refresh them: `npm run test:visual:update` (README).
import type { test as playwrightTest, expect as playwrightExpect } from '@playwright/test';
import { scrollThrough } from '../../user-docs/src/shared-ui/testing/checks';

const pages = [
	{ name: 'home', path: '/' },
	{ name: 'not-found', path: '/404.html' },
];

export function defineScreenshotTests(test: typeof playwrightTest, expect: typeof playwrightExpect) {
	test.describe('screenshots', () => {
		test.use({ reducedMotion: 'reduce' });

		for (const { name, path } of pages) {
			test(`${name} looks the same @visual`, async ({ page }) => {
				await page.goto(path);
				await scrollThrough(page);
				await page.evaluate(() => window.scrollTo(0, 0));
				await page.evaluate(() => document.fonts.ready);
				await expect(page).toHaveScreenshot(`${name}.png`, {
					fullPage: true,
					mask: [page.locator('img'), page.locator('.sidebar-content'), page.locator('.pagination-links')],
				});
			});
		}
	});
}
