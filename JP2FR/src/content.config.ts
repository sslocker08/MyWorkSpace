import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Reusable localized-string schema — every user-facing string in content
// carries all three locales so pages can render any of fr/en/ja from the
// same entry without a fallback lookup at content-authoring time.
const zLocalized = z.object({
  fr: z.string(),
  en: z.string(),
  ja: z.string(),
});

const founders = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/founders' }),
  schema: z.object({
    slug: z.string(),
    order: z.number(),
    published: z.boolean(),
    name: zLocalized,
    title: zLocalized,
    bio: zLocalized,
    region: zLocalized,
    portrait: z.string(),
    sns: z.object({
      instagram: z.string().optional(),
      x: z.string().optional(),
      site: z.string().optional(),
    }),
  }),
});

const products = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/products' }),
  schema: z.object({
    slug: z.string(),
    founder: z.string(),
    order: z.number(),
    published: z.boolean(),
    name: zLocalized,
    description: zLocalized,
    materials: zLocalized,
    price: z.object({
      amount: z.number().int(),
      currency: z.literal('EUR'),
    }),
    stripe: z.object({
      productId: z.string(),
      priceId: z.string(),
    }),
    images: z.array(z.string()),
    stock: z.object({
      kind: z.enum(['unique', 'stocked']),
      soldOut: z.boolean(),
    }),
  }),
});

export const collections = { founders, products };
