import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPO_URL = 'https://github.com/jellyrock/jellyrock.git';
const CLONE_DIR = path.resolve(__dirname, '..', '.jellyrock-repo');

/**
 * Fetch JellyRock markdown docs from the main repo into the current Starlight
 * site's content collection.
 *
 * @param {'user' | 'dev'} docType - Which docs folder to pull from the repo
 */
export async function fetchDocs(docType) {
	const projectRoot = path.resolve(process.cwd());
	const contentDir = path.join(projectRoot, 'src/content/docs');
	const publicDir = path.join(projectRoot, 'public');
	const themeCssPath = path.join(projectRoot, 'src/styles/theme.css');

	const hasContent = fs.existsSync(contentDir) && fs.readdirSync(contentDir).length > 0;
	const hasFavicon = fs.existsSync(path.join(publicDir, 'favicon.png'));

	// Theme.css is always regenerated: cheap to produce and ensures any change
	// to the generation logic (or settings.json in the repo) is picked up.
	// Content and favicon are cached because they're expensive to re-fetch.
	const skipFetch = hasContent && hasFavicon;

	if (!skipFetch) {
		console.log(`Fetching ${docType} assets from jellyrock repo...`);
	}

	ensureClone();

	if (!hasContent) {
		// Copy docs markdown, adding Starlight frontmatter from first H1 heading
		const srcDocs = path.join(CLONE_DIR, 'docs', docType);
		fs.mkdirSync(contentDir, { recursive: true });
		copyMarkdownWithFrontmatter(srcDocs, contentDir);
		console.log(`Copied ${docType} docs → src/content/docs`);

		// Copy docs screenshots referenced by markdown
		const srcScreenshots = path.join(CLONE_DIR, 'docs', 'screenshots');
		if (fs.existsSync(srcScreenshots)) {
			const destScreenshots = path.join(contentDir, 'screenshots');
			fs.cpSync(srcScreenshots, destScreenshots, { recursive: true });
			console.log('Copied screenshots → src/content/docs/screenshots');
		}
	}

	// Always (re)write the splash index page from our template — it's our file,
	// cheap to produce, and avoids stale state when we edit the template.
	// Remove any old index.md too so there's only one index route.
	const splashTemplate = path.join(__dirname, 'templates', `${docType}-index.mdx`);
	if (fs.existsSync(splashTemplate)) {
		fs.mkdirSync(contentDir, { recursive: true });
		const legacyMdIndex = path.join(contentDir, 'index.md');
		if (fs.existsSync(legacyMdIndex)) fs.rmSync(legacyMdIndex);
		fs.copyFileSync(splashTemplate, path.join(contentDir, 'index.mdx'));
	}

	// Copy square JR logo as favicon
	if (!hasFavicon) {
		const squareLogoSrc = path.join(CLONE_DIR, 'resources', 'branding', 'logo-jr.png');
		if (fs.existsSync(squareLogoSrc)) {
			fs.mkdirSync(publicDir, { recursive: true });
			fs.copyFileSync(squareLogoSrc, path.join(publicDir, 'favicon.png'));
		}
	}

	// ALWAYS regenerate theme.css from settings.json. Cheap, avoids stale state.
	const settingsPath = path.join(CLONE_DIR, 'settings', 'settings.json');
	if (fs.existsSync(settingsPath)) {
		const theme = extractDefaultTheme(JSON.parse(fs.readFileSync(settingsPath, 'utf8')));
		if (theme) {
			const newCss = generateThemeCss(theme);
			const oldCss = fs.existsSync(themeCssPath) ? fs.readFileSync(themeCssPath, 'utf8') : '';
			if (newCss !== oldCss) {
				fs.mkdirSync(path.dirname(themeCssPath), { recursive: true });
				fs.writeFileSync(themeCssPath, newCss);
				console.log('Regenerated theme.css from settings.json');
			}
		}
	}
}

/** Ensure the jellyrock repo clone exists with required sparse-checkout paths.
 * We include both docs/user and docs/dev so the clone is shared between the
 * user-docs and dev-docs builds without needing a reclone. */
function ensureClone() {
	const requiredPaths = ['docs/user', 'docs/dev', 'docs/screenshots', 'resources/branding', 'settings'];
	if (!fs.existsSync(CLONE_DIR)) {
		execSync(`git clone --depth 1 --filter=blob:none --sparse ${REPO_URL} ${CLONE_DIR}`, { stdio: 'inherit' });
		execSync(`git -C ${CLONE_DIR} sparse-checkout set ${requiredPaths.join(' ')}`, { stdio: 'inherit' });
		return;
	}
	// Clone exists. Verify sparse-checkout matches required paths exactly;
	// if not, rewrite it so newer code that needs more paths still works.
	try {
		const current = new Set(
			execSync(`git -C ${CLONE_DIR} sparse-checkout list`, { encoding: 'utf8' })
				.split('\n')
				.map((l) => l.trim())
				.filter(Boolean)
		);
		const missing = requiredPaths.filter((p) => !current.has(p));
		if (missing.length > 0) {
			execSync(`git -C ${CLONE_DIR} sparse-checkout set ${requiredPaths.join(' ')}`, { stdio: 'inherit' });
		}
	} catch {
		// If anything fails, ignore — the fetch will surface real errors later.
	}
}

/** Walk the settings.json tree to find the uiTheme setting and return the
 * default theme's preset color values. */
