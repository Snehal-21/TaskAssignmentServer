const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Task = require('../models/Task');
const User = require('../models/User');

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
    console.log(`Reminder email sent to ${user.email} for task: ${task.title}`);
  } catch (error) {
    console.error('Error sending reminder email:', error);
  }
};

// Function to check and send reminders
const checkAndSendReminders = async () => {
  try {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);

    // Find tasks with reminders due in the next 5 minutes
    const tasks = await Task.find({
      reminderAt: {
        $gte: now,
        $lte: fiveMinutesFromNow
      },
      status: { $ne: 'completed' }
    }).populate('assignedTo');

    // Send reminders for each task
    for (const task of tasks) {
      await sendReminderEmail(task, task.assignedTo);
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
};

// Schedule reminder check every minute
const startReminderService = () => {
  cron.schedule('* * * * *', checkAndSendReminders);
  console.log('Reminder service started');
};

module.exports = {
  startReminderService
}; 