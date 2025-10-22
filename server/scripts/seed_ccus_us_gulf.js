// scripts/seed_ccus_us_gulf.js
// Seed authoritative CCUS data for key Gulf Coast projects.
// Wipes existing CCUS/Facility/Organization docs before inserting the curated dataset.

import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv({ path: path.join(__dirname, '../.env') });

import Organization from '../src/models/Organization.js';
import Facility from '../src/models/Facility.js';
import CcusProject from '../src/models/CcusProject.js';
import CcusWell from '../src/models/CcusWell.js';
import CcusPermit from '../src/models/CcusPermit.js';
import CcusReading from '../src/models/CcusReading.js';
import CcusInjection from '../src/models/CcusInjection.js';
import CcusPipe from '../src/models/CcusPipe.js';
import CcusAlert from '../src/models/CcusAlert.js';
import IntensityStat from '../src/models/IntensityStat.js';

// ⬇️ Add capture model
import EmissionsObservation from '../src/models/EmissionsObservation.js';

const SOURCE_REPORTED = 'reported';
const SOURCE_OBSERVED = 'observed';

const id = () => new mongoose.Types.ObjectId();

const ids = {
  org: {
    RTE: id(),
    BF: id(),
    ADM: id(),
    XOM: id(),
    OXY: id(),
    CF: id(),
    ENLINK: id(),
    AIRP: id(),
    SEMPRA: id(),
    TX_RRC: id(),
    MS_OGB: id(),
    LA_DENR: id(),
  },
  facility: {
    // existing
    STRATOS_DAC: id(),
    JACKSON_DOME: id(),
    CRANFIELD_AREA: id(),
    CF_DON: id(),
    AIRP_ASC: id(),
    // ⬇️ new (integrated ethanol plants so capture==storage)
    RTE_ETHANOL: id(),
    BF_ETHANOL: id(),
  },
  project: {
    RTE: id(),
    BF: id(),
    TX_STRATOS: id(),
    MS_EOR_STATE: id(),
    MS_CRANFIELD: id(),
    LA_CF_DON: id(),
    LA_AIRP: id(),
    LA_HACKBERRY: id(),
  },
  well: {
    RTE_10: id(),
    BF_01: id(),
    TX_STRATOS_INJ1: id(),
    MS_CRANFIELD_INJ1: id(),
    LA_CF_INJ1: id(),
    LA_HCS_001: id(),
  },
  permit: {
    RTE_VI: id(),
    BF_VI: id(),
    TX_STRATOS_VI: id(),
    MS_STATE: id(),
    MS_CRANFIELD_II: id(),
    LA_CF_VI: id(),
    LA_HCS_VI: id(),
  },
  pipe: {
    CF_ENLINK: id(),
  },
};

const stamp = () => ({ createdAt: new Date(), updatedAt: new Date() });

/* =========================
   ORGANIZATIONS
========================= */
const organizations = [
  { _id: ids.org.RTE, name: 'Red Trail Energy', slug: 'red-trail-energy', orgType: 'operator' },
  { _id: ids.org.BF, name: 'Blue Flint Sequester Co.', slug: 'blue-flint-sequester', orgType: 'operator' },
  { _id: ids.org.ADM, name: 'Archer Daniels Midland (ADM)', slug: 'adm', orgType: 'operator' },
  { _id: ids.org.XOM, name: 'ExxonMobil', slug: 'exxonmobil', orgType: 'operator' },
  { _id: ids.org.OXY, name: 'Occidental / 1PointFive', slug: 'occidental-1pointfive', orgType: 'operator' },
  { _id: ids.org.CF, name: 'CF Industries', slug: 'cf-industries', orgType: 'operator' },
  { _id: ids.org.ENLINK, name: 'EnLink Midstream', slug: 'enlink-midstream', orgType: 'operator' },
  { _id: ids.org.AIRP, name: 'Air Products', slug: 'air-products', orgType: 'operator' },
  { _id: ids.org.SEMPRA, name: 'Sempra Infrastructure', slug: 'sempra-infrastructure', orgType: 'operator' },
  { _id: ids.org.TX_RRC, name: 'Texas Railroad Commission (RRC)', slug: 'tx-rrc', orgType: 'regulator' },
  { _id: ids.org.MS_OGB, name: 'Mississippi State Oil & Gas Board', slug: 'ms-ogb', orgType: 'regulator' },
  { _id: ids.org.LA_DENR, name: 'Louisiana Dept. of Energy & Natural Resources', slug: 'la-denr', orgType: 'regulator' },
].map((o) => ({ ...o, ...stamp() }));

