// Add properties to the Teachers database via raw Notion REST API
const TOKEN = process.env.NOTION_TOKEN
const DB_ID = 'cd9eaf12-ef86-4428-906a-2449653f3f58'

const body = {
  properties: {
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
          { name: 'zoom',        color: 'blue' },
          { name: 'telegram',    color: 'blue' },
          { name: 'google_meet', color: 'green' },
          { name: 'discord',     color: 'purple' },
          { name: 'teams',       color: 'blue' },
        ],
      },
    },
    contactLinks: { rich_text: {} },
    schedule:     { rich_text: {} },
    isPublished:  { checkbox: {} },
  },
}

const res = await fetch(`https://api.notion.com/v1/databases/${DB_ID}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
})

const data = await res.json()
if (!res.ok) {
  console.error('❌ Ошибка:', data)
  process.exit(1)
}

console.log('✅ Схема базы Teachers настроена!')
console.log('Свойства добавлены:', Object.keys(data.properties).join(', '))
