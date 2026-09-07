# Simplified Architecture - Personal To-Do Manager

## 1. Technology Stack

### Backend
- **Runtime**: Node.js (LTS)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **Real-time**: Socket.io
- **OAuth**: Passport.js

### Frontend
- **Framework**: React 18+
- **Language**: TypeScript
- **State Management**: React Context + Hooks / TanStack Query
- **Styling**: CSS Modules
- **Real-time**: Socket.io client
- **Build Tool**: Vite

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Testing**: Jest + Supertest (backend), Vitest (frontend)

---

## 2. Core Architecture

### System Overview

```
┌─────────────────────────────────────────────┐
│          React SPA (Frontend)                │
│  ┌─────────────────────────────────────┐   │
│  │ OAuth Login | Sidebar | Task List    │   │
│  │ Notifications | Search/Filters       │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
           │                      │
           │ HTTP REST API        │ WebSocket
           ▼                      ▼
┌─────────────────────────────────────────────┐
│       Express.js Backend                     │
│  ┌─────────────────────────────────────┐   │
│  │ OAuth Routes (Google, GitHub)        │   │
│  │ Project/Task CRUD (with auth)        │   │
│  │ WebSocket Handler (notifications)    │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ Middleware: Auth, Validation, CORS   │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ Services: Projects, Tasks, Auth      │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ DB Models: Users, Projects, Tasks    │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│    PostgreSQL Database                       │
│  users | projects | tasks                    │
└─────────────────────────────────────────────┘
```

---

## 3. Database Design

### Schema

```sql
-- Users table
users (
  id: UUID PRIMARY KEY,
  provider: 'google' | 'github',
  provider_user_id: VARCHAR UNIQUE,
  email: VARCHAR,
  display_name: VARCHAR,
  avatar_url: VARCHAR (optional),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)

-- Projects table
projects (
  id: UUID PRIMARY KEY,
  user_id: UUID (FK to users),
  name: VARCHAR,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  INDEX on (user_id)
)

-- Tasks table
tasks (
  id: UUID PRIMARY KEY,
  project_id: UUID (FK to projects),
  title: VARCHAR,
  description: TEXT,
  status: 'TODO' | 'IN_PROGRESS' | 'DONE',
  priority: 'LOW' | 'MEDIUM' | 'HIGH',
  due_date: DATE,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  INDEX on (project_id),
  INDEX on (user_id, status),
  INDEX on (user_id, due_date)
)
```

### Key Points
- Users linked to OAuth providers (no password storage)
- Projects belong to users (data isolation)
- Tasks belong to projects (cascade delete on project delete)
- Indexes on frequently queried fields (user_id, status, due_date)

### Task Status and Priority Values

**Database/API representation** (constant values):
- Status: `TODO`, `IN_PROGRESS`, `DONE` (uppercase with underscores)
- Priority: `LOW`, `MEDIUM`, `HIGH` (uppercase)

**UI display labels** (human-readable):
- Status: "To Do", "In Progress", "Done"
- Priority: "Low", "Medium", "High"

**Note**: API always uses database format (TODO, IN_PROGRESS, DONE). Frontend translates to UI labels for display.

---

## 4. Authentication Design

### OAuth Flow

```
User clicks "Continue with Google/GitHub"
                │
                ▼
        Redirect to OAuth Provider
                │
        User authorizes app
                │
                ▼
        Provider redirects with code
                │
                ▼
        Backend exchanges code for token
                │
                ▼
        Backend fetches user profile
                │
                ▼
        Backend upserts user in DB
                │
                ▼
        Backend creates session/JWT
                │
                ▼
        Redirect to frontend with token in httpOnly cookie
                │
                ▼
        Frontend authenticated via cookie
                │
                ▼
        Token persists across page refresh (cookie survives)
                │
                ▼
        Frontend authenticated until logout
```

### Session Management
- **Access Token**: JWT (issued on OAuth callback)
- **Storage**: httpOnly cookie only (secure, auto-sent by browser)
- **Expiration**: Long-lived (no forced re-auth for MVP)
- **Logout**: Clear cookie + backend invalidation

### Implementation
- Passport.js for OAuth strategy management
- JWT for session tokens
- httpOnly cookies to prevent XSS (tokens never accessible to JavaScript)

---

## 5. API Design

### Minimal REST Endpoints

```
Authentication:
  GET  /auth/google/callback
  GET  /auth/github/callback
  POST /auth/logout

Projects (auth required):
  GET    /api/projects               (list user's projects)
  POST   /api/projects               (create project)
  PUT    /api/projects/:id           (rename project)
  DELETE /api/projects/:id           (delete project + tasks)

Tasks (auth required):
  GET    /api/tasks                  (list tasks by project/filter)
  POST   /api/tasks                  (create task)
  PUT    /api/tasks/:id              (update task)
  DELETE /api/tasks/:id              (delete task)
  PATCH  /api/tasks/:id/status       (quick status change)

Health:
  GET    /health
```