/* =========================
   FACILITIES
========================= */
const facilities = [
  {
    _id: ids.facility.STRATOS_DAC,
    externalRef: 'STRATOS-DAC-001',
    name: 'STRATOS DAC (Ector County, TX)',
    organizationId: ids.org.OXY,
    location: { type: 'Point', coordinates: [-102.403, 31.928] },
    meta: { captureType: 'DAC', note: 'On-site capture with Class VI storage in development.' },
  },
  {
    _id: ids.facility.JACKSON_DOME,
    externalRef: 'Jackson-Dome-CO2',
    name: 'Jackson Dome CO₂ Source Field (MS)',
    organizationId: ids.org.XOM,
    location: { type: 'Point', coordinates: [-90.021, 32.546] },
    meta: { sourceType: 'Natural CO₂', note: 'Primary feed for Mississippi CO₂-EOR network.' },
  },
  {
    _id: ids.facility.CRANFIELD_AREA,
    externalRef: 'Cranfield-Field-Context',
    name: 'Cranfield Field (Emitter Context)',
    organizationId: ids.org.XOM,
    location: { type: 'Point', coordinates: [-91.354, 31.555] },
    meta: { note: 'Field-level context for Cranfield CO₂ injection.' },
  },
  {
    _id: ids.facility.CF_DON,
    externalRef: 'CF-Donaldsonville',
    name: 'CF Donaldsonville Ammonia Complex',
    organizationId: ids.org.CF,
    location: { type: 'Point', coordinates: [-90.992, 30.116] },
    meta: { captureType: 'Process CO₂ (ammonia/urea)' },
  },
  {
    _id: ids.facility.AIRP_ASC,
    externalRef: 'AirProducts-Ascension',
    name: 'Air Products Louisiana Clean Energy Complex (Ascension Parish)',
    organizationId: ids.org.AIRP,
    location: { type: 'Point', coordinates: [-90.94, 30.21] },
    meta: { captureType: 'Blue hydrogen process CO₂', status: 'planned' },
  },
  // ⬇️ new: integrated capture facilities so we can attach EmissionsObservation
  {
    _id: ids.facility.RTE_ETHANOL,
    externalRef: 'RTE-ETH-PLANT',
    name: 'Red Trail Energy Ethanol Plant (Richardton, ND)',
    organizationId: ids.org.RTE,
    location: { type: 'Point', coordinates: [-102.318, 46.888] },
    meta: { captureType: 'Fermentation CO₂', note: 'Integrated: capture & Class VI storage onsite.' },
  },
  {
    _id: ids.facility.BF_ETHANOL,
    externalRef: 'BF-ETH-PLANT',
    name: 'Blue Flint Ethanol / Sequester (Underwood, ND)',
    organizationId: ids.org.BF,
    location: { type: 'Point', coordinates: [-101.332, 47.318] },
    meta: { captureType: 'Fermentation CO₂', note: 'Integrated: capture & Class VI storage onsite.' },
  },
].map((f) => ({ ...f, ...stamp() }));

/* =========================
   PROJECTS
========================= */
const projects = [
  {
    _id: ids.project.RTE,
    name: 'Red Trail Energy Class VI',
    operator: 'Red Trail Energy',
    organizationId: ids.org.RTE,
    classType: 'VI',
    status: 'operational',
    location: { type: 'Point', coordinates: [-102.318, 46.888] },
    geologyTags: ['saline', 'Broom Creek Fm', 'caprock:shale', 'depth:>3000ft'],
    meta: {
      integrated: true,
      references: {
        nd_monthlies_pdf: 'ND DMR CO₂ Volume Reporting – Red Trail',
        rr_amr: 'EPA Subpart RR – RTE AMR',
      },
    },
  },
  {
    _id: ids.project.BF,
    name: 'Blue Flint Sequester Class VI',
    operator: 'Blue Flint Sequester Co.',
    organizationId: ids.org.BF,
    classType: 'VI',
    status: 'operational',
    location: { type: 'Point', coordinates: [-101.332, 47.318] },
    geologyTags: ['saline', 'Broom Creek Fm', 'caprock:shale', 'depth:>3000ft'],
    meta: {
      integrated: true,
      references: {
        nd_monthlies_pdf: 'ND DMR CO₂ Volume Reporting – Blue Flint',
        rr_2023_total: 'EPA AMR 2023 = 29,960.82 t',
      },
    },
  },
  {
    _id: ids.project.TX_STRATOS,
    name: 'STRATOS DAC + Storage (Ector County, TX)',
    operator: 'Occidental / 1PointFive',
    organizationId: ids.org.OXY,
    classType: 'VI',
    status: 'construction',
    location: { type: 'Point', coordinates: [-102.403, 31.928] },
    geologyTags: ['saline', 'caprock:shale', 'depth:>3000ft'],
    meta: { integrated: true, sourceFacilities: [ids.facility.STRATOS_DAC], references: { rrc_class_vi: 'TX RRC Class VI' } },
  },
  {
    _id: ids.project.MS_EOR_STATE,
    name: 'Mississippi CO₂-EOR (statewide baseline)',
    operator: 'Multiple operators',
    organizationId: ids.org.MS_OGB,
    classType: 'II',
    status: 'operational',
    location: { type: 'Point', coordinates: [-90.184, 32.299] },
    geologyTags: ['EOR', 'CO₂', 'legacy-pipelines', 'Jackson Dome source'],
    meta: { integrated: true, sourceFacilities: [ids.facility.JACKSON_DOME], references: { msogb: 'MS OGB Annual Production CO₂' } },
  },
  {
    _id: ids.project.MS_CRANFIELD,
    name: 'Cranfield CO₂-EOR (Natchez, MS)',
    operator: 'ExxonMobil (formerly Denbury assets)',
    organizationId: ids.org.XOM,
    classType: 'II',
    status: 'operational',
    location: { type: 'Point', coordinates: [-91.354, 31.555] },
    geologyTags: ['EOR', 'Lower Tuscaloosa', 'caprock:shale'],
    meta: { integrated: true, sourceFacilities: [ids.facility.JACKSON_DOME], references: { msogb_field: 'MS OGB Production Search' } },
  },
  {
    _id: ids.project.LA_CF_DON,
    name: 'Donaldsonville CCS (CF capture → EnLink transport → ExxonMobil storage)',
    operator: 'CF Industries',
    organizationId: ids.org.CF,
    classType: 'VI',
    status: 'operational',
    location: { type: 'Point', coordinates: [-90.992, 30.116] },
    geologyTags: ['saline', 'caprock:shale', 'depth:>3000ft'],
    meta: {
      integrated: false,
      sourceFacilities: [ids.facility.CF_DON],
      counterparties: [
        { role: 'transport', organizationId: ids.org.ENLINK },
        { role: 'storage', organizationId: ids.org.XOM },
      ],
      references: { startup: 'Sequestration start 2025-07-14; annual totals via EPA FLIGHT (2025 report)' },
    },
  },
  {
    _id: ids.project.LA_AIRP,
    name: 'Air Products Louisiana Clean Energy Complex (Ascension Parish)',
    operator: 'Air Products',
    organizationId: ids.org.AIRP,
    classType: 'VI',
    status: 'permitting',
    location: { type: 'Point', coordinates: [-90.94, 30.21] },
    geologyTags: ['saline', 'caprock:shale', 'depth:>3000ft'],
    meta: { integrated: true, sourceFacilities: [ids.facility.AIRP_ASC], references: { class_vi: 'LA Class VI application under review' } },
  },
  {
    _id: ids.project.LA_HACKBERRY,
    name: 'Hackberry Carbon Sequestration (Cameron Parish)',
    operator: 'Sempra Infrastructure',
    organizationId: ids.org.SEMPRA,
    classType: 'VI',
    status: 'permitting',
    location: { type: 'Point', coordinates: [-93.453353, 30.032023] },
    geologyTags: ['saline', 'caprock:shale', 'depth:~10100ft'],
    meta: { integrated: false, references: { order: 'LDENR IMD 2025-04 GS (first LA Class VI)' } },
  },
].map((p) => ({ ...p, ...stamp() }));

