import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'social_media',
  title: 'Social Media',
  type: 'object',
  fields: [
    defineField({
      name: 'linkedin',
      title: 'LinkedIn',
      type: 'url',
    }),
    defineField({
      name: 'behance',
      title: 'Behance',
      type: 'url',
    }),
    defineField({
      name: 'facebook',
      title: 'Facebook',
      type: 'url',
    }),
    defineField({
      name: 'instagram',
      title: 'Instagram',
      type: 'url',
    }),
  ],
})
