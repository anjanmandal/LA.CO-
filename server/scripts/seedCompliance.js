import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Please define it in server/.env before running the seed script.');
  process.exit(1);
}

import FilingTemplate from '../src/models/FilingTemplate.js';
import RegRequirement from '../src/models/RegRequirement.js';
import CcusProject from '../src/models/CcusProject.js';
import Facility from '../src/models/Facility.js';
import ComplianceTask from '../src/models/ComplianceTask.js';
import Submission from '../src/models/Submission.js';

await mongoose.connect(process.env.MONGODB_URI);

const projectNames = [
  'Red Trail Energy Class VI',
  'Blue Flint Sequester Class VI',
  'STRATOS DAC + Storage (Ector County, TX)',
  'Donaldsonville CCS (CF capture → EnLink transport → ExxonMobil storage)',
  'Air Products Louisiana Clean Energy Complex (Ascension Parish)',
  'Hackberry Carbon Sequestration (Cameron Parish)',
];

const templates = [
  {
    key: 'subpartRRAnnual',
    name: 'EPA Subpart RR Annual Monitoring Report',
    description: 'Annual carbon sequestration submission for EPA Subpart RR Class VI storage sites covering stored volumes, monitoring, and corrective action.',
    fields: [
      { key: 'reporting_year', label: 'Reporting Year', type: 'number', required: true, pattern: '^\\d{4}$', help: 'Calendar year (YYYY) covered by this AMR.' },
      { key: 'project_name', label: 'Project Name', type: 'select', options: projectNames, required: true },
      { key: 'class_vi_permits', label: 'Class VI Permit Numbers', type: 'multiline', required: true },
      { key: 'stored_tonnes', label: 'Stored CO₂ (metric tonnes)', type: 'number', required: true },
      { key: 'monitoring_summary', label: 'Monitoring & Verification Summary', type: 'multiline', required: true },
      { key: 'corrective_actions', label: 'Corrective Actions and Non-compliances', type: 'multiline' },
      { key: 'financial_assurance', label: 'Financial Assurance Update', type: 'multiline' },
    ],
    attachments: [
      { key: 'amr_pdf', label: 'Filed AMR (PDF)', required: true },
      { key: 'data_tables', label: 'EPA Subpart RR Data Tables (ZIP/CSV)', required: true },
      { key: 'pressure_plots', label: 'Reservoir Pressure Plots', required: false },
    ],
    aiValidationHint: 'Cross-check stored_tonnes with CcusReading annual totals and flag deviations greater than 5%.',
  },
  {
    key: 'ndClassViMonthly',
    name: 'ND DMR Class VI Monthly CO₂ Injection Report',
    description: 'Monthly North Dakota Department of Mineral Resources reporting for Class VI projects including injected volumes and pressure data.',
    fields: [
      { key: 'reporting_month', label: 'Reporting Month', type: 'date', required: true, help: 'Use the last day of the month covered.' },
      { key: 'project_name', label: 'Project', type: 'select', options: projectNames, required: true },
      { key: 'well_id', label: 'Injection Well ID', required: true },
      { key: 'volume_tonnes', label: 'Injected CO₂ (t)', type: 'number', required: true },
      { key: 'max_pressure', label: 'Max Wellhead Pressure (psi)', type: 'number', required: true },
      { key: 'annulus_pressure', label: 'Annulus Pressure (psi)', type: 'number' },
      { key: 'mit_notes', label: 'Mechanical Integrity Notes', type: 'multiline' },
    ],
    attachments: [
      { key: 'dmr_form', label: 'ND DMR Monthly Form (PDF)', required: true },
      { key: 'pressure_logs', label: 'Pressure / Annulus Logs (CSV)', required: false },
    ],
    aiValidationHint: 'Compare volume_tonnes with CcusInjection entries for the same month and flag gaps larger than 1%.',
  },
  {
    key: 'laClassViQuarterly',
    name: 'LDENR Class VI Quarterly Storage Report',
    description: 'Quarterly storage and monitoring submission to Louisiana Department of Energy & Natural Resources for Class VI projects.',
    fields: [
      { key: 'reporting_quarter', label: 'Reporting Quarter', type: 'select', options: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },
      { key: 'project_name', label: 'Project', type: 'select', options: projectNames, required: true },
      { key: 'storage_zone', label: 'Storage Zone / Formation', required: true },
      { key: 'volume_tonnes', label: 'Stored CO₂ (t)', type: 'number', required: true },
      { key: 'pressure_trends', label: 'Reservoir Pressure Trends', type: 'multiline', required: true },
      { key: 'mit_activity', label: 'Mechanical Integrity Activity', type: 'multiline' },
      { key: 'community_engagement', label: 'Community Engagement Notes', type: 'multiline' },
    ],
    attachments: [
      { key: 'quarterly_report', label: 'LDENR Quarterly Report (PDF)', required: true },
      { key: 'pressure_figures', label: 'Pressure / MIT Figures (PDF)', required: false },
    ],
    aiValidationHint: 'Ensure volume_tonnes matches aggregated injections for the quarter and reference any LDENR directives in mit_activity.',
  },
  {
    key: 'txClassViConstruction',
    name: 'Texas Class VI Construction & Injection Progress Report',
    description: 'Monthly construction and readiness reporting to the Texas Railroad Commission for Class VI carbon storage projects.',
    fields: [
      { key: 'reporting_month', label: 'Reporting Month', type: 'date', required: true },
      { key: 'project_name', label: 'Project', type: 'select', options: projectNames, required: true },
      { key: 'construction_status', label: 'Construction Status Summary', type: 'multiline', required: true },
      { key: 'well_activity', label: 'Well Activity / MIT', type: 'multiline' },
      { key: 'anticipated_start', label: 'Anticipated Injection Start', type: 'date' },
      { key: 'issues', label: 'Regulatory Issues or Variances', type: 'multiline' },
    ],
    attachments: [
      { key: 'progress_report', label: 'Monthly Progress Report (PDF)', required: true },
      { key: 'supporting_docs', label: 'Supporting Documents (ZIP)', required: false },
    ],
    aiValidationHint: 'Flag if anticipated_start slips by more than one quarter or if well_activity omits required MIT milestones.',
  },
  {
    key: 'phmsaPipelineAnnual',
    name: 'PHMSA CO₂ Pipeline Annual Integrity Report',
    description: 'Annual integrity and incident reporting for CO₂ transmission pipelines (PHMSA Form 7100.2-1).',
    fields: [
      { key: 'reporting_year', label: 'Reporting Year', type: 'number', required: true, pattern: '^\\d{4}$' },
      { key: 'operator_name', label: 'Pipeline Operator', required: true },
      { key: 'pipeline_name', label: 'Pipeline Segment', required: true },
      { key: 'miles_in_service', label: 'Miles In Service', type: 'number', required: true },
      { key: 'incidents', label: 'Reportable Incidents', type: 'number', required: true },
      { key: 'corrective_actions', label: 'Corrective Actions', type: 'multiline' },
    ],
    attachments: [
      { key: 'form_7100', label: 'PHMSA Form 7100.2-1 (PDF)', required: true },
      { key: 'integrity_docs', label: 'Integrity Assessment Records (ZIP)', required: false },
    ],
    aiValidationHint: 'If incidents > 0 ensure corrective_actions describes remediation and reference any related CcusAlert entries.',
  },
];

