import cron from 'node-cron';
import ComplianceTask from '../models/ComplianceTask.js';

async function sendReminder(task) {
  // plug your email/SMS/in-app here
  console.log(`[reminder] Task ${task._id} "${task.title}" due ${task.dueAt.toISOString()}`);
  task.audit.push({ action:'reminder_sent', actor:'system' });
  await task.save();
}

export function startReminderWorker() {
  // every hour: remind upcoming 7 days + overdue
  cron.schedule('15 * * * *', async () => {
    const now = new Date();
    const soon = new Date(); soon.setDate(soon.getDate()+7);

    const tasks = await ComplianceTask.find({
      status: { $in: ['open','in_progress','overdue'] },
      dueAt: { $lte: soon }
    });

    for (const t of tasks) {
      if (t.dueAt < now && t.status !== 'overdue') { t.status = 'overdue'; await t.save(); }
      await sendReminder(t);
    }
  });
}
