# Personal To-Do Manager

A full-stack MVP for managing personal tasks with real-time notifications.

## Features

- **OAuth Authentication**: Google and GitHub login
- **Project Management**: Create, rename, delete projects
- **Task Management**: Create, edit, delete tasks with status, priority, and due dates
- **Search & Filters**: Find tasks by title/description, filter by status/priority/due date
- **Real-Time Notifications**: WebSocket notifications for overdue and upcoming tasks
- **Data Isolation**: Each user sees only their own projects and tasks

## Tech Stack

- **Backend**: Node.js, Express.js, TypeScript, PostgreSQL, Prisma ORM, Socket.IO
- **Frontend**: React 18, TypeScript, Vite, CSS Modules
- **Testing**: Jest, Supertest (backend), Vitest (frontend)
- **Infrastructure**: Docker Compose (optional)

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd personal-todo-manager
   ```

2. **Install dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Set up environment variables**
   
   Create `backend/.env` from `backend/.env.example`:
   ```bash
   cp backend/.env.example backend/.env
   ```

   Fill in your OAuth credentials:
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from [Google Cloud Console](https://console.cloud.google.com/)
   - `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` from [GitHub Settings > Developer settings](https://github.com/settings/developers)
   - `DATABASE_URL` pointing to your PostgreSQL instance
   - `JWT_SECRET` (any random string for local development)

4. **Initialize the database**
   ```bash
   cd backend
   npm run migrate
   npm run seed  # Optional: populate with sample data
   ```

5. **Start the backend**
   ```bash
   cd backend
   npm run dev
   # Server starts on http://localhost:5000
   ```

6. **Start the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm run dev
   # Frontend starts on http://localhost:3000
   ```

## API Endpoints

### Authentication
- `GET /auth/google/callback` — Google OAuth callback
- `GET /auth/github/callback` — GitHub OAuth callback
- `POST /auth/logout` — Clear session
- `GET /auth/me` — Get current user

### Projects
- `GET /api/projects` — List user's projects
- `POST /api/projects` — Create project (body: `{ name: string }`)
- `PUT /api/projects/:id` — Rename project (body: `{ name: string }`)
- `DELETE /api/projects/:id` — Delete project (cascade deletes tasks)

### Tasks
- `GET /api/tasks` — List tasks with filters
  - Query params:
    - `search: string` — Search by title/description
    - `status: TODO | IN_PROGRESS | DONE` — Filter by status
    - `priority: LOW | MEDIUM | HIGH` — Filter by priority
    - `dueDateFilter: OVERDUE | TODAY | NEXT_7_DAYS | ALL` — Filter by due date
- `POST /api/tasks` — Create task
  ```json
  {
    "project_id": "uuid",
    "title": "string",
    "description": "string (optional)",
    "status": "TODO",
    "priority": "HIGH",
    "due_date": "YYYY-MM-DD (optional)"
  }
  ```
- `PUT /api/tasks/:id` — Update task (any field above)
- `PATCH /api/tasks/:id/status` — Quick status change (body: `{ status: "TODO" | "IN_PROGRESS" | "DONE" }`)
- `DELETE /api/tasks/:id` — Delete task

## WebSocket Notifications

The app uses WebSocket (Socket.IO) for real-time task notifications.

### Connection

The client connects automatically when logged in. The connection uses the `auth_token` httpOnly cookie for authentication:

```javascript
// Frontend automatically handles this
import { connectWebSocket } from './services/websocket';
await connectWebSocket();
```

### Server → Client Events

**`notification_batch`** — Sent on connect and periodically (every 5 minutes)
```json
{
  "overdue": [
    {
      "type": "overdue",
      "task_id": "uuid",
      "title": "Task title",
      "due_date": "2026-01-01T00:00:00Z"
    }
  ],
  "due_soon": [
    {
      "type": "due_soon",
      "task_id": "uuid",
      "title": "Task title",
      "days_until": 2,
      "due_date": "2026-01-03T00:00:00Z"
    }
  ]
}
```

**Notification Types**:
- `overdue` — Task's due date is in the past and status ≠ DONE
- `due_soon` — Task's due date is within 3 days (inclusive) and status ≠ DONE

### Client → Server Events

**`subscribe`** — Sent after connection to confirm ready
```json
{ }
```

**`ack_notification`** — Mark a notification as acknowledged
```json
{
  "task_id": "uuid"
}
```

### Configuration

The notification check interval is configurable via the `NOTIFICATION_INTERVAL_MS` environment variable (default: 300000 = 5 minutes).

## Testing

### Backend
```bash
cd backend
npm test                 # Run all tests
npm run test:watch      # Watch mode
```

Tests cover:
- OAuth login (mocked provider response)
- Project CRUD operations and authorization
- Task CRUD operations, search, and filters
- WebSocket authentication and notifications
- Cross-user data isolation

### Frontend
```bash
cd frontend
npm test                # Run tests
npm run test:watch     # Watch mode
```

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/          # Database, Passport, WebSocket setup
│   │   ├── middleware/      # Auth, error handling
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic (projects, tasks, auth, notifications)
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Shared utilities (JWT parsing)
│   │   ├── __tests__/       # Integration tests
│   │   └── index.ts         # Entry point
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/      # DB migrations
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # React hooks (useAuth, useWebSocket, etc.)
│   │   ├── context/         # Context providers (Auth, Notifications)
│   │   ├── services/        # API and WebSocket services
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx
│   └── package.json
└── README.md
```

## Authorization & Security

- **JWT Tokens**: Stored in secure httpOnly cookies (not accessible to JavaScript)
- **Authentication**: Required for all `/api/*` and WebSocket connections
- **Authorization**: Every endpoint verifies user owns the resource (project or task)
- **Input Validation**: All user inputs validated before database operations
- **XSS Prevention**: React auto-escapes content; no `dangerouslySetInnerHTML` without sanitization
- **SQL Injection Prevention**: Prisma ORM uses parameterized queries

## Deployment

### Docker Compose (Optional)

```bash
docker-compose up
```

This starts:
- PostgreSQL database
- Backend API
- Frontend

See `docker-compose.yml` for configuration details.

### Environment Variables (Production)

Required for deployment:
- `NODE_ENV=production`
- `JWT_SECRET` — Use a strong random value
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth credentials
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — OAuth credentials
- `DATABASE_URL` — PostgreSQL connection string
- `FRONTEND_URL` — Frontend origin for CORS and redirects
- `NOTIFICATION_INTERVAL_MS` — WebSocket notification interval (default: 300000)

## Troubleshooting

### Port Already in Use
```bash
# Kill the process using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows
taskkill /PID <PID> /F
```

### Database Connection Failed
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` in `.env` is correct
- Run `npm run migrate:dev` to create/update tables

### OAuth Login Not Working
- Verify `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` are filled in `.env`
- Verify callback URLs in OAuth provider settings match:
  - `GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback`
  - `GITHUB_CALLBACK_URL=http://localhost:5000/auth/github/callback`
- Check browser console for errors

### WebSocket Connection Issues
- Ensure backend is running with Socket.IO initialized
- Verify frontend is logged in (auth_token cookie present)
- Check browser console WebSocket connection status

## License

MIT

## Support

For issues or questions, please open a GitHub issue.
