# JellyRock Docs

[![User docs](https://img.shields.io/badge/user-docs.jellyrock.app-2563eb 'User documentation')](https://docs.jellyrock.app)
[![Dev docs](https://img.shields.io/badge/dev-dev.jellyrock.app-7c3aed 'Developer documentation')](https://dev.jellyrock.app)
[![License](https://img.shields.io/github/license/jellyrock/docs 'License')](./LICENSE)
[![build](https://img.shields.io/github/actions/workflow/status/jellyrock/docs/deploy.yml?logo=github&branch=main 'build')](https://github.com/jellyrock/docs/actions/workflows/deploy.yml?query=branch%3Amain)

npm workspaces monorepo that builds both JellyRock documentation sites from
markdown that lives in [`jellyrock/jellyrock`](https://github.com/jellyrock/jellyrock).

| Site      | URL                                              | Source markdown                                                                                    |
| --------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| User docs | [docs.jellyrock.app](https://docs.jellyrock.app) | `jellyrock/jellyrock` → [`docs/user/`](https://github.com/jellyrock/jellyrock/tree/main/docs/user) |
| Dev docs  | [dev.jellyrock.app](https://dev.jellyrock.app)   | `jellyrock/jellyrock` → [`docs/dev/`](https://github.com/jellyrock/jellyrock/tree/main/docs/dev)   |

Both sites share an identical build pipeline, shared UI, and theme — they differ
only in content source, home page splash, and page order.

## Tech stack

| Piece               | Choice                                                                                                                   | Why                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Framework           | [Astro 7](https://astro.build/) + [Starlight](https://starlight.astro.build/)                                            | First-class docs features: sidebar, search, dark mode, TOC.                            |
| Markdown extensions | [`remark-github-alerts`](https://github.com/chrisweb/remark-github-alerts)                                               | Lets `> [!NOTE]` / `> [!TIP]` / `> [!CAUTION]` render on both GitHub and Starlight.    |
| Link rewriting      | Custom [`shared/remark-upstream-links.mjs`](shared/remark-upstream-links.mjs)                                            | Upstream links written for GitHub (`page.md`, `../../scripts/x.js`) work on the sites. |
| Link checking       | [`starlight-links-validator`](https://github.com/HiDeoo/starlight-links-validator)                                       | A link to a missing page or `#anchor` fails the build.                                 |
| Shared UI           | [`jellyrock/shared-ui`](https://github.com/jellyrock/shared-ui)                                                          | One nav/footer/tokens source for all three JellyRock sites.                            |
| Content pipeline    | Custom [`shared/fetch-docs.mjs`](shared/fetch-docs.mjs)                                                                  | Shallow-clones the app repo at build time so devs can edit markdown next to the code.  |
| Theme               | Auto-generated from [`jellyrock/settings.json`](https://github.com/jellyrock/jellyrock/blob/main/settings/settings.json) | CSS variables mirror the app's in-product themes.                                      |
| Analytics           | [Umami](https://analytics.jellyrock.app) (self-hosted)                                                                   | Privacy-respecting; one website ID per site (see each site's `astro.config.mjs`).      |
| Hosting             | Caddy `file_server` on the JellyRock VPS                                                                                 | Same pipeline as the homepage.                                                         |

## How a build works

```text
push to jellyrock/jellyrock main (notify-docs.yml)
    │
    └─▶ repository_dispatch (docs-update) ─┐
                                           ▼
push to jellyrock/docs (main)  ─▶  .github/workflows/deploy.yml
                                           │
                                           ├─ gates: ci.yml (npm ci, npm run check, build, browser tests)
                                           │
                                           ├─ build:user                       build:dev
                                           │  ├─ fetch-shared-ui.mjs           ├─ fetch-shared-ui.mjs
                                           │  ├─ fetch-docs.mjs('user')        ├─ fetch-docs.mjs('dev')
                                           │  │   ├─ shallow-clone app repo    │   └─ reuses clone
                                           │  │   ├─ copy docs/user/*.md       │   ├─ copy docs/dev/*.md
                                           │  │   ├─ regenerate theme.css      │   ├─ regenerate theme.css
                                           │  │   └─ write splash index.mdx    │   └─ write splash index.mdx
                                           │  └─ astro build → user-docs/dist/ └─ astro build → dev-docs/dist/
                                           │
                                           ├─ browser tests (functional) on both builds
                                           │
                                           └─ rsync the tested dist/ → VPS:
                                                /opt/jellyrock/user-docs/
                                                /opt/jellyrock/dev-docs/
                                                    │
                                                    └─ Caddy serves the sites
```

## Repo layout

```text
docs/
├── user-docs/            # Starlight site for docs.jellyrock.app
│   ├── astro.config.mjs  # site URL, Umami ID, nav, remark plugins
│   └── src/
│       ├── components/   # Starlight overrides (Header, Footer, PageFrame)
│       ├── content/      # populated at build time by fetch-docs.mjs
│       ├── shared-ui/    # populated at build time by fetch-shared-ui.mjs
│       └── styles/       # custom.css, theme.css (generated)
├── dev-docs/             # Starlight site for dev.jellyrock.app (same shape)
├── shared/
│   ├── fetch-docs.mjs        # clones jellyrock, copies markdown, writes theme
│   ├── fetch-shared-ui.mjs   # symlink (dev) or clone (CI) shared-ui
│   ├── remark-upstream-links.mjs  # rewrites upstream relative links and images
│   └── templates/
│       ├── user-index.mdx    # home page splash for docs.jellyrock.app
│       └── dev-index.mdx     # home page splash for dev.jellyrock.app
├── scripts/
│   ├── build-warnings.sh          # fails a build that prints an unexpected warning
│   ├── build-warnings-allowed.txt # warnings known to be harmless, each with its reason
│   └── playwright-docker.sh       # runs Playwright in the image CI uses
├── tests/
│   ├── e2e/                  # browser tests: one spec per site, screenshots, baselines
│   └── support/production-headers.json  # the security headers Caddy sends
├── playwright.config.ts
└── .github/workflows/
    ├── ci.yml                # PRs, and the gates every deploy runs first
    └── deploy.yml
```

## Local development

```bash
nvm use              # Node from .nvmrc
npm install -g "$(node -p 'require("./package.json").packageManager')"  # the npm CI and Renovate use
npm ci
npm run dev:user     # http://localhost:4321  →  docs.jellyrock.app
npm run dev:dev      # http://localhost:4322  →  dev.jellyrock.app
npm run build        # builds both sites
npm run build:strict # same, and fails on a warning not in scripts/build-warnings-allowed.txt (CI runs this)
npm test             # browser tests against both builds (see Browser tests)
```

On the first build:

- [`shared/fetch-shared-ui.mjs`](shared/fetch-shared-ui.mjs) shallow-clones
  [`jellyrock/shared-ui`](https://github.com/jellyrock/shared-ui) into each
  site's `src/shared-ui/`.
- [`shared/fetch-docs.mjs`](shared/fetch-docs.mjs) sparse-clones
  [`jellyrock/jellyrock`](https://github.com/jellyrock/jellyrock) into
  `.jellyrock-repo/` at the repo root, then copies markdown into each site's
  content collection. Every build updates the clone to upstream `main` (it logs
  `Using jellyrock/jellyrock <commit> <date>`) and re-copies the content. The
  clone is a cache: edits made inside it are discarded on the next build, so
  edit docs in the jellyrock repo instead.

This is the same path CI uses — no setup required.

### Previewing an unmerged jellyrock branch (opt-in)

To see a docs change before it merges, point the build at a local checkout of
`jellyrock/jellyrock` (a worktree or a PR branch) instead of the clone:

```bash
JELLYROCK_SOURCE=/path/to/jellyrock npm run dev:user
```

The build reads that checkout as it is, uncommitted edits included, and logs
its path after the commit. The **Edit page** links still point at `main`. CI
never sets it.

### Iterating on shared-ui locally (opt-in)

If you're actively editing `shared-ui` and want edits to hot-reload in the docs
sites without a commit-push-rebuild cycle, clone it as a sibling of this repo:

```bash
git clone https://github.com/jellyrock/shared-ui.git ../shared-ui
```

When `../shared-ui/` exists, `fetch-shared-ui.mjs` symlinks each site's
`src/shared-ui/` to it instead of cloning. Vite picks up every save instantly.
Remove the sibling (or `rm -rf user-docs/src/shared-ui dev-docs/src/shared-ui`)
to go back to the clone-from-GitHub default.

> [!CAUTION]
> The symlink points at your local working tree — you can ship a build
> referencing shared-ui commits that aren't pushed yet. Always push
> `shared-ui` before pushing the consumer sites that depend on the change.

## Updating content

### Writing pages (the common case)

Pages are authored in `jellyrock/jellyrock`:

- User docs → [`jellyrock/jellyrock:docs/user/`](https://github.com/jellyrock/jellyrock/tree/main/docs/user)
- Dev docs → [`jellyrock/jellyrock:docs/dev/`](https://github.com/jellyrock/jellyrock/tree/main/docs/dev)

Use plain GitHub-flavored markdown. The title is inferred from the first H1 if
no frontmatter is present; `fetch-docs.mjs` injects `title:` + `description:`
frontmatter before Starlight sees the file.

Callouts use the GitHub syntax so they render on both GitHub and the docs site:

```md
> [!NOTE]
> Helpful context.

> [!TIP]
> A recommended approach.

> [!WARNING]
> Something to watch out for.

> [!CAUTION]
> Don't do this.
```

Links and images use GitHub-style relative paths, so they work when reading the
markdown on GitHub too. At build time
[`remark-upstream-links.mjs`](shared/remark-upstream-links.mjs) rewrites each one:

| Upstream link                                    | On the site                                                  |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `manage-subtitles.md#anchor` (same docs folder)  | `/manage-subtitles/#anchor`                                  |
| `../dev/debug-flags.md` (the other docs folder)  | `https://dev.jellyrock.app/debug-flags/`                     |
| `../../scripts/rta-run.js` (any other repo file) | `https://github.com/jellyrock/jellyrock/blob/main/scripts/…` |
| `![alt](images/x.png)` or `<img src="images/…">` | An optimized image (a raw `<img>` loses its `width`)         |

The build fails on a link to a page or `#anchor` that doesn't exist, and on a
missing image, so a broken link blocks the docs deploy until it's fixed upstream.

Push to `main` and the docs sites redeploy within minutes: `jellyrock/jellyrock`'s
`notify-docs.yml` sends `docs-update` here whenever a file the build reads changes
(the paths `ensureClone()` in [`fetch-docs.mjs`](shared/fetch-docs.mjs) checks out).
Broken links and anchors in `docs/user` and `docs/dev` fail that repo's
`docs-check` on the PR, before they reach this build.

When a user page moves upstream, add its old and new paths to `MOVED_PAGES` in
[`user-docs/astro.config.mjs`](user-docs/astro.config.mjs), so links to the old
URL keep working. The old URL redirects only once no page is left there, so the
entry can land before or after the move.

### Changing the home page splash

The home page for each site is **not** sourced from `jellyrock/jellyrock`; it's a
local template that `fetch-docs.mjs` copies into `src/content/docs/index.mdx`
on every build:

- User splash → [`shared/templates/user-index.mdx`](shared/templates/user-index.mdx)
- Dev splash → [`shared/templates/dev-index.mdx`](shared/templates/dev-index.mdx)

These are Starlight MDX files — feature cards use the `<Card>` / `<CardGrid>` /
`<LinkCard>` components from `@astrojs/starlight/components`. Edit freely; the
template always overwrites whatever Starlight may have generated previously.

### Changing page order in the sidebar

Starlight orders sidebar items alphabetically by filename by default. Two
options:

1. **Filename prefix (recommended, zero config).** Rename files in
   `jellyrock/jellyrock:docs/user/` or `docs/dev/` with numeric prefixes:
   `01-getting-started.md`, `02-configuring-server.md`, etc.
   `fetch-docs.mjs` preserves filenames, and Starlight sorts them lexically.
   The prefix is hidden from the URL via the page's slug/frontmatter.

2. **Explicit sidebar in `astro.config.mjs`.** For fine-grained control
   (groups, labels, collapsed state), define a `sidebar` in the Starlight
   integration options. See the [Starlight sidebar docs](https://starlight.astro.build/guides/sidebar/).

### Adding short videos

Starlight renders plain HTML, so three paths work today:

1. **Self-hosted MP4/WebM.** Drop the file in
   `jellyrock/jellyrock:docs/screenshots/` (already synced by `fetch-docs.mjs`)
   and embed with:

   ```md
   <video src="/screenshots/my-demo.webm" controls muted playsinline width="720">
     Your browser does not support the video tag.
   </video>
   ```

   Keep files lean — no image pipeline optimizes video. Prefer WebM at 720p,
   <2 MB.

2. **YouTube / Vimeo embed.** Starlight supports
   [`astro-embed`](https://github.com/delucis/astro-embed) — add it as a
   dependency and import `<YouTube id="..." />` in an `.mdx` page.

3. **Animated GIFs.** Work out of the box as `![alt](./screenshots/foo.gif)`
   but tend to be large — prefer WebM.

> [!NOTE]
> If video support becomes common, consider adding a `<Video />` component to
> `jellyrock/shared-ui` so both sites render videos consistently (lazy loading,
> poster frames, etc.).

### Changing branding / theme

| Want to change                       | Where                                                                                                                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colors / typography tokens           | [`jellyrock/shared-ui:tokens.css`](https://github.com/jellyrock/shared-ui/blob/main/tokens.css)                                                                              |
| Starlight-specific CSS overrides     | `user-docs/src/styles/custom.css` and `dev-docs/src/styles/custom.css`                                                                                                       |
| In-app color themes (cascades here)  | [`jellyrock/jellyrock:settings/settings.json`](https://github.com/jellyrock/jellyrock/blob/main/settings/settings.json) — `fetch-docs.mjs` regenerates `theme.css` from this |
| Header links / footer sections       | [`jellyrock/shared-ui:nav.ts`](https://github.com/jellyrock/shared-ui/blob/main/nav.ts)                                                                                      |
| Starlight site title, accent, social | [`user-docs/astro.config.mjs`](user-docs/astro.config.mjs), [`dev-docs/astro.config.mjs`](dev-docs/astro.config.mjs)                                                         |

### Swapping Umami website IDs

Each site has its own website in the self-hosted Umami dashboard, wired up via
the `head` array in its `astro.config.mjs`.

## Browser tests

CI opens both built sites in a real browser (Playwright, Chromium) at desktop
and phone size before anything merges or deploys, so a dependency bump or an
upstream docs change that breaks a page turns CI red instead of reaching the
sites. Each build is served the way production serves it: the same security
headers (including the CSP), redirects and 404 handling.

The server and the checks every JellyRock site shares come from shared-ui's
[`testing/`](https://github.com/jellyrock/shared-ui/tree/main/testing), which
the build fetches into each site's `src/shared-ui/testing/`. This repo keeps
the config, the specs, the screenshots and the production headers.

| Test                                                                                                   | Fails when                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`tests/e2e/user-docs.spec.ts`](tests/e2e/user-docs.spec.ts), [`dev-docs`](tests/e2e/dev-docs.spec.ts) | Any page in the sitemap has a script error, something the CSP blocks, a failed or cross-origin request, a broken image, sideways scrolling on a phone, or a missing header/footer; an internal link or anchor redirects or is broken; a missing page doesn't return 404 |
| [`tests/e2e/screenshots.ts`](tests/e2e/screenshots.ts)                                                 | A landing page or 404 page looks different from its approved screenshot in [`tests/e2e/__screenshots__/`](tests/e2e/__screenshots__/)                                                                                                                                   |

Screenshots cover only the pages this repo owns. Content pages come from
jellyrock/jellyrock `main` at build time and change there without a PR here,
so they get the functional checks only; the sidebar's page list, the
previous/next links and images are masked for the same reason. Deploys,
including the ones upstream docs edits trigger, run the functional tests but
not the screenshots: the theme colours come from upstream too, and a deploy
has no PR to refresh baselines in.

```bash
npm run build                # the tests run against user-docs/dist and dev-docs/dist
npm test                     # everything, inside the same Playwright image CI uses
npm run test:e2e             # functional tests only, with a local browser
                             # (first time: npx playwright install chromium)
npm run test:visual          # screenshot tests only (Docker)
npm run test:visual:update   # accept the current look as the new baseline (Docker)
```

**When CI goes red,** open the failed run's **playwright-report** artifact and
its `index.html`: each failure shows the error, and each screenshot failure
shows expected, actual and a diff. A failure on a content page usually comes
from the upstream markdown: fix it in jellyrock/jellyrock.

**After a deliberate design change** (or a shared-ui, Starlight or upstream
theme change that changes how the pages look), the screenshot tests go red as
intended. Check the diff is what you meant, run
`npm run build && npm run test:visual:update`, and commit the updated PNGs in
the same PR.

Screenshots only match inside the Playwright image, because fonts render
differently between machines, which is why those commands run through Docker
([`scripts/playwright-docker.sh`](scripts/playwright-docker.sh)). The image is
pinned in `.github/workflows/ci.yml`, and Renovate moves it together with
`@playwright/test`.

The production headers are a copy of what Caddy sends (its config lives in
`jellyrock/infra`), kept in
[`tests/support/production-headers.json`](tests/support/production-headers.json).
Update it when the docs sites' headers change.

## Deployment secrets

Required repo secrets (org-level, shared with sibling deploy repos):

- `DEPLOY_SSH_KEY` — private key authorized on VPS `jellyrock@`
- `VPS_KNOWN_HOSTS` — pre-verified `ssh-keyscan` output
- `VPS_HOST`, `VPS_USER` — deploy target

## Troubleshooting

| Symptom                                            | Likely cause                                                           | Fix                                                                                                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Dev server serves stale `theme.css`                | Vite HMR didn't pick up the regenerated file                           | Restart `npm run dev:*`                                                                                                                    |
| Old content keeps showing in dev                   | Build warned it could not update the clone                             | Check your network, then restart `npm run dev:*` or rebuild                                                                                |
| Deploy fails at rsync step                         | `VPS_KNOWN_HOSTS` secret missing or stale                              | Refresh via `ssh-keyscan` on the control host, update the secret                                                                           |
| `fetch-shared-ui.mjs` clones instead of symlinking | No sibling `../shared-ui/` present                                     | Expected in CI; for local dev, clone it as a sibling                                                                                       |
| Alerts render as plain blockquotes                 | `remark-github-alerts` missing or removed                              | Check the `markdown.remarkPlugins` array in both `astro.config.mjs` files                                                                  |
| A browser test fails only on a content page        | The upstream markdown (an external image the CSP blocks, a wide table) | Open the playwright-report artifact; fix the page in jellyrock/jellyrock                                                                   |
| CI fails with "Build warnings not in …"            | A build warning that isn't on the allowed list                         | Fix the cause (often upstream docs or a dependency bump); if it's harmless, add it to `scripts/build-warnings-allowed.txt` with the reason |
