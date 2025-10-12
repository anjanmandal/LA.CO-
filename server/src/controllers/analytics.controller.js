// server/src/controllers/analytics.controller.js
import EmissionsObservation from '../models/EmissionsObservation.js';
import Facility from '../models/Facility.js';
import OpenAI from 'openai';

// Helper: MAD-based z-score (robust)
function computeAnomalies(points, { z = 3.5 } = {}) {
  // points: [{year, value}]
  const vals = points.map(p => p.value);
  if (vals.length < 5) return [];
  const median = (arr) => {
    const a = [...arr].sort((x,y)=>x-y); const m = Math.floor(a.length/2);
    return a.length % 2 ? a[m] : (a[m-1]+a[m])/2;
  };
  const med = median(vals);
  const absDev = vals.map(v => Math.abs(v - med));
  const mad = median(absDev) || 1e-9;
  const scale = 1.4826 * mad; // approx for normal
  const out = [];
  points.forEach((p, i) => {
    const score = Math.abs((p.value - med) / scale);
    if (score >= z) out.push({ ...p, score });
  });
  return out;
}

export async function detectAnomalies(req, res) {
  // supports: ?facilityId=<id> OR ?sector=<code>
  const z = Number(req.query.z) || 3.5;
  const source = req.query.source || 'reported'; // anomalies in reported by default
  let rows;

  if (req.query.facilityId) {
    rows = await EmissionsObservation.find(
      { facilityId: req.query.facilityId, source },
      { year:1, month:1, co2eTonnes:1 }
    ).lean().sort({ year:1, month:1 });
  } else if (req.query.sector) {
    // aggregate by sector (sum across facilities)
    rows = await EmissionsObservation.aggregate([
      { $match: { source } },
      { $lookup: { from: 'facilities', localField: 'facilityId', foreignField: '_id', as: 'fac' } },
      { $unwind: '$fac' },
      { $lookup: { from: 'sectors', localField: 'fac.sectorId', foreignField: '_id', as: 'sec' } },
      { $unwind: { path:'$sec', preserveNullAndEmptyArrays:true } },
      { $match: { 'sec.code': req.query.sector } },
      { $group: { _id: '$year', value: { $sum: '$co2eTonnes' } } },
      { $project: { _id:0, year:'$_id', value:1 } },
      { $sort: { year:1 } }
    ]);
  } else {
    return res.status(400).json({ error: 'facilityId or sector is required' });
  }

  // collapse monthly to annual
  if (rows[0]?.month != null) {
    const byYear = new Map();
    for (const r of rows) byYear.set(r.year, (byYear.get(r.year) || 0) + r.co2eTonnes);
    rows = [...byYear.entries()].map(([year, value]) => ({ year, value })).sort((a,b)=>a[0]-b[0]);
  } else {
    rows = rows.map(r => ({ year: r.year, value: r.value ?? r.co2eTonnes }));
  }

  const anomalies = computeAnomalies(rows, { z });

  // Optional: LLM explanations (set OPENAI_API_KEY to enable)
  let explanations = [];
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && anomalies.length) {
    const client = new OpenAI({ apiKey });
    const prompt = `You are an MRV analyst. We detected anomalous year-over-year emissions.
Series (year,value tonnes): ${rows.map(p=>`${p.year}:${Math.round(p.value)}`).join(', ')}
Anomalies: ${anomalies.map(a=>`${a.year} (score ${a.score.toFixed(2)})`).join(', ')}

In 3 bullets, propose likely causes (e.g., measurement method change, shutdown, fuel switch, data gap) and what to check next. Keep it concise.`;
    try {
      const chat = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 220
      });
      explanations = chat.choices?.[0]?.message?.content ?? '';
    } catch (e) {
      explanations = `LLM explain failed: ${String(e.message || e)}`;
    }
  }

  res.json({ source, z, points: rows, anomalies, explanations });
}
