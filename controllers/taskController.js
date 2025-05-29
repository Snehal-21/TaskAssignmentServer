import Task from '../models/Task.js';

export const getTasks = async (req, res) => {
  const { role, id } = req.user;
  let tasks = [];

  if (role === 'admin') tasks = await Task.find().populate('assignedTo');
  else if (role === 'manager') tasks = await Task.find({ createdBy: id });
  else tasks = await Task.find({ assignedTo: id });

  res.json(tasks);
};

export const createTask = async (req, res) => {
  const task = new Task({ ...req.body, createdBy: req.user.id });
  await task.save();
  res.json(task);
};

export const updateTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.sendStatus(404);
  if (req.user.role === 'user' && !task.assignedTo.equals(req.user.id)) return res.sendStatus(403);

  Object.assign(task, req.body);
  await task.save();
  res.json(task);
};

export const deleteTask = async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
};

export const completeTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task || !task.assignedTo.equals(req.user.id)) return res.sendStatus(403);

  task.status = 'completed';
  await task.save();
  res.json(task);
};
