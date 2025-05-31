const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Task = require('../models/Task');

// Middleware to verify JWT token
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to check user role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You do not have permission to perform this action' 
      });
    }
    next();
  };
};

// Middleware to check if user is manager of the task assignee
exports.isManagerOfAssignee = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('assignedTo');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (req.user.role === 'admin') {
      return next();
    }

    if (req.user.role === 'manager') {
      return next();
    }
    if (req.user.role === 'user') {
      return next();
    }

    res.status(403).json({ message: 'You do not have permission to manage this task' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
}; 