function extractDefaultTheme(settings) {
	function walk(entries) {
		for (const entry of entries) {
			if (entry.settingName === 'uiTheme' && entry.options) {
				const defaultId = entry.default;
				const defaultOption = entry.options.find((o) => o.id === defaultId);
				if (defaultOption?.presetValues) return defaultOption.presetValues;
			}
			if (entry.children) {
				const found = walk(entry.children);
				if (found) return found;
			}
		}
		return null;
	}
	return walk(settings);
}

/** Generate Starlight CSS variable overrides from JellyRock theme colors. */
function generateThemeCss(theme) {
	const primary = `#${theme.uiThemeColorPrimary}`;
	const secondary = `#${theme.uiThemeColorSecondary}`;
	const bgPrimary = `#${theme.uiThemeColorBackgroundPrimary}`;
	const bgSecondary = `#${theme.uiThemeColorBackgroundSecondary}`;
	const textPrimary = `#${theme.uiThemeColorTextPrimary}`;
	const textSecondary = `#${theme.uiThemeColorTextSecondary}`;
	const textDisabled = `#${theme.uiThemeColorTextDisabled}`;

	return `/* Generated from jellyrock/jellyrock settings.json — DO NOT EDIT */
:root {
	/* Primary (e.g. purple) — used for active sidebar items and key highlights */
	--jr-primary: ${primary};
	/* Secondary (e.g. blue) — general accent (links, buttons) */
	--sl-color-accent: ${secondary};
	--sl-color-accent-low: color-mix(in srgb, ${secondary} 30%, ${bgPrimary});
	--sl-color-accent-high: color-mix(in srgb, ${secondary} 70%, white);

	--sl-color-white: ${textPrimary};
	--sl-color-gray-1: ${textPrimary};
	--sl-color-gray-2: color-mix(in srgb, ${textPrimary} 80%, ${textSecondary});
	--sl-color-gray-3: ${textSecondary};
	--sl-color-gray-4: color-mix(in srgb, ${textSecondary} 50%, ${textDisabled});
	--sl-color-gray-5: ${textDisabled};
	--sl-color-gray-6: ${bgSecondary};
	--sl-color-black: ${bgPrimary};

	--sl-color-bg: ${bgPrimary};
	--sl-color-bg-nav: ${bgSecondary};
	--sl-color-bg-sidebar: ${bgSecondary};
	--sl-color-text: ${textPrimary};
	--sl-color-text-accent: ${secondary};
	--sl-color-hairline: color-mix(in srgb, ${textDisabled} 40%, transparent);
	--sl-color-hairline-shade: color-mix(in srgb, ${textDisabled} 40%, transparent);
}

:root[data-theme='light'] {
	--jr-primary: ${primary};
	--sl-color-accent: ${secondary};
	--sl-color-bg: ${bgPrimary};
	--sl-color-bg-nav: ${bgSecondary};
	--sl-color-bg-sidebar: ${bgSecondary};
	--sl-color-text: ${textPrimary};
}

/* Active sidebar link (left sidebar): use PRIMARY color (purple) to
   distinguish from the regular accent (blue) used elsewhere. */
.sidebar-content a[aria-current='page'] {
	background-color: transparent !important;
	color: ${primary} !important;
	font-weight: 600;
}

/* Active TOC link (right sidebar "On this page"): same treatment. */
starlight-toc nav a[aria-current='true'] {
	color: ${primary} !important;
	font-weight: 600;
}
`;
}

/**
 * Recursively copy markdown files, auto-generating Starlight frontmatter
 * (title) from the first H1 heading when frontmatter is missing.
 * Non-markdown files are copied as-is.
 */
function copyMarkdownWithFrontmatter(srcDir, destDir) {
	fs.mkdirSync(destDir, { recursive: true });
	for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
		const srcPath = path.join(srcDir, entry.name);
		const destPath = path.join(destDir, entry.name);

		if (entry.isDirectory()) {
			copyMarkdownWithFrontmatter(srcPath, destPath);
			continue;
		}

		if (!entry.name.endsWith('.md')) {
			fs.copyFileSync(srcPath, destPath);
			continue;
		}

		let content = fs.readFileSync(srcPath, 'utf8');

		// Skip if frontmatter already exists
		if (content.startsWith('---\n')) {
			fs.writeFileSync(destPath, content);
			continue;
		}

		// Extract title from markdown H1, HTML <h1>, or filename as fallback
		let title;
		let matchedLine;
		const mdH1 = content.match(/^#\s+(.+?)\s*$/m);
		const htmlH1 = content.match(/<h1[^>]*>\s*(.+?)\s*<\/h1>/i);

		if (mdH1) {
			title = mdH1[1].trim();
			matchedLine = mdH1[0];
		} else if (htmlH1) {
			title = htmlH1[1].trim();
			matchedLine = htmlH1[0];
		} else {
			// Filename fallback: slugify to human-readable (kebab-case → Title Case)
			title = entry.name
				.replace(/\.md$/, '')
				.replace(/[-_]+/g, ' ')
				.replace(/\b\w/g, (c) => c.toUpperCase());
		}

		// Remove the matched H1 since Starlight renders title separately
		if (matchedLine) {
			content = content.replace(matchedLine, '').replace(/^\s+/, '');
		}

		const frontmatter = `---\ntitle: ${JSON.stringify(title)}\n---\n\n`;
		fs.writeFileSync(destPath, frontmatter + content);
	}
}