### Request/Response Format

```json
Success (200):
{
  "success": true,
  "data": { /* resource */ }
}

Error (4xx/5xx):
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### Authorization
- Every endpoint validates JWT token
- Endpoints verify user owns the resource (project/task)
- Return 403 Forbidden if user accesses another user's data

---

## 6. WebSocket Design

### Connection

```
Client connects with JWT token in query/header
         │
         ▼
Server validates token and loads user context
         │
         ▼
Server sends CONNECT_ACK with user data
         │
         ▼
Client ready to receive notifications
```

### Notification Events

**Server → Client**:

```javascript
'task_overdue' {
  taskId: UUID,
  title: string,
  dueDate: date
}

'task_due_soon' {
  taskId: UUID,
  title: string,
  daysUntil: number,
  dueDate: date
}

'notification_batch' {
  overdue: [...],
  dueSoon: [...]
}
```

**Client → Server**:

```javascript
'subscribe' {
  // Sent after connect to confirm client ready
  // Optional: subscribe({ notificationInterval: 5 })
}

'ack_notification' {
  notificationId: UUID
  // Mark notification as read/acknowledged
}
```

### Scheduling
- On connect: Server sends initial batch of overdue + due soon tasks
- Every 5 minutes: Server re-checks and sends updates
- Triggered by: Task status change, task due date change, task creation

---

## 7. Frontend Architecture

### Directory Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── GoogleGitHubButtons.tsx
│   │   ├── Layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── NavBar.tsx
│   │   ├── Projects/
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectForm.tsx
│   │   │   └── DeleteProjectModal.tsx
│   │   ├── Tasks/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   └── TaskSearch.tsx
│   │   ├── Notifications/
│   │   │   ├── NotificationPanel.tsx
│   │   │   └── NotificationToast.tsx
│   │   └── Common/
│   │       ├── LoadingSpinner.tsx
│   │       ├── EmptyState.tsx
│   │       └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useProjects.ts
│   │   ├── useTasks.ts
│   │   ├── useWebSocket.ts
│   │   └── useNotifications.ts
│   ├── services/
│   │   ├── api.ts (HTTP client with interceptors)
│   │   ├── websocket.ts (Socket.io setup)
│   │   └── auth.ts
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── NotificationContext.tsx
│   ├── types/
│   │   ├── auth.ts
│   │   ├── project.ts
│   │   ├── task.ts
│   │   └── notification.ts
│   ├── utils/
│   │   ├── dateHelpers.ts
│   │   ├── filterHelpers.ts
│   │   └── validation.ts
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   ├── components/
│   ├── hooks/
│   └── services/
├── vite.config.ts
├── package.json
└── tsconfig.json
```

### State Management
- **AuthContext**: User state, tokens, login/logout
- **NotificationContext**: Notifications from WebSocket
- **React Query**: Optional for server state (projects, tasks)
- **Local state**: UI state (filters, search, modals)

### Key Pages
1. **Login Page**: OAuth buttons
2. **Dashboard**: Sidebar + Task List + Notifications
3. **Task Detail/Edit Modal**: Create/edit tasks

---

## 8. Testing Strategy

### Framework & Tools
- **Backend**: Jest + Supertest
  - Jest for unit and integration tests
  - Supertest for HTTP request testing
  - Socket.io test client for WebSocket tests
- **Frontend**: Vitest
  - Vitest for component and unit tests
  - Mocked Socket.io client for WebSocket tests

### Unit Tests
- **Services**: API client, auth helpers, date utilities
- **Utils**: Filter logic, validation functions
- **Coverage Target**: 70%+

### Integration Tests

**Backend (Jest + Supertest)**:
- **OAuth flow**: Mock OAuth provider response via Passport
- **Project CRUD**: Create, read, update, delete operations with authorization
- **Task CRUD**: Task operations with authorization checks
- **Authorization**: User cannot access another user's data
- **WebSocket**: Socket.io integration with mocked client connections

**Frontend (Vitest)**:
- **API service**: Mock fetch calls, verify request/response
- **WebSocket client**: Mock Socket.io, verify event listeners
- **Components**: Render with mock data, verify user interactions

### E2E Tests (Manual or Selenium)
- **Login flow**: User logs in with mock OAuth
- **Create project + task**: Full workflow
- **Search/filters**: Filter tasks by status, priority, due date
- **WebSocket notifications**: Real-time updates during user session

### Critical Test Cases
```typescript
// OAuth login success path
test('User can login with Google', () => { ... })
test('User can login with GitHub', () => { ... })

// Authorization isolation
test('User cannot access another user projects', () => { ... })
test('User cannot access another user tasks', () => { ... })

// Task operations
test('User can create a project and task', () => { ... })
test('User can filter tasks by status', () => { ... })

// WebSocket (Socket.io integration test)
test('User receives overdue task notification', () => { ... })
test('User receives due soon task notification', () => { ... })
test('User can acknowledge notification', () => { ... })
```

