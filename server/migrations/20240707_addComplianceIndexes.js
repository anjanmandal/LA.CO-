export const name = '20240707_addComplianceIndexes';

export async function up(db) {
  await db.collection('compliancetasks').createIndex({ orgId: 1, dueAt: 1 }, { name: 'org_dueAt' });
  await db.collection('compliancetasks').createIndex({ status: 1, dueAt: 1 }, { name: 'status_dueAt' });
  await db.collection('regrequirements').createIndex({ code: 1 }, { name: 'code_unique', unique: true });
}

export async function down(db) {
  try { await db.collection('compliancetasks').dropIndex('org_dueAt'); } catch (e) {}
  try { await db.collection('compliancetasks').dropIndex('status_dueAt'); } catch (e) {}
  try { await db.collection('regrequirements').dropIndex('code_unique'); } catch (e) {}
}
