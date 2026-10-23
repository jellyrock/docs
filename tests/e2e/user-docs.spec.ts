// Browser tests for the user docs site (docs.jellyrock.app), against user-docs/dist. The checks every
// JellyRock site shares (each sitemap page loads cleanly, links and anchors resolve, a missing
// page is a 404) come from shared-ui's testing/site-tests.ts.
import { test, expect } from '@playwright/test';
import { defineSiteTests } from '../../user-docs/src/shared-ui/testing/site-tests';
import { defineScreenshotTests } from './screenshots';

defineSiteTests({ test, expect, distDir: 'user-docs/dist' });
defineScreenshotTests(test, expect);