---

## 9. Deployment

### Local Development
```bash
# Start PostgreSQL
docker-compose up -d db

# Run migrations
npm run migrate

# Seed sample data
npm run seed

# Start backend
npm run dev:backend

# Start frontend (separate terminal)
npm run dev:frontend
```

### Docker Compose (Production-like)
```yaml
services:
  db:
    image: postgres:14
    volumes:
      - postgres_data:/var/lib/postgresql/data
  backend:
    build: ./backend
    depends_on: [db]
    environment: [DB_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET]
  frontend:
    build: ./frontend
    ports: ["80:3000"]
```

### Environment Variables Required
```
Backend:
  DATABASE_URL=postgresql://user:pass@db:5432/todo_db
  JWT_SECRET=your_jwt_secret
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  GITHUB_CLIENT_ID=...
  GITHUB_CLIENT_SECRET=...
  FRONTEND_URL=http://localhost:3000

Frontend:
  VITE_API_URL=http://localhost:5000
```

---

## 10. Security Considerations

### Data Protection
- **OAuth tokens**: Stored in secure httpOnly cookies (not accessible to JavaScript)
- **Sensitive data**: User email, avatar URL (from OAuth provider)
- **Database**: No passwords stored (OAuth only)

### API Security
- **Authentication**: JWT token verified from httpOnly cookie on all protected endpoints
- **Authorization**: User isolation - verify user_id matches
- **CORS**: Frontend origin whitelisted
- **Input validation**: All inputs validated before DB operations
- **SQL injection prevention**: Prisma ORM prevents via parameterized queries
- **XSS prevention**: React auto-escapes, sanitize user input

### WebSocket Security
- **Authentication**: JWT token verified from query/header on connect
- **Authorization**: Only send notifications for user's own tasks
- **Data isolation**: Each user's room is separate

---

## 11. Database Constraints & Queries

### Key Constraints
- User can only see their own projects/tasks
- Project deletion cascades to tasks
- Task due date cannot be in invalid format

### Optimized Queries
- Get tasks for user with filters: `SELECT * FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE user_id = ?) AND status = ? ORDER BY due_date`
- Get overdue tasks: `SELECT * FROM tasks WHERE status != 'DONE' AND due_date < TODAY()`
- Get due soon tasks: `SELECT * FROM tasks WHERE status != 'DONE' AND due_date BETWEEN TODAY() AND TODAY() + 3 days`

---

## 12. What Was NOT Included (Simplified Out)

- ❌ Role-based access control (RBAC) - single user per account
- ❌ User management/admin panel - no admin features
- ❌ Rate limiting middleware - MVP simplification
- ❌ Redis caching - PostgreSQL sufficient for single user per session
- ❌ Message queue (RabbitMQ) - no async job processing needed
- ❌ Multiple environments/secrets management - .env files only
- ❌ Kubernetes deployment - Docker Compose for local run
- ❌ Monitoring (Prometheus/Grafana) - logging only
- ❌ API versioning - single version (v1)
- ❌ Advanced WebSocket features (presence, typing indicators)
- ❌ Dark mode, accessibility WCAG compliance, etc.

---

## 13. What IS Included (Minimum MVP)

✅ **Core Features**
- OAuth authentication (Google, GitHub)
- Project management (CRUD)
- Task management (CRUD with status/priority/due date)
- Search and filters (by title, description, status, priority, due date)

✅ **Real-time**
- WebSocket notifications (overdue, due soon)
- Periodic check every 5 minutes
- Client-side acknowledgment

✅ **Frontend**
- Modern, responsive UI (CSS Modules)
- OAuth login buttons
- Sidebar navigation
- Task list with filters
- Task create/edit modals
- Notification panel

✅ **Backend**
- Express.js REST API
- Passport.js OAuth integration
- PostgreSQL database
- Socket.io WebSocket
- Authorization checks on all endpoints

✅ **Testing**
- Unit tests for services/utils
- Integration tests for auth & CRUD
- E2E tests for critical flows
- WebSocket notification tests

✅ **Documentation**
- README with setup instructions
- OAuth configuration guide
- WebSocket message format documentation
- API endpoint list

---

## Summary

This is a **focused MVP architecture** that:
- **Eliminates enterprise complexity**: No RBAC, no audit logging, no multi-tenancy
- **Focuses on core requirements**: OAuth, CRUD, WebSocket notifications
- **Keeps stack minimal**: Express + React + PostgreSQL + Socket.io
- **Enables fast development**: ~4 weeks for full implementation
- **Remains testable**: Unit, integration, and E2E coverage
- **Is deployable**: Docker Compose works locally

**Total scope**: 2-3 tables, ~15 API endpoints, ~20 React components, 5+ test suites
