import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_TOKEN })

// Parent page — Navigation root
const PARENT_PAGE_ID = '30fae1f4-e768-47ba-a14f-f363b1ef2581'

const db = await notion.databases.create({
  parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
  title: [{ type: 'text', text: { content: 'Teachers' } }],
  properties: {
    fullName:           { title: {} },
    fullName_en:        { rich_text: {} },
    fullName_pt:        { rich_text: {} },
    imageUrl:           { url: {} },
    gender:             { select: { options: [{ name: 'М', color: 'blue' }, { name: 'Ж', color: 'pink' }] } },
    age:                { number: { format: 'number' } },
    timezone:           { rich_text: {} },
    nativeLanguage:     { rich_text: {} },
    languages: {
      multi_select: {
        options: [
          { name: 'pt-BR', color: 'green' },
          { name: 'ru',    color: 'red' },
          { name: 'en',    color: 'blue' },
          { name: 'es',    color: 'yellow' },
          { name: 'pt-PT', color: 'purple' },
        ],
      },
    },
    experience:         { number: { format: 'number' } },
    specializations:    { multi_select: { options: [] } },
    specializations_en: { rich_text: {} },
    specializations_pt: { rich_text: {} },
    interests:          { multi_select: { options: [] } },
    interests_en:       { rich_text: {} },
    interests_pt:       { rich_text: {} },
    quote:              { rich_text: {} },
    quote_en:           { rich_text: {} },
    quote_pt:           { rich_text: {} },
    contactMethods: {
      multi_select: {
        options: [
          { name: 'zoom',         color: 'blue' },
          { name: 'telegram',     color: 'blue' },
          { name: 'google_meet',  color: 'green' },
          { name: 'discord',      color: 'purple' },
          { name: 'teams',        color: 'blue' },
        ],
      },
    },
    contactLinks: { rich_text: {} },
    schedule:     { rich_text: {} },
    isPublished:  { checkbox: {} },
  },
})

console.log('✅ База Teachers создана!')
console.log('ID:', db.id)
console.log('URL:', db.url)
console.log('\nДобавь в .env.local и Netlify:')
console.log(`NOTION_TEACHERS_DB_ID=${db.id}`)
