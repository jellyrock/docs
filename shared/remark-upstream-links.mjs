import path from 'node:path';
import { slug } from 'github-slugger';
import { visit } from 'unist-util-visit';

/** The two docs sites. Each astro.config.mjs takes its `site` from here. */
export const DOCS_SITES = {
	user: 'https://docs.jellyrock.app',
	dev: 'https://dev.jellyrock.app',
};

const REPO_BLOB_URL = 'https://github.com/jellyrock/jellyrock/blob/main/';
const REPO_TREE_URL = 'https://github.com/jellyrock/jellyrock/tree/main/';

/**
 * Rewrite the relative links in upstream markdown (written for reading on GitHub)
 * so they work on the docs sites. A link is resolved against the file's place in
 * jellyrock/jellyrock, then points at:
 *   - a page on this site      → its URL here (`/manage-subtitles/#anchor`)
 *   - a page on the other site → that site's URL
 *   - any other repo file      → the file on GitHub
 * Images keep a relative path to the copy fetch-docs.mjs put in the content dir,
 * so Astro processes them. A raw `<img src="…">` becomes a markdown image first:
 * Astro never processes raw HTML images, so their files never reached dist/.
 *
 * @param {object} options
 * @param {'user' | 'dev'} options.docType - Which upstream docs folder this site is built from
 * @param {string} options.contentDir - Absolute path of the site's src/content/docs
 */
export function remarkUpstreamLinks({ docType, contentDir }) {
	return (tree, file) => {
		const relToContent = path.relative(contentDir, file.path);
		if (relToContent.startsWith('..') || path.isAbsolute(relToContent)) return;
		const upstreamFile = path.posix.join('docs', docType, relToContent.split(path.sep).join('/'));
		const fileDir = path.dirname(file.path);

		visit(tree, 'html', (node, index, parent) => {
			const image = rawImageToMarkdown(node.value);
			if (image && parent && index !== undefined) parent.children[index] = image;
		});

		visit(tree, ['link', 'definition'], (node) => {
			const target = resolveUpstream(upstreamFile, node.url);
			if (target) node.url = linkUrl(target, docType);
		});

		visit(tree, 'image', (node) => {
			const target = resolveUpstream(upstreamFile, node.url);
			const local = target && contentPath(target.path, docType);
			if (local) node.url = toRelativeUrl(path.relative(fileDir, path.join(contentDir, local)));
		});
	};
}

/** Resolve a relative URL against an upstream file. Returns null for anything else. */
function resolveUpstream(upstreamFile, url) {
	if (!url || /^([a-z][a-z\d+.-]*:|#|\/)/i.test(url)) return null;
	const [, rawPath, hash = ''] = url.match(/^([^#?]*)(?:\?[^#]*)?(#.*)?$/) ?? [];
	if (!rawPath) return null;
	const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(upstreamFile), decodeURI(rawPath)));
	if (resolved.startsWith('..')) return null;
	return { path: resolved, hash, isDir: rawPath.endsWith('/') };
}

function linkUrl({ path: target, hash, isDir }, docType) {
	const page = target.match(/^docs\/(user|dev)\/(.+)\.md$/);
	if (page) {
		const url = pageUrl(page[2]) + hash;
		return page[1] === docType ? url : DOCS_SITES[page[1]] + url;
	}
	return (isDir ? REPO_TREE_URL : REPO_BLOB_URL) + encodeURI(target) + (isDir ? '/' : '') + hash;
}

/** The URL Astro's glob loader gives a page: each path segment through github-slugger, `index` dropped. */
function pageUrl(relPath) {
	const slugPath = relPath
		.split('/')
		.map((segment) => slug(segment))
		.join('/')
		.replace(/(^|\/)index$/, '');
	return slugPath ? `/${slugPath}/` : '/';
}

/** Where fetch-docs.mjs copies an upstream file inside the content dir, or null if it doesn't. */
function contentPath(target, docType) {
	const prefix = `docs/${docType}/`;
	if (target.startsWith(prefix)) return target.slice(prefix.length);
	if (target.startsWith('docs/screenshots/')) return target.slice('docs/'.length);
	return null;
}

function toRelativeUrl(relPath) {
	const url = relPath.split(path.sep).join('/');
	return url.startsWith('.') ? url : `./${url}`;
}

/** `<img src="…" alt="…">` alone in an HTML node → a markdown image node. */
function rawImageToMarkdown(html) {
	const tag = html.trim().match(/^<img\b([^>]*?)\/?>$/i);
	if (!tag) return null;
	const attr = (name) => tag[1].match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i'))?.[1];
	const src = attr('src');
	if (!src || /^([a-z][a-z\d+.-]*:|\/)/i.test(src)) return null;
	return { type: 'image', url: src, alt: attr('alt') ?? '', title: attr('title') ?? null };
}
