#!/usr/bin/env node
// Sync from Obsidian vault to Astro content collection.
// One-way: vault is read-only.
//
// - Reads vault/posts/**/*.md
// - Skips drafts (frontmatter draft: true, missing date, or missing slug)
// - Writes to src/content/posts/<slug>.md (renamed by slug)
// - Converts ![[image.png]] -> ![](/attachments/image.png)
// - Converts [[note]] / [[note|alias]] -> alias-or-note text (no internal links yet)
// - Mirrors: removes site files no longer present in vault
// - Copies referenced attachments only

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');
const VAULT_ROOT = process.env.VAULT_ROOT
  ?? 'C:/Users/sjion/iCloudDrive/iCloud~md~obsidian/Blog';

const VAULT_POSTS = path.join(VAULT_ROOT, 'posts');
const VAULT_ATTACH = path.join(VAULT_ROOT, 'attachments');
const SITE_POSTS = path.join(SITE_ROOT, 'src', 'content', 'posts');
const SITE_ATTACH = path.join(SITE_ROOT, 'public', 'attachments');

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return out;
    throw e;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.isFile() && e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function transformBody(body) {
  const referencedAttachments = new Set();

  // Embedded attachment: ![[file.png]] / ![[file.png|400]] / ![[file.png|alt]]
  // / ![[file.png|alt|400]] / ![[file.png|400x300]]
  body = body.replace(/!\[\[([^\]|]+?)((?:\|[^\]]*)*)\]\]/g, (_m, file, modifierStr) => {
    const name = path.basename(file.trim());
    referencedAttachments.add(name);
    const url = `/attachments/${encodeURI(name)}`;

    const parts = modifierStr
      ? modifierStr.split('|').slice(1).map((s) => s.trim()).filter(Boolean)
      : [];

    let alt = '';
    let width;
    let height;
    for (const p of parts) {
      const m = p.match(/^(\d+)(?:x(\d+))?$/);
      if (m) {
        width = m[1];
        if (m[2]) height = m[2];
      } else {
        alt = p;
      }
    }

    const attrs = [
      `src="${url}"`,
      `alt="${escapeHtml(alt)}"`,
      width ? `width="${width}"` : '',
      height ? `height="${height}"` : '',
      'loading="lazy"',
      'decoding="async"',
    ].filter(Boolean).join(' ');

    const img = `<img ${attrs}>`;
    if (alt) {
      return `<figure>${img}<figcaption>${escapeHtml(alt)}</figcaption></figure>`;
    }
    return img;
  });

  // Internal wikilink: [[note]] or [[note|label]]
  // For MVP: render as plain text (no internal navigation).
  body = body.replace(/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g, (_m, target, label) => {
    return label ?? target;
  });

  return { body, referencedAttachments };
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function main() {
  await ensureDir(SITE_POSTS);
  await ensureDir(SITE_ATTACH);

  const vaultFiles = await walk(VAULT_POSTS);
  const written = new Set();
  const usedAttachments = new Set();
  let publishedCount = 0;
  let draftCount = 0;

  for (const file of vaultFiles) {
    const raw = await fs.readFile(file, 'utf8');
    const { data, content } = matter(raw);

    if (data.draft === true) { draftCount++; continue; }
    if (!data.slug) {
      console.warn(`skip (no slug): ${path.relative(VAULT_ROOT, file)}`);
      continue;
    }
    if (!data.title || !data.date) {
      console.warn(`skip (missing title/date): ${path.relative(VAULT_ROOT, file)}`);
      continue;
    }

    const slug = String(data.slug).trim();
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) {
      console.warn(`skip (invalid slug): ${slug}`);
      continue;
    }

    const { body, referencedAttachments } = transformBody(content);
    for (const a of referencedAttachments) usedAttachments.add(a);

    const outFm = {
      title: data.title,
      date: data.date instanceof Date
        ? data.date.toISOString().slice(0, 10)
        : String(data.date),
      ...(data.description ? { description: data.description } : {}),
      ...(Array.isArray(data.tags) && data.tags.length ? { tags: data.tags } : {}),
    };

    const out = matter.stringify(body, outFm);
    const target = path.join(SITE_POSTS, `${slug}.md`);
    await fs.writeFile(target, out);
    written.add(`${slug}.md`);
    publishedCount++;
  }

  // Mirror: remove published files no longer present
  const existing = await fs.readdir(SITE_POSTS).catch(() => []);
  let removedPosts = 0;
  for (const f of existing) {
    if (!f.endsWith('.md')) continue;
    if (!written.has(f)) {
      await fs.unlink(path.join(SITE_POSTS, f));
      removedPosts++;
    }
  }

  // Copy referenced attachments only
  let copiedAttachments = 0;
  for (const name of usedAttachments) {
    const src = path.join(VAULT_ATTACH, name);
    try {
      await fs.copyFile(src, path.join(SITE_ATTACH, name));
      copiedAttachments++;
    } catch (e) {
      console.warn(`attachment missing in vault: ${name}`);
    }
  }

  // Mirror attachments
  const existingAttach = await fs.readdir(SITE_ATTACH).catch(() => []);
  let removedAttach = 0;
  for (const f of existingAttach) {
    if (!usedAttachments.has(f)) {
      await fs.unlink(path.join(SITE_ATTACH, f));
      removedAttach++;
    }
  }

  console.log(
    `synced: ${publishedCount} published, ${draftCount} drafts skipped, `
    + `${removedPosts} removed, ${copiedAttachments} attachments, ${removedAttach} attachments removed`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
