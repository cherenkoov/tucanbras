const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID  = process.env.NOTION_TEACHERS_DB_ID;

function formatSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object') return '';
  return Object.entries(schedule).map(([day, slots]) => {
    if (slots === 'unavailable' || !Array.isArray(slots) || !slots.length)
      return `${day}: недоступен`;
    const times = slots.map(s => `${s.from}:00–${s.to}:00`).join(', ');
    return `${day}: ${times}`;
  }).join('\n');
}

function buildProperties(data) {
  const props = {};

  if (data.fullName !== undefined)
    props.fullName = { title: [{ text: { content: data.fullName || '' } }] };
  if (data.fullName_en !== undefined)
    props.fullName_en = { rich_text: [{ text: { content: data.fullName_en || '' } }] };
  if (data.fullName_pt !== undefined)
    props.fullName_pt = { rich_text: [{ text: { content: data.fullName_pt || '' } }] };
  if (data.imageUrl !== undefined)
    props.imageUrl = { url: data.imageUrl || null };
  if (data.gender !== undefined)
    props.gender = { select: data.gender ? { name: data.gender } : null };
  if (data.age !== undefined)
    props.age = { number: data.age || null };
  if (data.timezone !== undefined)
    props.timezone = { rich_text: [{ text: { content: data.timezone || '' } }] };
  if (data.nativeLanguage !== undefined)
    props.nativeLanguage = { rich_text: [{ text: { content: data.nativeLanguage || '' } }] };
  if (data.languages !== undefined)
    props.languages = {
      multi_select: (data.languages || []).map(l => ({ name: l.code || l })),
    };
  if (data.experience !== undefined)
    props.experience = { number: data.experience || null };
  if (data.specializations !== undefined)
    props.specializations = {
      multi_select: (data.specializations || []).map(s => ({ name: s })),
    };
  if (data.specializations_en !== undefined)
    props.specializations_en = {
      rich_text: [{ text: { content: (data.specializations_en || []).join(' | ') } }],
    };
  if (data.specializations_pt !== undefined)
    props.specializations_pt = {
      rich_text: [{ text: { content: (data.specializations_pt || []).join(' | ') } }],
    };
  if (data.interests !== undefined)
    props.interests = {
      multi_select: (data.interests || []).map(i => ({ name: i })),
    };
  if (data.interests_en !== undefined)
    props.interests_en = {
      rich_text: [{ text: { content: (data.interests_en || []).join(' | ') } }],
    };
  if (data.interests_pt !== undefined)
    props.interests_pt = {
      rich_text: [{ text: { content: (data.interests_pt || []).join(' | ') } }],
    };
  if (data.quote !== undefined)
    props.quote = { rich_text: [{ text: { content: data.quote || '' } }] };
  if (data.quote_en !== undefined)
    props.quote_en = { rich_text: [{ text: { content: data.quote_en || '' } }] };
  if (data.quote_pt !== undefined)
    props.quote_pt = { rich_text: [{ text: { content: data.quote_pt || '' } }] };
  if (data.contacts !== undefined) {
    const methods = (data.contacts || []).map(c => ({ name: c.type }));
    const links = Object.fromEntries((data.contacts || []).map(c => [c.type, c.value]));
    props.contactMethods = { multi_select: methods };
    props.contactLinks   = { rich_text: [{ text: { content: JSON.stringify(links) } }] };
  }

  return props;
}

async function createTeacherPage(anketaData) {
  if (!DB_ID) throw new Error('NOTION_TEACHERS_DB_ID не задан');
  const page = await notion.pages.create({
    parent: { database_id: DB_ID },
    properties: {
      ...buildProperties(anketaData),
      isPublished: { checkbox: true },
    },
  });
  return page.id;
}

async function updateTeacherPage(notionPageId, anketaData) {
  if (!notionPageId) return;
  await notion.pages.update({
    page_id: notionPageId,
    properties: buildProperties(anketaData),
  });
}

async function updateScheduleInNotion(notionPageId, schedule) {
  if (!notionPageId) return;
  const text = formatSchedule(schedule);
  await notion.pages.update({
    page_id: notionPageId,
    properties: {
      schedule: { rich_text: [{ text: { content: text } }] },
    },
  });
}

module.exports = { createTeacherPage, updateTeacherPage, updateScheduleInNotion };
