# JellyRock Docs

[![Deploy](https://github.com/jellyrock/docs/actions/workflows/deploy.yml/badge.svg?branch=main&label=Deploy)](https://github.com/jellyrock/docs/actions/workflows/deploy.yml)
[![User docs](https://img.shields.io/badge/user-docs.jellyrock.app-2563eb)](https://docs.jellyrock.app)
[![Dev docs](https://img.shields.io/badge/dev-dev.jellyrock.app-7c3aed)](https://dev.jellyrock.app)
[![License](https://img.shields.io/github/license/jellyrock/docs)](./LICENSE)

npm workspaces monorepo that builds both JellyRock documentation sites from
markdown that lives in [`jellyrock/jellyrock`](https://github.com/jellyrock/jellyrock).

| Site | URL | Source markdown |
| ---- | --- | --------------- |
| User docs | [docs.jellyrock.app](https://docs.jellyrock.app) | `jellyrock/jellyrock` → [`docs/user/`](https://github.com/jellyrock/jellyrock/tree/main/docs/user) |
| Dev docs | [dev.jellyrock.app](https://dev.jellyrock.app) | `jellyrock/jellyrock` → [`docs/dev/`](https://github.com/jellyrock/jellyrock/tree/main/docs/dev) |

Both sites share an identical build pipeline, shared UI, and theme — they differ
only in content source, home page splash, and page order.

## Tech stack

| Piece | Choice | Why |
| ----- | ------ | --- |
| Framework | [Astro 5](https://astro.build/) + [Starlight](https://starlight.astro.build/) | First-class docs features: sidebar, search, dark mode, TOC. |
| Markdown extensions | [`remark-github-alerts`](https://github.com/chrisweb/remark-github-alerts) | Lets `> [!NOTE]` / `> [!TIP]` / `> [!CAUTION]` render on both GitHub and Starlight. |
| Shared UI | [`jellyrock/shared-ui`](https://github.com/jellyrock/shared-ui) | One nav/footer/tokens source for all four JellyRock sites. |
| Content pipeline | Custom [`shared/fetch-docs.mjs`](shared/fetch-docs.mjs) | Shallow-clones the app repo at build time so devs can edit markdown next to the code. |
| Theme | Auto-generated from [`jellyrock/settings.json`](https://github.com/jellyrock/jellyrock/blob/main/settings/settings.json) | CSS variables mirror the app's in-product themes. |
| Analytics | [Umami](https://analytics.jellyrock.app) (self-hosted) | Privacy-respecting; one website ID per site (see each site's `astro.config.mjs`). |
| Hosting | Caddy `file_server` on the JellyRock VPS | Same pipeline as the homepage and API reference. |

## How a build works

```text
push to jellyrock/jellyrock (docs/**)
    │
    └─▶ repository_dispatch (docs-update) ─┐
                                           ▼
push to jellyrock/docs (main)  ─▶  .github/workflows/deploy.yml
                                           │
                                           ├─ npm ci
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
                                           └─ rsync dist/ → VPS:
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
│   └── templates/
│       ├── user-index.mdx    # home page splash for docs.jellyrock.app
│       └── dev-index.mdx     # home page splash for dev.jellyrock.app
└── .github/workflows/
    └── deploy.yml
```

## Local development

```bash
# Optional: clone shared-ui as a sibling so dev uses a live symlink.
git clone https://github.com/jellyrock/shared-ui.git ../shared-ui

npm ci
npm run dev:user     # http://localhost:4321  →  docs.jellyrock.app
npm run dev:dev      # http://localhost:4322  →  dev.jellyrock.app
npm run build        # builds both sites
```

`fetch-docs.mjs` caches its `.jellyrock-repo/` sparse-checkout at the repo root;
delete it to force a fresh pull.

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

Push to `main` and the docs site rebuilds automatically via the repo-dispatch
webhook in `jellyrock/jellyrock`'s `build-docs.yml`.

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

| Want to change | Where |
| -------------- | ----- |
| Colors / typography tokens | [`jellyrock/shared-ui:tokens.css`](https://github.com/jellyrock/shared-ui/blob/main/tokens.css) |
| Starlight-specific CSS overrides | `user-docs/src/styles/custom.css` and `dev-docs/src/styles/custom.css` |
| In-app color themes (cascades here) | [`jellyrock/jellyrock:settings/settings.json`](https://github.com/jellyrock/jellyrock/blob/main/settings/settings.json) — `fetch-docs.mjs` regenerates `theme.css` from this |
| Header links / footer sections | [`jellyrock/shared-ui:nav.ts`](https://github.com/jellyrock/shared-ui/blob/main/nav.ts) |
| Starlight site title, accent, social | [`user-docs/astro.config.mjs`](user-docs/astro.config.mjs), [`dev-docs/astro.config.mjs`](dev-docs/astro.config.mjs) |

### Swapping Umami website IDs

Each site has its own website in the self-hosted Umami dashboard, wired up via
the `head` array in its `astro.config.mjs`.

## Deployment secrets

Required repo secrets (org-level, shared with sibling deploy repos):

- `DEPLOY_SSH_KEY` — private key authorized on VPS `jellyrock@`
- `VPS_KNOWN_HOSTS` — pre-verified `ssh-keyscan` output
- `VPS_HOST`, `VPS_USER` — deploy target

## Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| Dev server serves stale `theme.css` | Vite HMR didn't pick up the regenerated file | Restart `npm run dev:*` |
| Old content keeps showing in dev | `.jellyrock-repo/` cache is stale | `rm -rf .jellyrock-repo` then rebuild |
| Deploy fails at rsync step | `VPS_KNOWN_HOSTS` secret missing or stale | Refresh via `ssh-keyscan` on the control host, update the secret |
| `fetch-shared-ui.mjs` clones instead of symlinking | No sibling `../shared-ui/` present | Expected in CI; for local dev, clone it as a sibling |
| Alerts render as plain blockquotes | `remark-github-alerts` missing or removed | Check the `markdown.remarkPlugins` array in both `astro.config.mjs` files |
