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

// Function to send task assignment email
const sendTaskAssignmentEmail = async (task, assignedUser, assignedBy) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: assignedUser.email,
    subject: `New Task Assigned: ${task.title}`,
    html: `
      <h2>New Task Assignment</h2>
      <p>You have been assigned a new task by ${assignedBy.name}:</p>
      <ul>
        <li><strong>Title:</strong> ${task.title}</li>
        <li><strong>Description:</strong> ${task.description}</li>
        <li><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleString()}</li>
        <li><strong>Priority:</strong> ${task.priority}</li>
        <li><strong>Reminder Date:</strong> ${new Date(task.reminderAt).toLocaleString()}</li>
      </ul>
      <p>Please review and start working on this task.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Assignment email sent to ${assignedUser.email} for task: ${task.title}`);
  } catch (error) {
    console.error('❌ Error sending assignment email:', error);
  }
};

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
    console.log(`✅ Reminder email sent to ${user.email} for task: ${task.title}`);
  } catch (error) {
    console.error('❌ Error sending reminder email:', error);
  }
};

// Function to check and send reminders
const checkAndSendReminders = async () => {
  try {
    const now = new Date();
    
    // Calculate time ranges for reminder check
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    console.log('🔍 Checking for tasks that need reminders...');
    console.log(`📅 Checking reminders between ${yesterday.toLocaleString()} and ${tomorrow.toLocaleString()}`);

    // Find tasks with reminders due in the last 24 hours or next 24 hours
    const tasks = await Task.find({
      reminderAt: {
        $gte: yesterday,
        $lte: tomorrow
      },
      status: { $ne: 'completed' },
      reminderSent: { $ne: true } // Only send reminder if it hasn't been sent before
    }).populate('assignedTo');

    console.log(`📊 Found ${tasks.length} tasks that need reminders`);

    // Send reminders for each task
    for (const task of tasks) {
      if (task.reminderSent) {
        console.log(`⏭️ Skipping task "${task.title}" - reminder already sent`);
        continue;
      }

      // Check if the reminder date has passed
      if (task.reminderAt <= now) {
        await sendReminderEmail(task, task.assignedTo);
        // Mark the reminder as sent
        task.reminderSent = true;
        await task.save();
        console.log(`📝 Marked reminder as sent for task: ${task.title}`);
      } else {
        console.log(`⏳ Task "${task.title}" reminder date not yet reached: ${task.reminderAt.toLocaleString()}`);
      }
    }
  } catch (error) {
    console.error('❌ Error checking reminders:', error);
  }
};

// Schedule reminder check at 12 AM (midnight) every day
const startReminderService = () => {
  cron.schedule('0 0 * * *', checkAndSendReminders);
  console.log('Reminder service started - checking at 12 AM (midnight) daily');
};

module.exports = {
  startReminderService,
  sendReminderEmail,
  sendTaskAssignmentEmail
};