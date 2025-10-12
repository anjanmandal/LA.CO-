import { chatJSON } from '../lib/openai.js';

export const mapColumns = async (req, res) => {
  const { headers } = req.body; // array of strings
  if (!Array.isArray(headers) || headers.length === 0) {
    return res.status(400).json({ error: 'headers array required' });
  }
  const sys =
    "You map messy CSV column names to schema keys: facility_name, year, month, co2e_tonnes, scope, source, method, dataset_version. Return JSON {mapping:{inputHeader:schemaKey|null}, notes}";
  const out = await chatJSON(sys, `Headers:\n${JSON.stringify(headers)}`);
  res.json(out);
};
