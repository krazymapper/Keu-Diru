import { z } from 'zod';

export const LEVELS = ['beginner', 'intermediate', 'advanced', 'all_levels', 'unknown'] as const;
export const COSTS = ['free', 'freemium', 'paid', 'institutional', 'unknown'] as const;
export const LINK_STATUSES = ['ok', 'restricted', 'temporarily_unreachable', 'broken', 'unverified'] as const;

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug invalide');
const langCode = z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/);
export const labels = z.record(z.string(), z.string().min(1)).refine((l) => 'fr' in l && 'en' in l, {
  message: 'Libellés FR et EN obligatoires',
});

export const translationSchema = z.object({
  title: z.string().trim().min(3).max(300),
  description: z.string().trim().min(20).max(5000),
});

export const resourceSchema = z.object({
  slug,
  url: z.url({ protocol: /^https?$/ }).nullable(),
  type: slug,
  discipline: slug,
  original_language: langCode.nullable(),
  level: z.enum(LEVELS),
  access_cost: z.enum(COSTS),
  author: z.string().nullable(),
  publisher: z.string().nullable(),
  license: z.string().nullable(),
  formats: z.array(z.string()),
  topics: z.array(slug).default([]),
  link_status: z.enum(LINK_STATUSES).default('unverified'),
  translations: z.record(langCode, translationSchema).refine((t) => Object.keys(t).length > 0, 'Au moins une traduction'),
});
export type Resource = z.infer<typeof resourceSchema>;

export const catalogSchema = z.object({
  languages: z.array(z.object({ code: langCode, native_name: z.string(), is_ui_language: z.boolean() })),
  disciplines: z.array(z.object({ slug, icon: z.string().nullable().optional(), labels })),
  resource_types: z.array(z.object({ slug, labels })),
  topics: z.array(z.object({ slug, discipline: slug.nullable(), labels })),
  resources: z.array(resourceSchema),
  collections: z.array(z.object({ slug, title: labels, description: z.record(z.string(), z.string()), items: z.array(slug) })),
  learning_paths: z.array(
    z.object({
      slug,
      level: z.enum(LEVELS),
      title: labels,
      objective: labels,
      steps: z.array(z.object({ resource: slug.nullable(), instruction: z.record(z.string(), z.string()).nullable() })).min(1),
    }),
  ),
});
export type Catalog = z.infer<typeof catalogSchema>;

/** Formulaire de contribution (RM-03). Les champs inconnus restent vides : jamais inventés. */
export const contributionSchema = z
  .object({
    title: z.string().trim().min(3, 'min3').max(300),
    url: z.union([z.url({ protocol: /^https?$/, error: 'url' }), z.literal('')]),
    access_note: z.string().trim().max(500).optional().default(''),
    type: slug,
    discipline: slug,
    language: z.union([langCode, z.literal('')]),
    level: z.enum(LEVELS).default('unknown'),
    access_cost: z.enum(COSTS).default('unknown'),
    description: z.string().trim().min(40, 'min40').max(5000),
    author: z.string().trim().max(200).optional().default(''),
    publisher: z.string().trim().max(200).optional().default(''),
    license: z.string().trim().max(200).optional().default(''),
  })
  .refine((v) => v.url !== '' || v.access_note.length > 0, { message: 'access', path: ['url'] });
export type ContributionInput = z.input<typeof contributionSchema>;
