# TaskFlow API Reference

Everything the React Native app needs to talk to the TaskFlow backend: URLs, request and response shapes, errors, and ready-to-use TypeScript signatures.

---

## Contents

1. [Base URL](#1-base-url)
2. [General rules](#2-general-rules)
3. [Types](#3-types)
4. [Endpoints](#4-endpoints)
   - [Health check](#41-health-check) · `GET /health`
   - [List tasks](#42-list-tasks) · `GET /tasks`
   - [Get one task](#43-get-one-task) · `GET /tasks/:id`
   - [Create a task](#44-create-a-task) · `POST /tasks`
   - [Update a task](#45-update-a-task) · `PATCH /tasks/:id`
   - [Delete a task](#46-delete-a-task) · `DELETE /tasks/:id`
5. [Errors](#5-errors)
6. [Frontend client (`lib/api.ts`)](#6-frontend-client-libapits)
7. [Usage examples in components](#7-usage-examples-in-components)
8. [Common problems](#8-common-problems)

---

## 1. Base URL

The server listens on port **4000**. Which address you use depends on where the app is running, because `localhost` on a phone means the phone itself, not your laptop.

| Where the app runs   | Base URL                                    |
| -------------------- | ------------------------------------------- |
| iOS simulator        | `http://localhost:4000`                     |
| Android emulator     | `http://10.0.2.2:4000`                      |
| Real phone (Expo Go) | `http://<laptop-LAN-IP>:4000`, e.g. `http://192.168.1.11:4000` |

Find your laptop's LAN IP with `ipconfig getifaddr en0`. The phone and laptop must be on the same Wi-Fi.

Put it in `mobile/.env`, then restart Expo (`npx expo start -c`) so the change is picked up:

```
EXPO_PUBLIC_API_URL=http://192.168.1.11:4000
```

---

## 2. General rules

| Rule | Detail |
| ---- | ------ |
| Format | Requests and responses are JSON. |
| Request header | Send `Content-Type: application/json` on every `POST` and `PATCH`. Without it the server ignores the body (see [Common problems](#8-common-problems)). |
| Auth | None. Every endpoint is public. |
| IDs | Strings (MongoDB ObjectIds), 24 hex characters, e.g. `"6ae0d9291adac664ecb3390c"`. **Not numbers.** |
| Dates | ISO 8601 strings in UTC, e.g. `"2026-10-27T17:02:33.813Z"`. Turn into a `Date` with `new Date(task.createdAt)`. |
| Errors | Always `{ "error": string }` with a 4xx or 5xx status. See [Errors](#5-errors). |
| Ordering | Lists are sorted newest first (`createdAt` descending). |
| CORS | Enabled for all origins, so Expo web works too. |

---

## 3. Types

Copy these into `mobile/types.ts`.

```ts
/** A task as returned by the API. */
export type Task = {
  /** MongoDB ObjectId, 24 hex characters. */
  id: string;
  /** 1–200 characters, already trimmed by the server. */
  title: string;
  /** false when created. */
  completed: boolean;
  /** ISO 8601 date string (UTC), set by the server when the task is created. */
  createdAt: string;
};

/** Body for POST /tasks. */
export type CreateTaskInput = {
  title: string;
};

/** Body for PATCH /tasks/:id. Send only the fields you want to change. */
export type UpdateTaskInput = {
  title?: string;
  completed?: boolean;
};

/** Shape of every error response. */
export type ApiErrorBody = {
  error: string;
};

/** The three filter tabs in the app. */
export type Filter = 'all' | 'active' | 'done';
```

---

## 4. Endpoints

### Summary

| Method   | Path          | Body               | Success          | Errors       |
| -------- | ------------- | ------------------ | ---------------- | ------------ |
| `GET`    | `/health`     | none               | `200 { ok: true }` | none        |
| `GET`    | `/tasks`      | none               | `200 Task[]`     | none         |
| `GET`    | `/tasks/:id`  | none               | `200 Task`       | `404`        |
| `POST`   | `/tasks`      | `CreateTaskInput`  | `201 Task`       | `400`        |
| `PATCH`  | `/tasks/:id`  | `UpdateTaskInput`  | `200 Task`       | `400`, `404` |
| `DELETE` | `/tasks/:id`  | none               | `204` (no body)  | `404`        |

---

### 4.1 Health check

Checks that the server is up. Handy for testing your base URL before anything else.

```
GET /health
```

**Signature**

```ts
health(): Promise<{ ok: true }>
```

**Response `200 OK`**

```json
{ "ok": true }
```

**curl**

```bash
curl http://localhost:4000/health
```

---

### 4.2 List tasks

Returns all tasks, newest first. Optionally filter by completion status.

```
GET /tasks
GET /tasks?completed=true
GET /tasks?completed=false
```

**Signature**

```ts
getTasks(completed?: boolean): Promise<Task[]>
```

**Query parameters**

| Name        | Type                  | Required | Description |
| ----------- | --------------------- | -------- | ----------- |
| `completed` | `"true"` \| `"false"` | No       | `true` returns only done tasks, `false` returns only active tasks. Leave it out (or send any other value) to get all tasks. |

**Response `200 OK`**: an array of `Task`. Empty array `[]` when there are none, never `null` or `404`.

```json
[
  {
    "title": "Second task",
    "completed": false,
    "createdAt": "2026-10-27T17:02:33.830Z",
    "id": "6ae0d9291adac664ecb3390d"
  },
  {
    "title": "First task",
    "completed": true,
    "createdAt": "2026-10-27T17:02:33.813Z",
    "id": "6ae0d9291adac664ecb3390c"
  }
]
```

**curl**

```bash
curl http://localhost:4000/tasks
curl "http://localhost:4000/tasks?completed=false"
```

> 💡 For the All / Active / Done tabs you can either fetch everything once and filter on the device (simpler, works offline-ish, what the project guide does), or call this endpoint with `completed`. Do one or the other, not both.

---

### 4.3 Get one task

```
GET /tasks/:id
```

**Signature**

```ts
getTask(id: string): Promise<Task>
```

**Path parameters**

| Name | Type     | Description  |
| ---- | -------- | ------------ |
| `id` | `string` | The task's `id`. |

**Response `200 OK`**

```json
{
  "title": "First task",
  "completed": false,
  "createdAt": "2026-10-27T17:02:33.813Z",
  "id": "6ae0d9291adac664ecb3390c"
}
```

**Errors**

| Status | Body | When |
| ------ | ---- | ---- |
| `404`  | `{ "error": "Task not found" }` | No task has this id, or the id isn't a valid ObjectId (e.g. `abc`). |

**curl**

```bash
curl http://localhost:4000/tasks/6ae0d9291adac664ecb3390c
```

---

### 4.4 Create a task

```
POST /tasks
Content-Type: application/json
```

**Signature**

```ts
createTask(title: string): Promise<Task>
```

**Request body** (`CreateTaskInput`)

| Field   | Type     | Required | Rules |
| ------- | -------- | -------- | ----- |
| `title` | `string` | Yes      | Leading/trailing spaces are trimmed. Must be 1–200 characters after trimming. |

```json
{ "title": "Buy milk" }
```

**Response `201 Created`**: the new task. `completed` is always `false`, and `id` and `createdAt` are generated by the server.

```json
{
  "title": "Buy milk",
  "completed": false,
  "createdAt": "2026-10-27T17:05:10.120Z",
  "id": "6ae0d9e61adac664ecb33910"
}
```

**Errors**

| Status | Body | When |
| ------ | ---- | ---- |
| `400`  | `{ "error": "Title is required" }` | `title` missing, empty, or only spaces. Also happens if you forget the `Content-Type` header. |
| `400`  | `{ "error": "Title too long" }`    | More than 200 characters. |
| `400`  | `{ "error": "Invalid JSON body" }` | The body isn't valid JSON. |

**curl**

```bash
curl -X POST http://localhost:4000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk"}'
```

> 💡 Add the returned task to your state (`setTasks(prev => [task, ...prev])`) rather than refetching the whole list. The response already has the real `id`.

---

### 4.5 Update a task

Change the title, the completed flag, or both. Send **only** the fields you want to change; anything you leave out stays as it is.

```
PATCH /tasks/:id
Content-Type: application/json
```

**Signature**

```ts
updateTask(id: string, data: UpdateTaskInput): Promise<Task>
```

**Path parameters**

| Name | Type     | Description |
| ---- | -------- | ----------- |
| `id` | `string` | The task's `id`. |

**Request body** (`UpdateTaskInput`)

| Field       | Type      | Required | Rules |
| ----------- | --------- | -------- | ----- |
| `title`     | `string`  | No       | Trimmed. Must be 1–200 characters after trimming. |
| `completed` | `boolean` | No       | Must be a real JSON boolean: `true` / `false`, not `"true"`, `1` or `null`. |

```json
{ "completed": true }
```
```json
{ "title": "Buy oat milk" }
```
```json
{ "title": "Buy oat milk", "completed": true }
```

**Response `200 OK`**: the whole task **after** the update.

```json
{
  "title": "Buy oat milk",
  "completed": true,
  "createdAt": "2026-10-27T17:05:10.120Z",
  "id": "6ae0d9e61adac664ecb33910"
}
```

An empty body `{}` is allowed. It changes nothing and returns the task as it is.

**Errors**

| Status | Body | When |
| ------ | ---- | ---- |
| `404`  | `{ "error": "Task not found" }`                 | Unknown or invalid id. |
| `400`  | `{ "error": "Title cannot be empty" }`          | `title` sent as `""` or only spaces. |
| `400`  | `{ "error": "Title too long" }`                 | `title` over 200 characters. |
| `400`  | `{ "error": "completed must be true or false" }`| `completed` isn't a boolean. |
| `400`  | `{ "error": "Invalid JSON body" }`              | The body isn't valid JSON. |

**curl**

```bash
curl -X PATCH http://localhost:4000/tasks/6ae0d9e61adac664ecb33910 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'
```

> 💡 To toggle, send the opposite of the current value: `updateTask(task.id, { completed: !task.completed })`. The server has no "toggle" action, it just sets what you send.

---

### 4.6 Delete a task

```
DELETE /tasks/:id
```

**Signature**

```ts
deleteTask(id: string): Promise<void>
```

**Path parameters**

| Name | Type     | Description |
| ---- | -------- | ----------- |
| `id` | `string` | The task's `id`. |

**Response `204 No Content`**: success, with an **empty body**. Don't call `res.json()` on it or it will throw.

**Errors**

| Status | Body | When |
| ------ | ---- | ---- |
| `404`  | `{ "error": "Task not found" }` | Unknown or invalid id, including a task that was already deleted. |

**curl**

```bash
curl -X DELETE http://localhost:4000/tasks/6ae0d9e61adac664ecb33910 -i
```

> 💡 On success, remove it from state: `setTasks(prev => prev.filter(t => t.id !== id))`.

---

## 5. Errors

Every error response has the same shape, so one piece of code can handle them all:

```json
{ "error": "Human-readable message" }
```

| Status | Meaning | Messages you can get |
| ------ | ------- | -------------------- |
| `400 Bad Request` | You sent something invalid. Show the message to the user. | `Title is required`, `Title cannot be empty`, `Title too long`, `completed must be true or false`, `Invalid JSON body` |
| `404 Not Found`   | The task (or route) doesn't exist. | `Task not found`, `Route not found` (wrong URL, e.g. `/task` instead of `/tasks`) |
| `500 Internal Server Error` | A bug or database problem on the server. Check the backend terminal. | `Something went wrong` |

**No response at all** (`TypeError: Network request failed`) is not an API error. It means the app couldn't reach the server: wrong base URL, server not running, or phone on a different Wi-Fi. See [Common problems](#8-common-problems).

---

## 6. Frontend client (`lib/api.ts`)

Keep every `fetch` call in this one file so components never deal with URLs or status codes. Copy it as is:

```ts
// mobile/lib/api.ts
import type { Task, UpdateTaskInput } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

/** Thrown for any non-2xx response. `status` is the HTTP status code. */
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!BASE_URL) throw new Error('EXPO_PUBLIC_API_URL is not set in mobile/.env');

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  }

  // 204 No Content has no body, so there's nothing to parse
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  /** GET /health */
  health: (): Promise<{ ok: true }> => request('/health'),

  /** GET /tasks, optionally only done (true) or only active (false) */
  getTasks: (completed?: boolean): Promise<Task[]> =>
    request(completed === undefined ? '/tasks' : `/tasks?completed=${completed}`),

  /** GET /tasks/:id */
  getTask: (id: string): Promise<Task> => request(`/tasks/${id}`),

  /** POST /tasks */
  createTask: (title: string): Promise<Task> =>
    request('/tasks', { method: 'POST', body: JSON.stringify({ title }) }),

  /** PATCH /tasks/:id, send only the fields that change */
  updateTask: (id: string, data: UpdateTaskInput): Promise<Task> =>
    request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  /** DELETE /tasks/:id */
  deleteTask: (id: string): Promise<void> =>
    request(`/tasks/${id}`, { method: 'DELETE' }),
};
```

### Signature cheat sheet

```ts
api.health():                                        Promise<{ ok: true }>
api.getTasks(completed?: boolean):                   Promise<Task[]>
api.getTask(id: string):                             Promise<Task>
api.createTask(title: string):                       Promise<Task>
api.updateTask(id: string, data: UpdateTaskInput):   Promise<Task>
api.deleteTask(id: string):                          Promise<void>
```

Every function **rejects** (throws when awaited) with:
- `ApiError` (has `.message` and `.status`) when the server answers with an error, or
- `TypeError: Network request failed` when the server can't be reached.

---

## 7. Usage examples in components

### Load tasks with loading and error states

```tsx
const [tasks, setTasks] = useState<Task[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

const load = useCallback(async () => {
  try {
    setError(null);
    setTasks(await api.getTasks());
  } catch (e) {
    setError((e as Error).message);
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => { load(); }, [load]);
```

### Add

```ts
const addTask = async (title: string) => {
  try {
    const task = await api.createTask(title);
    setTasks((prev) => [task, ...prev]);
  } catch (e) {
    Alert.alert('Could not add task', (e as Error).message); // e.g. "Title too long"
  }
};
```

### Toggle (optimistic update)

```ts
const toggleTask = async (task: Task) => {
  // 1. Update the UI immediately
  setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
  try {
    // 2. Tell the server
    await api.updateTask(task.id, { completed: !task.completed });
  } catch {
    // 3. Put it back if the server said no
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    Alert.alert('Could not update task');
  }
};
```

### Rename

```ts
const renameTask = async (id: string, title: string) => {
  const updated = await api.updateTask(id, { title });
  setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
};
```

### Delete

```ts
const deleteTask = async (id: string) => {
  try {
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      // Already gone on the server, so remove it locally anyway
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } else {
      Alert.alert('Could not delete task');
    }
  }
};
```

### FlatList key

`id` is already a string, so no conversion is needed:

```tsx
<FlatList data={tasks} keyExtractor={(item) => item.id} ... />
```

---

## 8. Common problems

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `Network request failed` | App can't reach the server. | Check the server terminal says `API running`. Use the right base URL for your device ([section 1](#1-base-url)). Put phone and laptop on the same Wi-Fi. Open `http://<base-url>/health` in the **phone's browser** to test. |
| `EXPO_PUBLIC_API_URL is not set` | `.env` missing or Expo not restarted. | Create `mobile/.env`, then `npx expo start -c`. |
| `POST` always returns `Title is required` | `Content-Type: application/json` header missing, so the server never reads the body. | Use the `request()` helper above, which always sets it. |
| `PATCH` returns `200` but nothing changed | Same missing header: the server sees an empty update. | Same fix. |
| `completed must be true or false` | Sent `"true"` (string) instead of `true`. | Send a real boolean: `JSON.stringify({ completed: true })`. |
| `Task not found` right after creating | Using a stale or fake id (e.g. `Date.now()` from Milestone 2). | Use the `id` from the server's response. |
| `Unexpected end of JSON input` after delete | Calling `res.json()` on a `204` response. | The `request()` helper already skips parsing for `204`. |
| Server crashes on start with `Could not connect to MongoDB` | `mongod` isn't running. | `brew services start mongodb-community` |
| Type error: `number` is not assignable to `string` | Old `id: number` in `types.ts`. | IDs are strings: `id: string`. |
