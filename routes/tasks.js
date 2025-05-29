import express from 'express';
// import {
//   getTasks,
//   createTask,
//   updateTask,
//   deleteTask,
//   completeTask
// } from '../controllers/taskController.js';

// import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// router.get('/', authenticate, getTasks);
// router.post('/', authenticate, authorize('admin', 'manager'), createTask);
// router.put('/:id', authenticate, updateTask);
// router.delete('/:id', authenticate, authorize('admin', 'manager'), deleteTask);
// router.post('/:id/complete', authenticate, completeTask);

export default router;
