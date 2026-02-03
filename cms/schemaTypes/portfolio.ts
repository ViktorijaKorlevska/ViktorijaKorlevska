import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'portfolio',
  title: 'Portfolio Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Full Name',
      type: 'string', // e.g. John Doe
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Professional Role',
      type: 'string', // e.g. UX Designer
    }),
    defineField({
      name: 'description',
      title: 'About Description',
      type: 'array',
      of: [{ type: 'block' }], // Portable Text
    }),
    defineField({
      name: 'seo',
      title: 'SEO Settings',
      type: 'seo', // Reference to seo schema
      options: { collapsible: true },
    }),
    defineField({
      name: 'schema_org_description',
      title: 'Schema.org Description',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'social_media',
      title: 'Social Media Links',
      type: 'social_media', // Reference to social_media schema
      options: { collapsible: true },
    }),
    defineField({
      name: 'email',
      title: 'Email Address',
      type: 'string',
      validation: (Rule) => Rule.email(),
    }),
    defineField({
      name: 'phone',
      title: 'Phone Number',
      type: 'string',
    }),
    defineField({
      name: 'websiteUrl',
      title: 'Website URL',
      type: 'url',
      description: 'Main URL of your portfolio site',
    }),
    defineField({
      name: 'primary_background_color',
      title: 'Primary Background Color',
      type: 'string',
      description: 'Hex code (e.g. #FFFFFF)',
      validation: (Rule) => Rule.regex(/^#[0-9A-Fa-f]{6}$/, { name: 'hex' }).error('Must be a valid hex code'),
    }),
    defineField({
      name: 'secondary_background_color',
      title: 'Secondary Background Color',
      type: 'string',
      description: 'Hex code (e.g. #000000)',
      validation: (Rule) => Rule.regex(/^#[0-9A-Fa-f]{6}$/, { name: 'hex' }).error('Must be a valid hex code'),
    }),
    defineField({
      name: 'pre_cta_text',
      title: 'Pre-CTA Text',
      type: 'string',
    }),
    defineField({
      name: 'cta_text',
      title: 'CTA Text',
      type: 'string',
    }),
    defineField({
      name: 'cta_button_text',
      title: 'CTA Button Label',
      type: 'string',
    }),
    defineField({
      name: 'portfolio_items',
      title: 'Portfolio Projects',
      type: 'array',
      of: [{ type: 'portfolioItem' }],
    }),
    defineField({
      name: 'other_works',
      title: 'Other Works (SMyWay Section)',
      type: 'array',
      of: [{ type: 'otherWork' }],
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'role',
    },
  },
})