/* =========================
   WELLS
========================= */
const wells = [
  {
    _id: ids.well.RTE_10,
    projectId: ids.project.RTE,
    name: 'RTE-10',
    type: 'injection',
    status: 'injecting',
    surface: { type: 'Point', coordinates: [-102.318, 46.888] },
    formation: 'Broom Creek',
    bottomHoleTVD_ft: 6500,
    maxAllowablePressure_psi: 3000,
  },
  {
    _id: ids.well.BF_01,
    projectId: ids.project.BF,
    name: 'BFS-01',
    type: 'injection',
    status: 'injecting',
    surface: { type: 'Point', coordinates: [-101.332, 47.318] },
    formation: 'Broom Creek',
    bottomHoleTVD_ft: 6400,
    maxAllowablePressure_psi: 3000,
  },
  {
    _id: ids.well.TX_STRATOS_INJ1,
    projectId: ids.project.TX_STRATOS,
    name: 'STRATOS-INJ-1',
    type: 'injection',
    status: 'permitted',
    surface: { type: 'Point', coordinates: [-102.403, 31.928] },
    formation: 'Saline aquifer',
    bottomHoleTVD_ft: 7000,
    maxAllowablePressure_psi: 3200,
  },
  {
    _id: ids.well.MS_CRANFIELD_INJ1,
    projectId: ids.project.MS_CRANFIELD,
    name: 'CRANFIELD-INJ-1',
    type: 'injection',
    status: 'injecting',
    surface: { type: 'Point', coordinates: [-91.354, 31.555] },
    formation: 'Lower Tuscaloosa',
    bottomHoleTVD_ft: 7000,
    maxAllowablePressure_psi: 3000,
  },
  {
    _id: ids.well.LA_CF_INJ1,
    projectId: ids.project.LA_CF_DON,
    name: 'CF-INJ-1',
    type: 'injection',
    status: 'injecting',
    surface: { type: 'Point', coordinates: [-90.995, 30.11] },
    formation: 'Saline aquifer',
    bottomHoleTVD_ft: 6500,
    maxAllowablePressure_psi: 3000,
  },
  {
    _id: ids.well.LA_HCS_001,
    projectId: ids.project.LA_HACKBERRY,
    name: 'Hackberry Well 001',
    type: 'injection',
    status: 'permitted',
    surface: { type: 'Point', coordinates: [-93.453353, 30.032023] },
    formation: 'Saline aquifer',
    bottomHoleTVD_ft: 10100,
    maxAllowablePressure_psi: 3100,
  },
].map((w) => ({ ...w, ...stamp() }));

