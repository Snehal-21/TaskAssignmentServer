const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Task = require('../models/Task');
const User = require('../models/User');
const dotenv = require('dotenv');
dotenv.config();
// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Function to send reminder email
const sendReminderEmail = async (task, user) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: `Task Reminder: ${task.title}`,
    html: `
      <h2>Task Reminder</h2>
      <p>You have a task due soon:</p>
      <ul>
        <li><strong>Title:</strong> ${task.title}</li>
        <li><strong>Description:</strong> ${task.description}</li>
        <li><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleString()}</li>
        <li><strong>Priority:</strong> ${task.priority}</li>
        <li><strong>Status:</strong> ${task.status}</li>
      </ul>
      <p>Please make sure to complete this task on time.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(` Reminder email sent to ${user.email} for task: ${task.title}`);
  } catch (error) {
    console.error(' Error sending reminder email:', error);
  }
};

// Function to check and send reminders
const checkAndSendReminders = async () => {
  try {
    const now = new Date();
    // Set time to start of current day
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Set time to end of current day
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    console.log(' Checking for tasks that need reminders...');

    // Find tasks with reminders due today that haven't been completed
    const tasks = await Task.find({
      reminderAt: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $ne: 'completed' },
      reminderSent: { $ne: true } // Only send reminder if it hasn't been sent before
    }).populate('assignedTo');

    console.log(` Found ${tasks.length} tasks that need reminders`);

    // Send reminders for each task
    for (const task of tasks) {
      if (task.reminderSent) {
        console.log(` Skipping task "${task.title}" - reminder already sent`);
        continue;
      }

      await sendReminderEmail(task, task.assignedTo);
      // Mark the reminder as sent
      task.reminderSent = true;
      await task.save();
      console.log(`Marked reminder as sent for task: ${task.title}`);
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
};

// Schedule reminder check at 12 AM (midnight) every day
const startReminderService = () => {
  cron.schedule('0 0 * * *', checkAndSendReminders);
  console.log('Reminder service started - checking at 12 AM (midnight) daily');
};

module.exports = {
  startReminderService,
  sendReminderEmail
};