import mongoose from 'mongoose';
import dotenv from 'dotenv'; dotenv.config();

import FilingTemplate from '../src/models/FilingTemplate.js';
import RegRequirement from '../src/models/RegRequirement.js';

await mongoose.connect(process.env.MONGODB_URI);

const tmpl = await FilingTemplate.create({
  name: 'Annual MRV Report',
  description: 'Operator annual monitoring, reporting, and verification filing.',
  fields: [
    { key:'reporting_year', label:'Reporting Year', type:'number', required:true, pattern:'^\\d{4}$' },
    { key:'capture_tonnes', label:'CO₂ Captured (tCO₂e)', type:'number', required:true },
    { key:'stored_tonnes', label:'CO₂ Stored (tCO₂e)', type:'number', required:true },
    { key:'method', label:'Methodology', type:'select', options:['Measured','Calculated','Estimated'], required:true },
    { key:'notes', label:'Notes', type:'multiline' }
  ],
  attachments: [
    { key:'mrv_plan', label:'MRV Plan PDF', required:true },
    { key:'data_export', label:'Emissions/Flow CSV', required:false }
  ],
  aiValidationHint: 'Check that stored_tonnes <= capture_tonnes and year looks reasonable.'
});

await RegRequirement.create({
  code: 'LDNR-MRV-ANNUAL-001',
  title: 'Annual MRV Report (LDNR)',
  jurisdiction: 'LA',
  sector: null,
  description: 'Annual monitoring, reporting, and verification filing to LDNR.',
  rrule: 'FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=31', // due Mar 31
  dueTimeLocal: '17:00',
  filingTemplateId: tmpl._id,
  citations: ['https://example.la.gov/mrv#annual']
});

console.log('Seeded compliance templates + requirement');
process.exit(0);