/* =========================
   PERMITS (provenance links)
========================= */
const permits = [
  {
    _id: ids.permit.RTE_VI,
    projectId: ids.project.RTE,
    wellId: ids.well.RTE_10,
    permitNo: 'ND-ClassVI-RTE-10',
    classType: 'VI',
    status: 'issued',
    documents: [
      { label: 'ND DMR: CO₂ Volume Reporting – Red Trail (monthly PDF)', url: 'https://www.dmr.nd.gov/dmr/sites/www/files/documents/Oil%20and%20Gas/Class%20VI/CO2%20Reporting/Website%20CO2%20Volume%20Reporting_Red%20Trail.pdf' }, // :contentReference[oaicite:0]{index=0}
      { label: 'EPA: Red Trail AMR (Subpart RR)', url: 'https://www.epa.gov/ghgreporting/subpart-rr-annual-monitoring-reports' }, // :contentReference[oaicite:1]{index=1}
    ],
  },
  {
    _id: ids.permit.BF_VI,
    projectId: ids.project.BF,
    wellId: ids.well.BF_01,
    permitNo: 'ND-ClassVI-BFS-01',
    classType: 'VI',
    status: 'issued',
    documents: [
      { label: 'ND DMR: CO₂ Volume Reporting – Blue Flint (monthly PDF)', url: 'https://www.dmr.nd.gov/dmr/sites/www/files/documents/Oil%20and%20Gas/Class%20VI/CO2%20Reporting/Website%20CO2%20Volume%20Reporting_Blue%20Flint.pdf' }, // :contentReference[oaicite:2]{index=2}
      { label: 'EPA: Blue Flint 2023 AMR (Subpart RR)', url: 'https://www.epa.gov/system/files/documents/2024-10/2023_blue_flint_sequester_company_llc_mrv_report.pdf' }, // :contentReference[oaicite:3]{index=3}
    ],
  },
  {
    _id: ids.permit.TX_STRATOS_VI,
    projectId: ids.project.TX_STRATOS,
    wellId: ids.well.TX_STRATOS_INJ1,
    permitNo: 'TX-ClassVI-STRATOS',
    classType: 'VI',
    status: 'issued',
    documents: [
      { label: 'EPA approves Class VI permits (STRATOS)', url: 'https://www.oxy.com/news/news-releases/occidental-and-1pointfive-secure-class-vi-permits-for-stratos-direct-air-capture-facility/' }, // :contentReference[oaicite:4]{index=4}
    ],
  },
  {
    _id: ids.permit.MS_STATE,
    projectId: ids.project.MS_EOR_STATE,
    permitNo: 'MS-OGB-Annual-Production',
    classType: 'II',
    status: 'issued',
    documents: [
      { label: 'MS OGB: Annual Production CO₂', url: 'https://www.ogb.state.ms.us/annprod.php' }, // :contentReference[oaicite:5]{index=5}
    ],
  },
  {
    _id: ids.permit.MS_CRANFIELD_II,
    projectId: ids.project.MS_CRANFIELD,
    wellId: ids.well.MS_CRANFIELD_INJ1,
    permitNo: 'MS-CLASSII-CRANFIELD',
    classType: 'II',
    status: 'issued',
    documents: [
      { label: 'MS OGB: Production / Field search', url: 'https://www.ogb.state.ms.us/' }, // :contentReference[oaicite:6]{index=6}
    ],
  },
  {
    _id: ids.permit.LA_CF_VI,
    projectId: ids.project.LA_CF_DON,
    wellId: ids.well.LA_CF_INJ1,
    permitNo: 'LA-ClassVI-Donaldsonville',
    classType: 'VI',
    status: 'issued',
    documents: [
      { label: 'CF Donaldsonville CCS start-up (2025-07-14)', url: 'https://www.cfindustries.com/newsroom/2025/donaldsonvilleccs' }, // :contentReference[oaicite:7]{index=7}
      { label: 'EPA FLIGHT (Subpart RR portal)', url: 'https://ghgdata.epa.gov/ghgp/main.do' }, // :contentReference[oaicite:8]{index=8}
    ],
  },
  {
    _id: ids.permit.LA_HCS_VI,
    projectId: ids.project.LA_HACKBERRY,
    wellId: ids.well.LA_HCS_001,
    permitNo: 'LDENR-IMD-2025-04-GS',
    classType: 'VI',
    status: 'issued',
    documents: [
      { label: 'Louisiana Class VI program (tracker & locations)', url: 'https://www.denr.louisiana.gov/page/permits-and-applications' }, // :contentReference[oaicite:9]{index=9}
    ],
  },
].map((p) => ({ ...p, ...stamp() }));

/* =========================
   PROJECT-LEVEL READINGS (annual totals)
========================= */
const readings = [
  // Blue Flint (EPA AMR 2023 total)
  { projectId: ids.project.BF, date: new Date('2023-12-31'), captured_tCO2: 0, stored_tCO2: 29960.82, source: 'EPA_AMR_2023' }, // :contentReference[oaicite:10]{index=10}

  // Mississippi statewide CO₂-EOR (exact, from MS OGB -> convert Mcf ÷ 38.2517)
  { projectId: ids.project.MS_EOR_STATE, date: new Date('2020-12-31'), captured_tCO2: 0, stored_tCO2: Math.round(145065202 / 38.2517), source: 'MSOGB_annual' }, // :contentReference[oaicite:11]{index=11}
  { projectId: ids.project.MS_EOR_STATE, date: new Date('2021-12-31'), captured_tCO2: 0, stored_tCO2: Math.round(167499387 / 38.2517), source: 'MSOGB_annual' },
  { projectId: ids.project.MS_EOR_STATE, date: new Date('2022-12-31'), captured_tCO2: 0, stored_tCO2: Math.round(170817128 / 38.2517), source: 'MSOGB_annual' },
  { projectId: ids.project.MS_EOR_STATE, date: new Date('2023-12-31'), captured_tCO2: 0, stored_tCO2: Math.round(163744903 / 38.2517), source: 'MSOGB_annual' },
  { projectId: ids.project.MS_EOR_STATE, date: new Date('2024-12-31'), captured_tCO2: 0, stored_tCO2: Math.round(125427896 / 38.2517), source: 'MSOGB_annual' },

  // Pending annuals (to be overwritten with FLIGHT exports when posted)
  { projectId: ids.project.TX_STRATOS, date: new Date('2025-12-31'), captured_tCO2: 0, stored_tCO2: 0, source: 'pending_FLIGHT' }, // :contentReference[oaicite:12]{index=12}
  { projectId: ids.project.LA_CF_DON, date: new Date('2025-12-31'), captured_tCO2: 0, stored_tCO2: 0, source: 'pending_FLIGHT' }, // :contentReference[oaicite:13]{index=13}
].map((r) => ({ ...r, ...stamp() }));

