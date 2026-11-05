import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { Task } from '../models/Task.js';

export const tasksRouter = Router();

// GET /tasks            -> all tasks, newest first
// GET /tasks?completed=true|false -> only done / only active
tasksRouter.get('/', async (req, res) => {
  const filter: { completed?: boolean } = {};
  if (req.query.completed === 'true') filter.completed = true;
  if (req.query.completed === 'false') filter.completed = false;

  const tasks = await Task.find(filter).sort({ createdAt: -1 });
  res.json(tasks);
});

// GET /tasks/:id
tasksRouter.get('/:id', async (req, res) => {
  const task = isValidObjectId(req.params.id) ? await Task.findById(req.params.id) : null;
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// POST /tasks  body: { title }
tasksRouter.post('/', async (req, res) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const task = await Task.create({ title });
  res.status(201).json(task);
});

// PATCH /tasks/:id  body: { title?, completed? }
tasksRouter.patch('/:id', async (req, res) => {
  const task = isValidObjectId(req.params.id) ? await Task.findById(req.params.id) : null;
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { title, completed } = req.body ?? {};
  if (title !== undefined) {
    if (!String(title).trim()) return res.status(400).json({ error: 'Title cannot be empty' });
    task.title = String(title);
  }
  if (completed !== undefined) {
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'completed must be true or false' });
    }
    task.completed = completed;
  }

  await task.save(); // runs schema validation (e.g. maxlength)
  res.json(task);
});

// DELETE /tasks/:id
tasksRouter.delete('/:id', async (req, res) => {
  const task = isValidObjectId(req.params.id) ? await Task.findByIdAndDelete(req.params.id) : null;
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.status(204).send();
});
