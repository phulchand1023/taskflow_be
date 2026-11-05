import mongoose from 'mongoose';

// Opens one connection to MongoDB that the whole app shares.
// Mongo creates the "taskflow" database and "tasks" collection automatically
// the first time we insert something, so there's no setup step.
export async function connectDB(uri: string) {
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