/* =========================
   WELL-LEVEL INJECTIONS (monthlies; exact from ND DMR PDFs)
========================= */
const injections = [
  // ========== BLUE FLINT SEQUESTER (BFS-01) ==========
  // 2023
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2023-10-31'), volume_tCO2: 459.00,   notes: 'MCF=8,705 (ND DMR monthly 2023-10)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' },   // :contentReference[oaicite:2]{index=2}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2023-11-30'), volume_tCO2: 16280.00, notes: 'MCF=308,761 (ND DMR monthly 2023-11)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:3]{index=3}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2023-12-31'), volume_tCO2: 13221.82, notes: 'MCF=250,760 (ND DMR monthly 2023-12)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:4]{index=4}

  // 2024
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2024-01-31'), volume_tCO2: 13935.85, notes: 'MCF=264,329 (ND DMR monthly 2024-01)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:5]{index=5}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2024-02-29'), volume_tCO2: 11527.87, notes: 'MCF=218,655 (ND DMR monthly 2024-02)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:6]{index=6}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2024-03-31'), volume_tCO2: 15871.07, notes: 'MCF=301,035 (ND DMR monthly 2024-03)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:7]{index=7}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2024-04-30'), volume_tCO2: 14911.06, notes: 'MCF=282,826 (ND DMR monthly 2024-04)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:8]{index=8}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2024-05-31'), volume_tCO2: 3807.44,  notes: 'MCF=72,218 (ND DMR monthly 2024-05)',  source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:9]{index=9}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2024-06-30'), volume_tCO2: 10568.85, notes: 'MCF=200,465 (ND DMR monthly 2024-06)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:10]{index=10}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2024-07-31'), volume_tCO2: 17058.82, notes: 'MCF=323,564 (ND DMR monthly 2024-07)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:11]{index=11}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2024-08-31'), volume_tCO2: 17151.94, notes: 'MCF=325,330 (ND DMR monthly 2024-08)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:12]{index=12}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2024-09-30'), volume_tCO2: 17184.09, notes: 'MCF=325,973 (ND DMR monthly 2024-09)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:13]{index=13}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2024-10-31'), volume_tCO2: 17412.91, notes: 'MCF=330,313 (ND DMR monthly 2024-10)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:14]{index=14}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2024-11-30'), volume_tCO2: 16103.23, notes: 'MCF=305,469 (ND DMR monthly 2024-11)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:15]{index=15}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2024-12-31'), volume_tCO2: 17992.85, notes: 'MCF=341,314 (ND DMR monthly 2024-12)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:16]{index=16}

  // 2025 (Jan–Aug)
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2025-01-31'), volume_tCO2: 18156.81, notes: 'MCF=344,425 (ND DMR monthly 2025-01)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:17]{index=17}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2025-02-28'), volume_tCO2: 15227.83, notes: 'MCF=288,864 (ND DMR monthly 2025-02)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:18]{index=18}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2025-03-31'), volume_tCO2: 16911.70, notes: 'MCF=320,806 (ND DMR monthly 2025-03)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:19]{index=19}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2025-04-30'), volume_tCO2: 16288.12, notes: 'MCF=308,977 (ND DMR monthly 2025-04)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:20]{index=20}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2025-05-31'), volume_tCO2: 12292.63, notes: 'MCF=233,184 (ND DMR monthly 2025-05)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:21]{index=21}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2025-06-30'), volume_tCO2: 15425.20, notes: 'MCF=292,608 (ND DMR monthly 2025-06)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // (you already had) :contentReference[oaicite:22]{index=22}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2025-07-31'), volume_tCO2: 15734.32, notes: 'MCF=298,471 (ND DMR monthly 2025-07)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // (you already had) :contentReference[oaicite:23]{index=23}
  { projectId: ids.project.BF, wellId: ids.well.BF_01, date: new Date('2025-08-31'), volume_tCO2: 17440.73, notes: 'MCF=330,841 (ND DMR monthly 2025-08)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // (you already had) :contentReference[oaicite:24]{index=24}

  // ========== RED TRAIL ENERGY (RTE-10) ==========
  // 2023 (full year)
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2023-01-31'), volume_tCO2: 14274.36, notes: 'MCF=270,723 (ND DMR monthly 2023-01)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:25]{index=25}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2023-02-28'), volume_tCO2: 14030.71, notes: 'MCF=266,102 (ND DMR monthly 2023-02)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:26]{index=26}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2023-03-31'), volume_tCO2: 15235.20, notes: 'MCF=288,946 (ND DMR monthly 2023-03)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:27]{index=27}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2023-04-30'), volume_tCO2: 14591.30, notes: 'MCF=276,734 (ND DMR monthly 2023-04)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:28]{index=28}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2023-05-31'), volume_tCO2: 16160.90, notes: 'MCF=306,502 (ND DMR monthly 2023-05)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:29]{index=29}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2023-06-30'), volume_tCO2: 11045.40, notes: 'MCF=209,483 (ND DMR monthly 2023-06)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:30]{index=30}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2023-07-31'), volume_tCO2: 14653.26, notes: 'MCF=277,909 (ND DMR monthly 2023-07)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:31]{index=31}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2023-08-31'), volume_tCO2: 13241.10, notes: 'MCF=251,126 (ND DMR monthly 2023-08)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:32]{index=32}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2023-09-30'), volume_tCO2: 14979.50, notes: 'MCF=284,097 (ND DMR monthly 2023-09)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:33]{index=33}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2023-10-31'), volume_tCO2: 13684.67, notes: 'MCF=259,539 (ND DMR monthly 2023-10)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:34]{index=34}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2023-11-30'), volume_tCO2: 9568.40,  notes: 'MCF=181,471 (ND DMR monthly 2023-11)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:35]{index=35}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2023-12-31'), volume_tCO2: 13432.80, notes: 'MCF=254,762 (ND DMR monthly 2023-12)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:36]{index=36}

  // 2024 (full year)
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2024-01-31'), volume_tCO2: 14056.97, notes: 'MCF=266,733 (ND DMR monthly 2024-01)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:37]{index=37}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2024-02-29'), volume_tCO2: 13033.59, notes: 'MCF=247,314 (ND DMR monthly 2024-02)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:38]{index=38}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2024-03-31'), volume_tCO2: 14325.65, notes: 'MCF=271,831 (ND DMR monthly 2024-03)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:39]{index=39}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2024-04-30'), volume_tCO2: 12385.06, notes: 'MCF=235,008 (ND DMR monthly 2024-04)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:40]{index=40}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2024-05-31'), volume_tCO2: 15635.05, notes: 'MCF=296,677 (ND DMR monthly 2024-05)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:41]{index=41}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2024-06-30'), volume_tCO2: 12065.59, notes: 'MCF=228,946 (ND DMR monthly 2024-06)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:42]{index=42}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2024-07-31'), volume_tCO2: 15204.59, notes: 'MCF=288,596 (ND DMR monthly 2024-07)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:43]{index=43}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2024-08-31'), volume_tCO2: 15014.54, notes: 'MCF=284,989 (ND DMR monthly 2024-08)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:44]{index=44}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2024-09-30'), volume_tCO2: 14976.95, notes: 'MCF=284,275 (ND DMR monthly 2024-09)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:45]{index=45}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2024-10-31'), volume_tCO2: 15649.79, notes: 'MCF=296,927 (ND DMR monthly 2024-10)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:46]{index=46}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2024-11-30'), volume_tCO2: 15296.72, notes: 'MCF=290,228 (ND DMR monthly 2024-11)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:47]{index=47}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2024-12-31'), volume_tCO2: 15817.95, notes: 'MCF=300,118 (ND DMR monthly 2024-12)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:48]{index=48}

  // 2025 (Jan–Aug)
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2025-01-31'), volume_tCO2: 14980.52, notes: 'MCF=284,201 (ND DMR monthly 2025-01)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:49]{index=49}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2025-02-28'), volume_tCO2: 13538.24, notes: 'MCF=256,838 (ND DMR monthly 2025-02)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:50]{index=50}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2025-03-31'), volume_tCO2: 15198.62, notes: 'MCF=288,338 (ND DMR monthly 2025-03)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:51]{index=51}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2025-04-30'), volume_tCO2: 13556.20, notes: 'MCF=257,179 (ND DMR monthly 2025-04)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:52]{index=52}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2025-05-31'), volume_tCO2: 12847.01, notes: 'MCF=243,725 (ND DMR monthly 2025-05)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // (you added earlier) :contentReference[oaicite:53]{index=53}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2025-06-30'), volume_tCO2: 14754.24, notes: 'MCF=279,908 (ND DMR monthly 2025-06)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // (you added earlier) :contentReference[oaicite:54]{index=54}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2025-07-31'), volume_tCO2: 15380.11, notes: 'MCF=291,898 (ND DMR monthly 2025-07)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // (you added earlier) :contentReference[oaicite:55]{index=55}
  { projectId: ids.project.RTE, wellId: ids.well.RTE_10, date: new Date('2025-08-31'), volume_tCO2: 15034.49, notes: 'MCF=285,339 (ND DMR monthly 2025-08)', source: 'reported', datasetVersion: 'ND-DMR-2025-10-01' }, // new :contentReference[oaicite:56]{index=56}
].map((i) => ({ ...i, ...stamp() }));


