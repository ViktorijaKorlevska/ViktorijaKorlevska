import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'SEO Title',
      type: 'string',
      validation: (Rule) => Rule.required().max(60).warning('Optimal title length is 60 characters.'),
    }),
    defineField({
      name: 'description',
      title: 'SEO Description',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required().max(160).warning('Optimal description length is 160 characters.'),
    }),
    defineField({
      name: 'image',
      title: 'Share Image',
      type: 'image',
      description: 'Image used for social sharing cards (OG:Image)',
      options: {
        hotspot: true,
      },
    }),
  ],
})
