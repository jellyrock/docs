import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO_URL = 'https://github.com/jellyrock/shared-ui.git';

/**
 * Copy or symlink the JellyRock shared-ui (header, footer, tokens, nav data)
 * into the current project's src/shared-ui/ directory at build time.
 *
 * - Local dev: symlinks to ../../shared-ui (sibling of docs/)
 * - CI: clones from GitHub
 */
export async function fetchSharedUi() {
	const projectRoot = path.resolve(process.cwd());
	const destDir = path.join(projectRoot, 'src/shared-ui');
	const cloneDir = path.resolve(projectRoot, '..', '.shared-ui-repo');

	// Check for sibling of docs/ (i.e. ../../shared-ui from user-docs/dev-docs)
	const sibling = path.resolve(projectRoot, '..', '..', 'shared-ui');
	const hasSibling = fs.existsSync(path.join(sibling, 'nav.ts'));

	if (hasSibling) {
		const isSymlink = fs.existsSync(destDir) && fs.lstatSync(destDir).isSymbolicLink();
		const pointsCorrectly = isSymlink && fs.readlinkSync(destDir) === sibling;
		if (pointsCorrectly) return;

		if (fs.existsSync(destDir)) {
			fs.rmSync(destDir, { recursive: true, force: true });
		}
		fs.symlinkSync(sibling, destDir, 'dir');
		console.log(`Linked src/shared-ui → ${sibling} (dev mode)`);
		return;
	}

	if (fs.existsSync(destDir) && fs.existsSync(path.join(destDir, 'nav.ts'))) {
		return;
	}

	console.log('Fetching shared-ui from GitHub...');
	if (!fs.existsSync(cloneDir)) {
		execSync(`git clone --depth 1 ${REPO_URL} ${cloneDir}`, { stdio: 'inherit' });
	}

	fs.mkdirSync(destDir, { recursive: true });
	const toCopy = ['nav.ts', 'tokens.css', 'components'];
	for (const name of toCopy) {
		const src = path.join(cloneDir, name);
		const dest = path.join(destDir, name);
		if (fs.existsSync(src)) {
			fs.cpSync(src, dest, { recursive: true });
		}
	}

	fs.rmSync(cloneDir, { recursive: true, force: true });
	console.log('shared-ui ready.');
}