/* =========================
   FACILITY-LEVEL CAPTURE (EmissionsObservation)
   — Integrated Class VI: capture ≈ storage (seed as negative Scope 1)
========================= */
const emissions = [
  // ========== BLUE FLINT (Facility: BF_ETHANOL) ==========
  // 2023
  { facilityId: ids.facility.BF_ETHANOL, year: 2023, month: 10, co2eTonnes: -459.00,   scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint monthly 2023-10', datasetVersion: 'ND-DMR-2025-10-01' },   // :contentReference[oaicite:57]{index=57}
  { facilityId: ids.facility.BF_ETHANOL, year: 2023, month: 11, co2eTonnes: -16280.00, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint monthly 2023-11', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:58]{index=58}
  { facilityId: ids.facility.BF_ETHANOL, year: 2023, month: 12, co2eTonnes: -13221.82, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint monthly 2023-12', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:59]{index=59}

  // 2024
  { facilityId: ids.facility.BF_ETHANOL, year: 2024, month: 1, co2eTonnes: -13935.85, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2024-01', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:60]{index=60}
  { facilityId: ids.facility.BF_ETHANOL, year: 2024, month: 2, co2eTonnes: -11527.87, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2024-02', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:61]{index=61}
  { facilityId: ids.facility.BF_ETHANOL, year: 2024, month: 3, co2eTonnes: -15871.07, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2024-03', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:62]{index=62}
  { facilityId: ids.facility.BF_ETHANOL, year: 2024, month: 4, co2eTonnes: -14911.06, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2024-04', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:63]{index=63}
  { facilityId: ids.facility.BF_ETHANOL, year: 2024, month: 5, co2eTonnes:  -3807.44, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2024-05', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:64]{index=64}
  { facilityId: ids.facility.BF_ETHANOL, year: 2024, month: 6, co2eTonnes: -10568.85, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2024-06', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:65]{index=65}
  { facilityId: ids.facility.BF_ETHANOL, year: 2024, month: 7, co2eTonnes: -17058.82, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2024-07', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:66]{index=66}
  { facilityId: ids.facility.BF_ETHANOL, year: 2024, month: 8, co2eTonnes: -17151.94, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2024-08', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:67]{index=67}
  { facilityId: ids.facility.BF_ETHANOL, year: 2024, month: 9, co2eTonnes: -17184.09, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2024-09', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:68]{index=68}
  { facilityId: ids.facility.BF_ETHANOL, year: 2024, month:10, co2eTonnes: -17412.91, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2024-10', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:69]{index=69}
  { facilityId: ids.facility.BF_ETHANOL, year: 2024, month:11, co2eTonnes: -16103.23, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2024-11', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:70]{index=70}
  { facilityId: ids.facility.BF_ETHANOL, year: 2024, month:12, co2eTonnes: -17992.85, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2024-12', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:71]{index=71}

  // 2025
  { facilityId: ids.facility.BF_ETHANOL, year: 2025, month: 1, co2eTonnes: -18156.81, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2025-01', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:72]{index=72}
  { facilityId: ids.facility.BF_ETHANOL, year: 2025, month: 2, co2eTonnes: -15227.83, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2025-02', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:73]{index=73}
  { facilityId: ids.facility.BF_ETHANOL, year: 2025, month: 3, co2eTonnes: -16911.70, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2025-03', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:74]{index=74}
  { facilityId: ids.facility.BF_ETHANOL, year: 2025, month: 4, co2eTonnes: -16288.12, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2025-04', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:75]{index=75}
  { facilityId: ids.facility.BF_ETHANOL, year: 2025, month: 5, co2eTonnes: -12292.63, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2025-05', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:76]{index=76}
  { facilityId: ids.facility.BF_ETHANOL, year: 2025, month: 6, co2eTonnes: -15425.20, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2025-06', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:77]{index=77}
  { facilityId: ids.facility.BF_ETHANOL, year: 2025, month: 7, co2eTonnes: -15734.32, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2025-07', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:78]{index=78}
  { facilityId: ids.facility.BF_ETHANOL, year: 2025, month: 8, co2eTonnes: -17440.73, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Blue Flint 2025-08', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:79]{index=79}

  // ========== RED TRAIL (Facility: RTE_ETHANOL) ==========
  // 2023
  { facilityId: ids.facility.RTE_ETHANOL, year: 2023, month: 1,  co2eTonnes: -14274.36, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2023-01', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:80]{index=80}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2023, month: 2,  co2eTonnes: -14030.71, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2023-02', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:81]{index=81}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2023, month: 3,  co2eTonnes: -15235.20, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2023-03', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:82]{index=82}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2023, month: 4,  co2eTonnes: -14591.30, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2023-04', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:83]{index=83}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2023, month: 5,  co2eTonnes: -16160.90, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2023-05', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:84]{index=84}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2023, month: 6,  co2eTonnes: -11045.40, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2023-06', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:85]{index=85}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2023, month: 7,  co2eTonnes: -14653.26, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2023-07', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:86]{index=86}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2023, month: 8,  co2eTonnes: -13241.10, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2023-08', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:87]{index=87}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2023, month: 9,  co2eTonnes: -14979.50, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2023-09', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:88]{index=88}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2023, month: 10, co2eTonnes: -13684.67, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2023-10', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:89]{index=89}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2023, month: 11, co2eTonnes: -9568.40,  scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2023-11', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:90]{index=90}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2023, month: 12, co2eTonnes: -13432.80, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2023-12', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:91]{index=91}

  // 2024
  { facilityId: ids.facility.RTE_ETHANOL, year: 2024, month: 1, co2eTonnes: -14056.97, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2024-01', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:92]{index=92}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2024, month: 2, co2eTonnes: -13033.59, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2024-02', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:93]{index=93}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2024, month: 3, co2eTonnes: -14325.65, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2024-03', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:94]{index=94}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2024, month: 4, co2eTonnes: -12385.06, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2024-04', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:95]{index=95}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2024, month: 5, co2eTonnes: -15635.05, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2024-05', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:96]{index=96}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2024, month: 6, co2eTonnes: -12065.59, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2024-06', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:97]{index=97}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2024, month: 7, co2eTonnes: -15204.59, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2024-07', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:98]{index=98}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2024, month: 8, co2eTonnes: -15014.54, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2024-08', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:99]{index=99}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2024, month: 9, co2eTonnes: -14976.95, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2024-09', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:100]{index=100}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2024, month:10, co2eTonnes: -15649.79, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2024-10', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:101]{index=101}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2024, month:11, co2eTonnes: -15296.72, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2024-11', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:102]{index=102}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2024, month:12, co2eTonnes: -15817.95, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2024-12', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:103]{index=103}

  // 2025 (Jan–Aug)
  { facilityId: ids.facility.RTE_ETHANOL, year: 2025, month: 1, co2eTonnes: -14980.52, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2025-01', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:104]{index=104}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2025, month: 2, co2eTonnes: -13538.24, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2025-02', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:105]{index=105}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2025, month: 3, co2eTonnes: -15198.62, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2025-03', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:106]{index=106}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2025, month: 4, co2eTonnes: -13556.20, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2025-04', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:107]{index=107}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2025, month: 5, co2eTonnes: -12847.01, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2025-05', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:108]{index=108}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2025, month: 6, co2eTonnes: -14754.24, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2025-06', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:109]{index=109}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2025, month: 7, co2eTonnes: -15380.11, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2025-07', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:110]{index=110}
  { facilityId: ids.facility.RTE_ETHANOL, year: 2025, month: 8, co2eTonnes: -15034.49, scope: 1, source: SOURCE_REPORTED, method: 'ND DMR Red Trail 2025-08', datasetVersion: 'ND-DMR-2025-10-01' }, // :contentReference[oaicite:111]{index=111}
].map((e) => ({ ...e, ...stamp() }));


/* =========================
   PIPES
========================= */
const pipes = [
  {
    _id: ids.pipe.CF_ENLINK,
    projectId: ids.project.LA_CF_DON,
    name: 'EnLink Donaldsonville CO₂ Line (illustrative)',
    geometry: { type: 'LineString', coordinates: [[-90.995, 30.11], [-90.9, 30.2], [-90.8, 30.3]] },
    maxPressure_psi: 1440,
    diameter_in: 16,
    status: 'operational',
  },
].map((p) => ({ ...p, ...stamp() }));

/* =========================
   RUNNER
========================= */
async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/bayoucarbon';
  await mongoose.connect(uri);
  await Promise.all([
    CcusPipe.deleteMany({}),
    CcusInjection.deleteMany({}),
    CcusReading.deleteMany({}),
    CcusPermit.deleteMany({}),
    CcusWell.deleteMany({}),
    CcusProject.deleteMany({}),
    Facility.deleteMany({}),
    Organization.deleteMany({}),
    CcusAlert.deleteMany({}),
    EmissionsObservation.deleteMany({}), // clear capture rows to avoid dupes
    IntensityStat.deleteMany({}),
  ]);
  await Organization.insertMany(organizations);
  await Facility.insertMany(facilities);
  await CcusProject.insertMany(projects);
  await CcusWell.insertMany(wells);
  await CcusPermit.insertMany(permits);
  await CcusReading.insertMany(readings);
  await CcusInjection.insertMany(injections);
  await EmissionsObservation.insertMany(emissions);

  const facilityIndex = new Map(facilities.map((f) => [String(f._id), f]));
  const observedBy = new Map();
  const reportedBy = new Map();
  for (const e of emissions) {
    const key = `${String(e.facilityId)}|${e.year}`;
    const bucket = {
      facilityId: e.facilityId,
      year: e.year,
      total: 0,
    };
    if (e.source === SOURCE_OBSERVED) {
      const current = observedBy.get(key) || { ...bucket };
      current.total += e.co2eTonnes;
      observedBy.set(key, current);
    } else if (e.source === SOURCE_REPORTED) {
      const current = reportedBy.get(key) || { ...bucket };
      current.total += e.co2eTonnes;
      reportedBy.set(key, current);
    }
  }
  const baseRows = observedBy.size ? observedBy.values() : reportedBy.values();
  const intensityDocs = [...baseRows].map(({ facilityId, year, total }) => {
    const info = facilityIndex.get(String(facilityId));
    const sectorCode =
      info?.meta?.sectorCode ||
      info?.meta?.sector ||
      info?.meta?.traceSector ||
      null;
    const baseOutput = Math.abs(total) * 1200;
    const outputQuantity = Math.max(1_000, Math.round(baseOutput * (0.9 + Math.random() * 0.3)));
    return {
      facilityId,
      year,
      co2eTonnes: Math.abs(total),
      unit: 'kWh',
      outputQuantity,
      sectorCode,
      ...stamp(),
    };
  });
  if (intensityDocs.length) {
    await IntensityStat.insertMany(intensityDocs);
  } else {
  }
  await CcusPipe.insertMany(pipes);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
