// Browser tests for the dev docs site (dev.jellyrock.app), against dev-docs/dist. The checks every
// JellyRock site shares (each sitemap page loads cleanly, links and anchors resolve, a missing
// page is a 404) come from shared-ui's testing/site-tests.ts.
import { test, expect } from '@playwright/test';
import { defineSiteTests } from '../../user-docs/src/shared-ui/testing/site-tests';
import { defineScreenshotTests } from './screenshots';

defineSiteTests({ test, expect, distDir: 'dev-docs/dist' });
defineScreenshotTests(test, expect);