const templateNames = templates.map((tpl) => tpl.name);
const templatePurge = await FilingTemplate.deleteMany({ name: { $in: templateNames } });

const templateDocs = {};
for (const def of templates) {
  const doc = await FilingTemplate.findOneAndUpdate(
    { name: def.name },
    {
      $set: {
        description: def.description,
        fields: def.fields,
        attachments: def.attachments,
        aiValidationHint: def.aiValidationHint,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  templateDocs[def.key] = doc;
}

const templateById = Object.fromEntries(
  Object.values(templateDocs).map((doc) => [String(doc._id), doc])
);

const projects = await CcusProject.find({ name: { $in: projectNames } })
  .select('_id name organizationId')
  .lean();
const projectByName = Object.fromEntries(projects.map((p) => [p.name, p]));

const facilities = await Facility.find({
  name: {
    $in: [
      'Red Trail Energy Ethanol Plant (Richardton, ND)',
      'Blue Flint Ethanol / Sequester (Underwood, ND)',
      'CF Donaldsonville Ammonia Complex',
      'STRATOS DAC (Ector County, TX)',
    ],
  },
}).select('_id name').lean();
const facilityByName = Object.fromEntries(facilities.map((f) => [f.name, f]));

const slugify = (input = '') =>
  String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';

const requirements = [
  {
    code: 'ND-DMR-CLASSVI-MONTHLY-RTE',
    title: 'ND DMR Class VI Monthly CO₂ Injection – Red Trail Energy',
    jurisdiction: 'ND',
    sector: 'ccus',
    description: 'Red Trail Energy must submit monthly RTE-10 injection volumes and pressures to the North Dakota Department of Mineral Resources Class VI program (NDAC 43-05-01).',
    rrule: 'FREQ=MONTHLY;BYMONTHDAY=20',
    dueTimeLocal: '17:00',
    templateKey: 'ndClassViMonthly',
    citations: [
      'https://www.dmr.nd.gov/dmr/sites/www/files/documents/Oil%20and%20Gas/Class%20VI/CO2%20Reporting/Website%20CO2%20Volume%20Reporting_Red%20Trail.pdf',
    ],
    projectNames: ['Red Trail Energy Class VI'],
    facilityNames: ['Red Trail Energy Ethanol Plant (Richardton, ND)'],
  },
  {
    code: 'ND-DMR-CLASSVI-MONTHLY-BF',
    title: 'ND DMR Class VI Monthly CO₂ Injection – Blue Flint Sequester',
    jurisdiction: 'ND',
    sector: 'ccus',
    description: 'Blue Flint Sequester Co. must report monthly BFS-01 injection totals, pressures, and MIT notes to the ND DMR Class VI program.',
    rrule: 'FREQ=MONTHLY;BYMONTHDAY=20',
    dueTimeLocal: '17:00',
    templateKey: 'ndClassViMonthly',
    citations: [
      'https://www.dmr.nd.gov/dmr/sites/www/files/documents/Oil%20and%20Gas/Class%20VI/CO2%20Reporting/Website%20CO2%20Volume%20Reporting_Blue%20Flint.pdf',
    ],
    projectNames: ['Blue Flint Sequester Class VI'],
    facilityNames: ['Blue Flint Ethanol / Sequester (Underwood, ND)'],
  },
  {
    code: 'EPA-RR-ANNUAL-RTE',
    title: 'EPA Subpart RR Annual Monitoring Report – Red Trail Energy',
    jurisdiction: 'US',
    sector: 'ccus',
    description: 'Annual EPA Subpart RR monitoring report covering stored CO₂, plume surveillance, and corrective actions for the Red Trail Energy Class VI project.',
    rrule: 'FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=31',
    dueTimeLocal: '17:00',
    templateKey: 'subpartRRAnnual',
    citations: [
      'https://www.epa.gov/ghgreporting/subpart-rr-annual-monitoring-reports',
    ],
    projectNames: ['Red Trail Energy Class VI'],
  },
  {
    code: 'EPA-RR-ANNUAL-BF',
    title: 'EPA Subpart RR Annual Monitoring Report – Blue Flint Sequester',
    jurisdiction: 'US',
    sector: 'ccus',
    description: 'EPA Subpart RR annual monitoring and verification report for Blue Flint Sequester, documenting stored CO₂ and monitoring activity.',
    rrule: 'FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=31',
    dueTimeLocal: '17:00',
    templateKey: 'subpartRRAnnual',
    citations: [
      'https://www.epa.gov/system/files/documents/2024-10/2023_blue_flint_sequester_company_llc_mrv_report.pdf',
    ],
    projectNames: ['Blue Flint Sequester Class VI'],
  },
  {
    code: 'LDENR-CLASSVI-QUARTERLY-CF',
    title: 'LDENR Class VI Quarterly Storage Report – Donaldsonville CCS',
    jurisdiction: 'LA',
    sector: 'ccus',
    description: 'Quarterly storage and monitoring report for CF Industries’ Donaldsonville CCS project required by LDENR Injection & Mining Division as part of the Class VI permit.',
    rrule: 'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=30',
    dueTimeLocal: '17:00',
    templateKey: 'laClassViQuarterly',
    citations: [
      'https://www.denr.louisiana.gov/page/permits-and-applications',
      'https://www.cfindustries.com/newsroom/2025/donaldsonvilleccs',
    ],
    projectNames: ['Donaldsonville CCS (CF capture → EnLink transport → ExxonMobil storage)'],
    facilityNames: ['CF Donaldsonville Ammonia Complex'],
  },
  {
    code: 'LDENR-CLASSVI-QUARTERLY-HACKBERRY',
    title: 'LDENR Class VI Quarterly Storage Report – Hackberry Carbon Sequestration',
    jurisdiction: 'LA',
    sector: 'ccus',
    description: 'Quarterly status and monitoring update required by LDENR IMD Order 2025-04 GS for the Hackberry Carbon Sequestration Class VI project.',
    rrule: 'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=30',
    dueTimeLocal: '17:00',
    templateKey: 'laClassViQuarterly',
    citations: [
      'https://www.denr.louisiana.gov/page/permits-and-applications',
    ],
    projectNames: ['Hackberry Carbon Sequestration (Cameron Parish)'],
  },
  {
    code: 'TX-RRC-CLASSVI-MONTHLY-STRATOS',
    title: 'Texas RRC Class VI Construction Progress – STRATOS DAC + Storage',
    jurisdiction: 'TX',
    sector: 'ccus',
    description: 'Monthly construction and readiness report for the STRATOS DAC Class VI permits issued by the Texas Railroad Commission.',
    rrule: 'FREQ=MONTHLY;BYMONTHDAY=15',
    dueTimeLocal: '17:00',
    templateKey: 'txClassViConstruction',
    citations: [
      'https://www.rrc.texas.gov/oil-and-gas/environmental-activities/co2-geologic-storage/',
      'https://www.oxy.com/news/news-releases/occidental-and-1pointfive-secure-class-vi-permits-for-stratos-direct-air-capture-facility/',
    ],
    projectNames: ['STRATOS DAC + Storage (Ector County, TX)'],
    facilityNames: ['STRATOS DAC (Ector County, TX)'],
  },
  {
    code: 'PHMSA-CO2-ANNUAL-ENLINK',
    title: 'PHMSA CO₂ Pipeline Annual Integrity Report – EnLink Donaldsonville',
    jurisdiction: 'US',
    sector: 'transport',
    description: 'Annual PHMSA Form 7100.2-1 integrity reporting for the EnLink Donaldsonville CO₂ transmission line supporting the CF Industries sequestration project.',
    rrule: 'FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15',
    dueTimeLocal: '17:00',
    templateKey: 'phmsaPipelineAnnual',
    citations: [
      'https://www.phmsa.dot.gov/forms/pipeline-safety-forms',
    ],
    projectNames: ['Donaldsonville CCS (CF capture → EnLink transport → ExxonMobil storage)'],
    facilityNames: ['CF Donaldsonville Ammonia Complex'],
  },
];

const requirementCodes = requirements.map((req) => req.code);
const requirementPurge = await RegRequirement.deleteMany({ code: { $in: requirementCodes } });

for (const req of requirements) {
  const template = templateDocs[req.templateKey];
  if (!template) {
    console.warn(`Template for key ${req.templateKey} not found. Skipping requirement ${req.code}`);
    continue;
  }

  const missingProjects = (req.projectNames || []).filter((name) => !projectByName[name]);
  if (missingProjects.length) {
    console.warn(`Projects not found for requirement ${req.code}: ${missingProjects.join(', ')}`);
  }

  const missingFacilities = (req.facilityNames || []).filter((name) => !facilityByName[name]);
  if (missingFacilities.length) {
    console.warn(`Facilities not found for requirement ${req.code}: ${missingFacilities.join(', ')}`);
  }

  await RegRequirement.findOneAndUpdate(
    { code: req.code },
    {
      $set: {
        title: req.title,
        jurisdiction: req.jurisdiction,
        sector: req.sector,
        description: req.description,
        rrule: req.rrule,
        dueTimeLocal: req.dueTimeLocal,
        filingTemplateId: template._id,
        citations: req.citations,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

function buildSeedValues(template, project, dueAt, seedIndex) {
  const values = {};
  const projectName = project?.name || 'Seed Project';
  const dateObj = new Date(dueAt || Date.now());
  const isoDate = dateObj.toISOString().slice(0, 10);
  const year = dateObj.getUTCFullYear();
  const baseVolume = 20000 + (seedIndex % 7) * 1375;

  for (const field of template.fields || []) {
    const type = field.type || 'string';
    const key = field.key;
    if (type === 'number') {
      if (/stored|volume|co2|tonne/i.test(key)) {
        values[key] = baseVolume;
      } else if (/pressure/i.test(key)) {
        values[key] = 2200 + (seedIndex % 5) * 35;
      } else if (/incident/i.test(key)) {
        values[key] = 0;
      } else {
        values[key] = seedIndex + 1;
      }
    } else if (type === 'date') {
      if (/anticipated/i.test(key)) {
        const future = new Date(dateObj.getTime() + 90 * 24 * 60 * 60 * 1000);
        values[key] = future.toISOString().slice(0, 10);
      } else {
        values[key] = isoDate;
      }
    } else if (type === 'select') {
      const options = field.options || [];
      if (/project/i.test(key) && options.includes(projectName)) {
        values[key] = projectName;
      } else if (/quarter/i.test(key) && options.length) {
        values[key] = options[seedIndex % options.length];
      } else if (options.length) {
        values[key] = options[0];
      } else {
        values[key] = projectName;
      }
    } else if (type === 'multiline') {
      values[key] = `${projectName}: seeded ${field.label || key} entry for ${isoDate}.`;
    } else {
      if (/year/.test(key)) {
        values[key] = String(year);
      } else if (/project/.test(key)) {
        values[key] = projectName;
      } else if (/permit/.test(key)) {
        values[key] = `${slugify(projectName).toUpperCase()}-PERMIT-${year}`;
      } else {
        values[key] = `${projectName} ${field.label || key}`;
      }
    }
  }

  return values;
}

const requirementDocs = await RegRequirement.find({ code: { $in: requirementCodes } })
  .select('_id code title filingTemplateId')
  .lean();

let seededSubmitted = 0;
let seededRejected = 0;
let seededSubmissionDocs = 0;
let seededRejectedSubs = 0;

if (!requirementDocs.length || !projects.length) {
  console.warn('Skipping compliance task seeding (missing requirements or projects).');
} else {
  await Promise.all([
    ComplianceTask.deleteMany({ generatedBy: 'seed' }),
    Submission.deleteMany({ 'validation.model': 'seed' }),
  ]);

  const tasks = [];
  const taskContexts = [];
  const totalTasks = 10;
  const now = new Date();

  let i = 0;
  while (tasks.length < totalTasks && i < totalTasks * 4) {
    const requirement = requirementDocs[i % requirementDocs.length];
    const project = projects[i % projects.length];
    i++;
    if (!requirement || !project?.organizationId) continue;

    const template = templateById[String(requirement.filingTemplateId)];
    if (!template) continue;

    const idx = tasks.length;
    const dueAt = new Date(now.getTime() + (idx + 1) * 7 * 24 * 60 * 60 * 1000);
    const owner = `compliance+${slugify(project.name)}@example.com`;
    const status = idx < 5 ? 'submitted' : 'rejected';

    const audit = [
      { action: 'created', actor: 'seed', meta: { requirement: requirement.code } },
    ];

    if (status === 'rejected') {
      audit.push({ action: 'submitted', actor: 'seed', meta: { submittedAt: dueAt.toISOString() } });
    }

    audit.push({ action: 'status_changed', actor: 'seed', meta: { status } });

    tasks.push({
      orgId: project.organizationId,
      requirementId: requirement._id,
      title: `${requirement.title} – ${project.name}`,
      owner,
      dueAt,
      status,
      priority: status === 'rejected' ? 'high' : 'med',
      generatedBy: 'seed',
      audit,
    });

    taskContexts.push({ template, project, requirement, seedIndex: idx });

    if (status === 'submitted') seededSubmitted += 1;
    else seededRejected += 1;
  }

  const createdTasks = tasks.length ? await ComplianceTask.insertMany(tasks) : [];

  if (createdTasks.length) {
    const submissionsToInsert = [];

    createdTasks.forEach((taskDoc, index) => {
      const context = taskContexts[index];
      if (!context) return;
      if (!['submitted', 'rejected'].includes(taskDoc.status)) return;

      const values = buildSeedValues(context.template, context.project, taskDoc.dueAt, context.seedIndex);
      submissionsToInsert.push({
        orgId: taskDoc.orgId,
        templateId: context.template._id,
        taskId: taskDoc._id,
        values,
        files: [],
        validation: {
          ok: taskDoc.status === 'submitted',
          messages: [taskDoc.status === 'submitted' ? 'seed: validation passes' : 'seed: regulator requested fixes'],
          model: 'seed',
        },
        status: taskDoc.status,
      });
    });

    if (submissionsToInsert.length) {
      const createdSubs = await Submission.insertMany(submissionsToInsert);
      for (const sub of createdSubs) {
        await ComplianceTask.updateOne({ _id: sub.taskId }, { $set: { submissionId: sub._id } });
        if (sub.status === 'submitted') seededSubmissionDocs += 1;
        else if (sub.status === 'rejected') seededRejectedSubs += 1;
      }
    }
  }
}

if (templatePurge.deletedCount || requirementPurge.deletedCount) {
  // noop logging removed for production readiness
}
process.exit(0);
