# blog-site

Personal site. Source of truth lives in the Obsidian vault at
`C:\Users\sjion\iCloudDrive\iCloud~md~obsidian\Blog`. This repo only holds the
build (Astro) and a one-way sync script.

## Layout

```
src/
  content/posts/      ← synced from vault (do not edit by hand)
  layouts/            ← BaseLayout
  pages/              ← Home, posts/, posts/[slug], about, 404, rss.xml
  styles/global.css   ← all styles in one file
public/
  attachments/        ← synced images, referenced from posts
scripts/
  sync.mjs            ← vault → src/content/posts
.github/workflows/
  deploy.yml          ← Pages deploy on push to main
```

## Vault structure expected

```
<vault>/posts/                ← markdown files (one per post)
<vault>/attachments/          ← images embedded with ![[name.png]]
```

Required frontmatter on each post:

```yaml
---
title: "タイトル"
date: 2026-05-10
slug: "url-slug"             # required, lowercase alphanumeric + hyphen
description: "メタ用 (省略可)"
draft: false                  # true = not published
tags: []                      # optional
---
```

## Workflow

1. Write a post in Obsidian under `posts/`. Add frontmatter with `slug`.
2. Set `draft: false` when ready.
3. Hit the publish hotkey (see Obsidian setup below).
4. GitHub Actions builds and deploys to Pages.

## Obsidian Shell Commands setup

1. Install **Shell commands** plugin (Community Plugins).
2. Add a new shell command:
   - Platform: Windows
   - Command:
     ```
     cd /d C:\Users\sjion\dev\blog-site && npm run publish
     ```
3. Set a hotkey (e.g. `Ctrl+Shift+P`) and optionally show in status bar.
4. Done — pressing the hotkey from anywhere in Obsidian publishes.

## Local commands

```
npm install         # first time
npm run sync        # vault → src/content/posts (no commit)
npm run dev         # local preview at http://localhost:4321
npm run build       # static build to dist/
npm run publish     # sync + commit + push
```

## Notes

- `src/content/posts/` is committed, but only ever modified by `sync.mjs`. Do not
  edit the synced files directly — the next sync will overwrite them.
- Slugs are validated as `[a-z0-9][a-z0-9-]*`. Invalid slugs are skipped with a
  warning.
- Attachments are mirrored: only files referenced by published posts end up in
  `public/attachments/`.
