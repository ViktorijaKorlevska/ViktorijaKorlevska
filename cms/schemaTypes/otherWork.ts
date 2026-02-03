import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'otherWork',
  title: 'Other Work (SMyWay)',
  type: 'object',
  fields: [
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
  ],
  preview: {
    select: {
      title: 'caption',
      media: 'image',
    },
  },
})
