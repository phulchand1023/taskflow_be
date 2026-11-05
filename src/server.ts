import 'dotenv/config'; // loads variables from .env into process.env
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { Error as MongooseError } from 'mongoose';
import { connectDB } from './db.js';
import { tasksRouter } from './routes/tasks.js';

const PORT = Number(process.env.PORT ?? 4000);
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/taskflow';

const app = express();
app.use(cors());
app.use(express.json());

// Log every request so you can see the app's calls in the terminal
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/tasks', tasksRouter);

// Any route we didn't define
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Central error handler. Express 5 forwards errors thrown in async routes here.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof MongooseError.ValidationError) {
    const message = Object.values(err.errors)[0]?.message ?? 'Invalid data';
    return res.status(400).json({ error: message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
};
app.use(errorHandler);

connectDB(MONGO_URI)
  .then(() => {
    // Listen on 0.0.0.0 so your phone on the same Wi-Fi can reach it
    app.listen(PORT, '0.0.0.0', () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB. Is mongod running?\n', err.message);
    process.exit(1);
  });
