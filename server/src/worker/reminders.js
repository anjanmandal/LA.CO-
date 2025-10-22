import cron from 'node-cron';
import ComplianceTask from '../models/ComplianceTask.js';

async function sendReminder(task) {
  // plug your email/SMS/in-app here
  task.audit.push({ action:'reminder_sent', actor:'system' });
  await task.save();
}

export function startReminderWorker() {
  // Reminder worker is paused; returning without scheduling cron job.
  return;
}
