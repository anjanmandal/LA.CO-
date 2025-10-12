import GeoFence from '../../models/GeoFence.js';
import CcusAlert from '../../models/CcusAlert.js';

// Mongo 2dsphere intersects: if well/pipeline/storage boundary intersects a restricted geofence → alert
export async function checkGeofences({ project, wells = [] }) {
  const fences = await GeoFence.find().lean();
  let count = 0;

  for (const w of wells) {
    for (const f of fences) {
      // quick intersection via $geoIntersects
      // (we already indexed geometry and well.surface)
      // We need a query, not pure JS: do a point-in-polygon test with Mongo
      const match = await GeoFence.findOne({
        _id: f._id,
        geometry: { $geoIntersects: { $geometry: w.surface } }
      }).select('_id').lean();

      if (match) {
        await CcusAlert.create({
          projectId: project._id,
          wellId: w._id,
          kind: 'geofence',
          severity: f.kind === 'restricted' ? 'high' : 'medium',
          message: `Well ${w.name} intersects geofence "${f.name}" (${f.kind}).`,
          meta: { fenceId: f._id, fenceKind: f.kind }
        });
        count++;
      }
    }
  }

  return { alerts: count };
}
