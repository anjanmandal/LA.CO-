import Submission from '../models/Submission.js';

export async function listOrgSubmissions(req, res) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { status, templateId, from, to, orgId } = req.query;

    const filter = {};
    if (req.user.role === 'admin' || req.user.role === 'regulator') {
      if (orgId) filter.orgId = orgId;
    } else {
      if (!req.user.orgId) return res.status(400).json({ error: 'No org assigned' });
      filter.orgId = req.user.orgId;
    }

    if (status) {
      let statuses = status;
      if (Array.isArray(statuses)) {
        statuses = statuses.flatMap((s) => (typeof s === 'string' ? s.split(',') : []));
      } else if (typeof statuses === 'string') {
        statuses = statuses.split(',');
      }
      statuses = statuses.map((s) => s.trim()).filter(Boolean);
      if (statuses.length > 1) filter.status = { $in: statuses };
      else if (statuses.length === 1) filter.status = statuses[0];
    }
    if (templateId) filter.templateId = templateId;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const submissions = await Submission.find(filter)
      .sort({ createdAt: -1 })
      .populate({ path: 'templateId', select: 'name' })
      .populate({ path: 'orgId', select: 'name' })
      .lean();

    const response = submissions.map((sub) => ({
      id: sub._id.toString(),
      orgId: sub.orgId?._id?.toString?.() || sub.orgId?.toString?.() || null,
      orgName: sub.orgId?.name || sub.orgId?.toString?.() || 'Organization',
      templateId: sub.templateId?._id || null,
      templateName: sub.templateId?.name || 'Template',
      status: sub.status,
      validation: sub.validation,
      files: sub.files ?? [],
      taskId: sub.taskId,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    }));

    res.json({ submissions: response });
  } catch (err) {
    console.error('listOrgSubmissions', err);
    res.status(500).json({ error: 'Failed to load submissions' });
  }
}

export async function updateSubmissionStatus(req, res) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  const { status } = req.body ?? {};

  const allowed = ['accepted', 'rejected'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const submission = await Submission.findById(id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    submission.status = status;
    await submission.save();

    const hydrated = await Submission.findById(id)
      .populate({ path: 'templateId', select: 'name' })
      .populate({ path: 'orgId', select: 'name' })
      .lean();

    const response = {
      id: hydrated._id.toString(),
      orgId: hydrated.orgId?._id?.toString?.() || hydrated.orgId?.toString?.() || null,
      orgName: hydrated.orgId?.name || hydrated.orgId?.toString?.() || 'Organization',
      templateId: hydrated.templateId?._id || null,
      templateName: hydrated.templateId?.name || 'Template',
      status: hydrated.status,
      validation: hydrated.validation,
      files: hydrated.files ?? [],
      taskId: hydrated.taskId,
      createdAt: hydrated.createdAt,
      updatedAt: hydrated.updatedAt,
    };

    res.json({ submission: response });
  } catch (err) {
    console.error('updateSubmissionStatus', err);
    res.status(500).json({ error: 'Failed to update submission' });
  }
}
