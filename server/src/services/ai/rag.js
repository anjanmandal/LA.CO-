import RegDocument from '../../models/RegDocument.js';
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
  const retrieved = await retrieve({
    query: `${question}\nContext: sector=${sector||'any'}, jurisdiction=${jurisdiction}`,
    k: 8,
    filters: { jurisdiction, ...(sector?{ sector }:{}) }
  });

  const system = [
    'You are Compliance Copilot for Louisiana CCUS.',
    'Answer with concise, practical steps and **list due dates**.',
    'Cite sources using [^n] and include a References section with the citation text.',
    'If unsure, say what is unclear and what evidence would resolve it.',
  ].join(' ');

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
