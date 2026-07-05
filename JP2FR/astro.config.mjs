import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://jp2fr.example.com',
  output: 'static',
  // Cloudflare adapter: kept active so individual pages/API routes can opt into
  // SSR via `export const prerender = false` (e.g. Stripe checkout/webhook
  // endpoints) while the rest of the site stays fully static.
  adapter: cloudflare(),
  i18n: {
    locales: ['fr', 'en', 'ja'],
    defaultLocale: 'fr',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
});
