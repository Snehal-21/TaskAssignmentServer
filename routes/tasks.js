const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const User = require('../models/User');
const { authenticate, authorize, isManagerOfAssignee } = require('../middleware/auth');
const { sendReminderEmail } = require('../services/reminderService');

// Get all tasks (filtered by role)
// router.get('/', authenticate, async (req, res) => {
//   try {
//     let query = {};
//     console.log("uuu",req.user)
//     // Filter based on user role
//     if (req.user.role === 'user') {
//       query.assignedTo = req.user._id;
//     } else if (req.user.role === 'manager') {
//       const managedUsers = await User.find({ managerId: req.user._id });
//       query.assignedTo = { $in: managedUsers.map(user => user._id) };
//     }

//     // Apply filters from query params
//     if (req.query.status) {
//       query.status = req.query.status;
//     }
//     if (req.query.priority) {
//       query.priority = req.query.priority;
//     }
//     if (req.query.dueDate) {
//       query.dueDate = { $lte: new Date(req.query.dueDate) };
//     }

//     const tasks = await Task.find(query)
//       .populate('assignedTo', 'name email')
//       .populate('createdBy', 'name email')
//       .sort({ dueDate: 1 });

//     res.json(tasks);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });


router.get('/', authenticate, async (req, res) => {
  try {
    let query = {};

    // Filter tasks based on user role
    if (req.user.role === 'user') {
      query.assignedTo = req.user._id;
    } else if (req.user.role === 'manager') {
      query.createdBy = req.user._id;
    }
    // If admin, no need to filter — get all tasks

    // Optional filters via query params
    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    if (req.query.dueDate) {
      query.dueDate = { $lte: new Date(req.query.dueDate) };
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1 });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Create new task
router.post('/', [
  authenticate,
  authorize('admin', 'manager'),
  body('title').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('dueDate').isISO8601(),
  body('reminderAt').isISO8601(),
  body('priority').isIn(['low', 'medium', 'high']),
  body('assignedTo').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, dueDate, reminderAt, priority, assignedTo } = req.body;

    // Check if assigned user exists and is under manager's supervision
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({ message: 'Assigned user not found' });
    }

    // if (req.user.role === 'manager' && assignedUser.managerId?.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({ message: 'You can only assign tasks to users under your management' });
    // }

    const task = new Task({
      title,
      description,
      dueDate,
      reminderAt,
      priority,
      assignedTo,
      createdBy: req.user._id
    });

    await task.save();

    // Send initial reminder email to the assigned user
    await sendReminderEmail(task, assignedUser);

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task
router.put('/:id', [
  authenticate,
  isManagerOfAssignee,
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('status').optional().isIn(['pending', 'in_progress', 'completed']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('dueDate').optional().isISO8601(),
  body('reminderAt').optional().isISO8601()
], async (req, res) => {

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Update task fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        task[key] = req.body[key];
      }
    });

    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});



router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Authorization check: Only allow access if:
    // - Admin
    // - Manager who created or manages the assigned user
    // - The assigned user
    if (
      req.user.role === 'user' && task.assignedTo._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (
      req.user.role === 'manager' &&
      task.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});




// Delete task
router.delete('/:id', [authenticate, authorize('admin', 'manager'), isManagerOfAssignee], async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task status (for users)
router.patch('/:id/status', [
  authenticate,
  body('status').isIn(['pending', 'in_progress', 'completed'])
], async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is assigned to the task
    // if (task.assignedTo.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({ message: 'You can only update tasks assigned to you' });
    // }

    task.status = req.body.status;
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 