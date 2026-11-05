import { Schema, model } from 'mongoose';

// The schema describes what a task document looks like in MongoDB.
// Mongoose validates against it before saving.
const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title too long'],
    },
    completed: { type: Boolean, default: false },
  },
  {
    // Adds createdAt and updatedAt fields automatically
    timestamps: true,
    // Controls how a document turns into JSON for the response:
    // Mongo stores the id as `_id` (an ObjectId), but the app expects `id` (a string).
    toJSON: {
      versionKey: false, // hide the internal `__v` field
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.updatedAt;
        return ret;
      },
    },
  },
);

export const Task = model('Task', taskSchema);
