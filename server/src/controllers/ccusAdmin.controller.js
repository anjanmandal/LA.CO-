import mongoose from 'mongoose';
import CcusProject from '../models/CcusProject.js';
import CcusWell from '../models/CcusWell.js';
import CcusPermit from '../models/CcusPermit.js';
import CcusInjection from '../models/CcusInjection.js';
import CcusAlert from '../models/CcusAlert.js';
import CcusPipe from '../models/CcusPipe.js';
import CcusReading from '../models/CcusReading.js';
import Organization from '../models/Organization.js';

const asObjectId = (value) => {
  if (!value) return undefined;
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return undefined;
  }
};

export const createProject = async (req, res) => {
  const { name, operator, organizationId, classType, status, location, boundary, geologyTags } = req.body || {};

  if (!name || !operator) {
    return res.status(400).json({ error: 'name and operator are required' });
  }

  const orgId = asObjectId(organizationId);
  if (organizationId && !orgId) return res.status(400).json({ error: 'Invalid organizationId' });
  if (orgId) {
    const org = await Organization.exists({ _id: orgId });
    if (!org) return res.status(400).json({ error: 'organizationId not found' });
  }

  const project = await CcusProject.create({
    name,
    operator,
    organizationId: orgId,
    classType: classType || 'VI',
    status: status || 'permitting',
    location: location || undefined,
    boundary: boundary || undefined,
    geologyTags: Array.isArray(geologyTags) ? geologyTags : undefined,
  });

  res.status(201).json(project);
};

export const updateProject = async (req, res) => {
  const { id } = req.params;
  const { organizationId, ...rest } = req.body || {};
  const update = { ...rest };

  if (organizationId !== undefined) {
    if (!organizationId) update.organizationId = undefined;
    else {
      const orgId = asObjectId(organizationId);
      if (!orgId) return res.status(400).json({ error: 'Invalid organizationId' });
      const org = await Organization.exists({ _id: orgId });
      if (!org) return res.status(400).json({ error: 'organizationId not found' });
      update.organizationId = orgId;
    }
  }

  try {
    const project = await CcusProject.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteProject = async (req, res) => {
  const { id } = req.params;
  const project = await CcusProject.findById(id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  await Promise.all([
    CcusWell.deleteMany({ projectId: project._id }),
    CcusPermit.deleteMany({ projectId: project._id }),
    CcusInjection.deleteMany({ projectId: project._id }),
    CcusAlert.deleteMany({ projectId: project._id }),
    CcusPipe.deleteMany({ projectId: project._id }),
    CcusReading.deleteMany({ projectId: project._id }),
  ]);

  await project.deleteOne();

  res.json({ ok: true });
};

export const createWell = async (req, res) => {
  const { id: projectId } = req.params;
  const { name, apiNo, type, status, surface, bottomHoleTVD_ft, formation, maxAllowablePressure_psi, meta } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });
  const project = await CcusProject.findById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const well = await CcusWell.create({
    projectId,
    name,
    apiNo,
    type,
    status,
    surface,
    bottomHoleTVD_ft,
    formation,
    maxAllowablePressure_psi,
    meta,
  });

  res.status(201).json(well);
};

export const updateWell = async (req, res) => {
  const { id } = req.params;
  try {
    const well = await CcusWell.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!well) return res.status(404).json({ error: 'Well not found' });
    res.json(well);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteWell = async (req, res) => {
  const { id } = req.params;
  const well = await CcusWell.findById(id);
  if (!well) return res.status(404).json({ error: 'Well not found' });
  await Promise.all([
    CcusInjection.deleteMany({ wellId: well._id }),
  ]);
  await well.deleteOne();
  res.json({ ok: true });
};

export const createPermit = async (req, res) => {
  const { id: projectId } = req.params;
  const { number, issuedAt, expiresAt, status, meta } = req.body || {};
  if (!number) return res.status(400).json({ error: 'number is required' });
  const project = await CcusProject.findById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const permit = await CcusPermit.create({
    projectId,
    number,
    issuedAt: issuedAt ? new Date(issuedAt) : undefined,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    status: status || 'pending',
    meta,
  });
  res.status(201).json(permit);
};

export const updatePermit = async (req, res) => {
  const { id } = req.params;
  try {
    const permit = await CcusPermit.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!permit) return res.status(404).json({ error: 'Permit not found' });
    res.json(permit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deletePermit = async (req, res) => {
  const { id } = req.params;
  const permit = await CcusPermit.findById(id);
  if (!permit) return res.status(404).json({ error: 'Permit not found' });
  await permit.deleteOne();
  res.json({ ok: true });
};

export const upsertReading = async (req, res) => {
  const { id: projectId } = req.params;
  const { date, captured_tCO2, stored_tCO2, source, facilityId } = req.body || {};
  if (!date) return res.status(400).json({ error: 'date is required' });

  const project = await CcusProject.findById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const when = new Date(date);
  let reading = await CcusReading.findOne({ projectId, date: when });
  if (!reading) {
    reading = await CcusReading.create({
      projectId,
      date: when,
      captured_tCO2,
      stored_tCO2,
      source,
      facilityId,
    });
    return res.status(201).json(reading);
  }

  reading.captured_tCO2 = captured_tCO2 ?? reading.captured_tCO2;
  reading.stored_tCO2 = stored_tCO2 ?? reading.stored_tCO2;
  if (source !== undefined) reading.source = source;
  if (facilityId !== undefined) reading.facilityId = facilityId;
  await reading.save();
  res.json(reading);
};
