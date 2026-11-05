# TaskFlow Backend (Express + MongoDB)

REST API for the TaskFlow React Native app.

📘 **Full API reference for the frontend: [API.md](./API.md)**

## Run it

```bash
# 1. Make sure MongoDB is running locally (Homebrew):
brew services start mongodb-community

# 2. Install and start the API (auto-restarts on file save)
npm install
npm run dev
```

The API runs on `http://localhost:4000`. Config lives in `.env`:

```
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/taskflow
```

## Task shape

```ts
type Task = {
  id: string;        // MongoDB ObjectId as a string, e.g. "6ae0d9291adac664ecb3390c"
  title: string;
  completed: boolean;
  createdAt: string; // ISO date string
};
```

## Endpoints

| Method | Path                     | Body                                      | Response              |
| ------ | ------------------------ | ----------------------------------------- | --------------------- |
| GET    | `/health`                |                                           | `200 { ok: true }`    |
| GET    | `/tasks`                 |                                           | `200 Task[]` (newest first) |
| GET    | `/tasks?completed=true`  |                                           | `200 Task[]` (only done; `false` = only active) |
| GET    | `/tasks/:id`             |                                           | `200 Task` / `404`    |
| POST   | `/tasks`                 | `{ title: string }`                       | `201 Task` / `400`    |
| PATCH  | `/tasks/:id`             | `{ title?: string, completed?: boolean }` | `200 Task` / `400` / `404` |
| DELETE | `/tasks/:id`             |                                           | `204` / `404`         |

Errors always look like `{ "error": "message" }`.

## Try it with curl

```bash
curl http://localhost:4000/tasks
curl -X POST http://localhost:4000/tasks -H "Content-Type: application/json" -d '{"title":"First task"}'
curl -X PATCH http://localhost:4000/tasks/<id> -H "Content-Type: application/json" -d '{"completed":true}'
curl -X DELETE http://localhost:4000/tasks/<id> -i
```

To look at the data directly: `mongosh taskflow` → `db.tasks.find()`.

## Calling it from the app

`localhost` on a phone means the phone itself, not your laptop:

| Where the app runs   | Base URL                              |
| -------------------- | ------------------------------------- |
| iOS simulator        | `http://localhost:4000`               |
| Android emulator     | `http://10.0.2.2:4000`                |
| Real phone (Expo Go) | `http://<laptop-LAN-IP>:4000` (find it with `ipconfig getifaddr en0`) |

## Files

```
src/
├── server.ts        # Express app, middleware, error handling, startup
├── db.ts            # connects to MongoDB
├── models/Task.ts   # Mongoose schema (validation + JSON shape)
└── routes/tasks.ts  # the /tasks endpoints
```
