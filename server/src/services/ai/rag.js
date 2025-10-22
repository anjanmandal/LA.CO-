import RegDocument from '../../models/RegDocument.js';
import RegRequirement from '../../models/RegRequirement.js';
import { embed, cosine } from './embed.js';
import { openai } from './openai.js';

// Retrieve top-k chunks by cosine similarity
export async function retrieve({ query, k=8, filters={} }) {
  const qvec = await embed(query);
  const docs = await RegDocument.find(filters).lean();
  const hits = [];
  for (const d of docs) {
    for (const c of (d.chunks||[])) {
      if (!c.embedding) continue;
      hits.push({
        score: cosine(qvec, c.embedding),
        docId: d._id, title: d.title,
        citation: c.citation || d.sourceUrl || d.title,
        section: c.section, text: c.text
      });
    }
  }
  hits.sort((a,b)=>b.score-a.score);
  return hits.slice(0, k);
}

export async function answerWithCitations({ question, orgContext, sector, jurisdiction='LA' }) {
  let retrieved = await retrieve({
    query: `${question}\nContext: sector=${sector||'any'}, jurisdiction=${jurisdiction}`,
    k: 8,
    filters: { jurisdiction, ...(sector?{ sector }:{}) }
  });

  if (!retrieved.length) {
    // fallback: broaden search without sector filter, then without jurisdiction
    retrieved = await retrieve({ query: question, k: 8, filters: { jurisdiction } });
  }
  if (!retrieved.length) {
    retrieved = await retrieve({ query: question, k: 8, filters: {} });
  }

  if (!retrieved.length) {
    const reqQuery = sector ? { sector } : {};
    const fallbackReqs = await RegRequirement.find(reqQuery)
      .select('title description rrule dueTimeLocal citations code jurisdiction')
      .lean();

    const generalMessages = [
      {
        role: 'system',
        content: [
          'You are a compliance assistant focused on U.S. carbon capture and storage projects.',
          'Provide practical guidance related to Class VI wells, CO₂ injection, monitoring, reporting, and pipeline integrity.',
          'When explicit evidence is missing, give your best-effort answer grounded in common CCUS regulatory practice, clearly stating that it is general guidance requiring verification.'
        ].join(' ')
      },
      {
        role: 'user',
        content: `Question: ${question}`
      },
    ];

    let generalText = '';
    try {
      const generalResp = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        temperature: 0.4,
        messages: generalMessages,
      });
      generalText = generalResp.choices[0]?.message?.content?.trim() || '';
    } catch (err) {
      generalText = 'General guidance unavailable (OpenAI request failed).';
    }

    return {
      text: generalText,
      refs: []
    };
  }

  const system = [
    'You are Compliance Copilot for Louisiana CCUS.',
    'Use only the Regulatory Evidence provided; never invent facts.',
    'Answer the user question directly with specific actions, dates, quantities, permit numbers, or form titles pulled from the evidence.',
    'If information is missing, explicitly call it out as a TODO rather than guessing.',
    'Present the answer as short bullets, then add a References section that lists the citations you used.',
    'Cite each supporting statement with [^n], where n is the evidence index.',
  ].join('\n');

  const context = retrieved.map((h,i)=>`[${i+1}] (${h.citation}) ${h.text}`).join('\n\n');

  const messages = [
    { role:'system', content: system },
    { role:'user', content:
`Question: ${question}

Organization Context: ${orgContext ? JSON.stringify(orgContext) : 'N/A'}

Regulatory Evidence:
${context}` }
  ];

  const resp = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages,
    temperature: 0.2
  });

  const text = resp.choices[0].message.content;
  const refs = retrieved.map((h,i)=>({ n:i+1, citation:h.citation, title:h.title, section:h.section }));
  return { text, refs };
}
