// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://shirocchi.github.io',
  integrations: [sitemap()],
  build: {
    format: 'directory',
  },
  markdown: {
    smartypants: false,
  },
});
