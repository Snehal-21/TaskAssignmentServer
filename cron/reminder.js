import cron from 'node-cron';
import Task from '../models/Task.js';
import User from '../models/User.js';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

cron.schedule('* * * * *', async () => {
  const now = new Date();
  const nextMinute = new Date(now.getTime() + 60000);

  const tasks = await Task.find({
    reminderAt: { $gte: now, $lte: nextMinute },
    status: { $ne: 'completed' }
  }).populate('assignedTo');

  for (const task of tasks) {
    await transporter.sendMail({
      to: task.assignedTo.email,
      subject: `Reminder: ${task.title}`,
      text: `Reminder: "${task.title}" is due soon!`
    });
  }
});
