# Architecture Summary - Personal To-Do Manager

## Quick Overview

This is a **simplified MVP architecture** for a personal to-do manager application with OAuth authentication, project/task management, search/filters, and WebSocket real-time notifications.

**Status**: ✅ 100% assignment requirements covered, unnecessary enterprise features removed

---

## Key Documents

| Document | Purpose |
|----------|---------|
| `docs/architecture.md` | **START HERE** - Main architecture document with simplified design |
| `docs/requirements-matrix.md` | All 50+ requirements mapped to implementation |
| `ASSIGNMENT-TO-ARCHITECTURE.md` | Detailed mapping: each assignment requirement → implementation |
| `ARCHITECTURE-REVIEW.md` | What changed, what was removed, why |
| `MISSING-REQUIREMENTS-ANALYSIS.md` | Gap analysis confirming 100% coverage |
| `docs/api-design.md` | REST API specification (reference only, use `docs/architecture.md` for MVP) |
| `docs/websocket-design.md` | WebSocket patterns and examples (reference only) |
| `docs/development-plan.md` | Development timeline (reference only, use `docs/architecture.md` for MVP) |

---

## Architecture at a Glance

### Tech Stack
- **Backend**: Express.js + TypeScript + Passport.js
- **Frontend**: React 18 + TypeScript + CSS Modules + Vite
- **Database**: PostgreSQL
- **Real-time**: Socket.io
- **Infrastructure**: Docker Compose (local development)

### Database (3 Tables)
```sql
users (provider, provider_id, email, display_name, avatar_url)
projects (user_id, name)
tasks (project_id, title, description, status, priority, due_date)
```

### API Endpoints (13 Total)
```
Auth (3):        /auth/google/callback, /auth/github/callback, /auth/logout
Projects (4):    GET/POST /api/projects, PUT/DELETE /api/projects/:id
Tasks (5):       GET/POST /api/tasks, PUT/DELETE /api/tasks/:id, PATCH /api/tasks/:id/status
Health (1):      GET /health
```

### WebSocket Events (5 Total)
```
Server → Client:
  - task_overdue: Task is overdue
  - task_due_soon: Task due within 3 days
  - notification_batch: Initial batch on connect

Client → Server:
  - subscribe: Client ready to receive notifications
  - ack_notification: Mark notification as read
```

### React Components (~20 Total)
```
Auth:           LoginPage, GoogleGitHubButtons
Layout:         AppLayout, Sidebar, NavBar
Projects:       ProjectList, ProjectForm, DeleteProjectModal
Tasks:          TaskList, TaskForm, TaskCard, TaskSearch
Notifications:  NotificationPanel, NotificationToast
Common:         LoadingSpinner, EmptyState, ErrorBoundary
```

### Testing (22+ Test Cases)
- OAuth mock test (Google, GitHub)
- Project CRUD test
- Task CRUD test
- Authorization isolation test
- Search/filter test
- WebSocket notification test

---

## What's NOT Included (Intentional)

These enterprise features were removed as they're not required by the assignment:

- ❌ User registration (OAuth only)
- ❌ RBAC / Role management
- ❌ Audit logging
- ❌ User management admin panel
- ❌ Email notifications
- ❌ Redis caching
- ❌ Message queue (RabbitMQ)
- ❌ Kubernetes deployment
- ❌ Monitoring dashboard (Prometheus/Grafana)
- ❌ API versioning (single version)
- ❌ Advanced WebSocket (presence, typing indicators)

---

## Implementation Readiness

### ✅ Ready for Development
- Database schema defined
- API endpoints specified
- WebSocket events defined
- React component structure
- Test cases identified
- Environment variables listed

### 📝 Next Steps
1. Initialize repository and project structure
2. Implement backend (Express, OAuth, database)
3. Implement REST API endpoints
4. Implement WebSocket notifications
5. Build React frontend
6. Write tests
7. Create Docker Compose
8. Document in README

### ⏱️ Estimated Timeline
- **4 weeks** for full MVP implementation
- **2-3 developers** sufficient
- **1 week** per phase:
  - Week 1: Backend setup, OAuth, basic CRUD
  - Week 2: WebSocket, frontend scaffold
  - Week 3: Full UI, integration
  - Week 4: Tests, Docker, documentation

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| OAuth only (no email auth) | Assignment requirement, simpler |
| 3 tables, no RBAC | Single-user per account, no admin features |
| Simple CASCADE delete | Not required to block deletion |
| No Redis caching | PostgreSQL sufficient for MVP |
| React Context over Redux | Simpler state for small app |
| CSS Modules | Type-safe scoped styling, lightweight |
| Vite over Webpack | Faster build, simpler config |
| 5-minute WebSocket interval | Reasonable balance, configurable |
| Socket.io over raw WebSocket | Built-in reconnection, fallbacks |
| Docker Compose only | Local run sufficient |

---

## Security Considerations

✅ **Included**:
- OAuth PKCE flow
- JWT tokens in httpOnly cookies
- Authorization checks on all endpoints
- Input validation
- SQL injection prevention (ORM)
- XSS prevention (React auto-escape)
- WebSocket authentication
- User data isolation

❌ **Not included** (MVP simplification):
- Rate limiting
- HTTPS redirect (configured via environment)
- Secrets manager (using .env)
- Advanced CORS (simple whitelist)

---

## Database Schema Details

### users
```sql
id UUID PRIMARY KEY
provider VARCHAR ('google' | 'github')
provider_user_id VARCHAR UNIQUE
email VARCHAR
display_name VARCHAR
avatar_url VARCHAR (optional)
created_at TIMESTAMP
updated_at TIMESTAMP

INDEX on (provider, provider_user_id)
```

### projects
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL (FK users.id)
name VARCHAR NOT NULL
created_at TIMESTAMP
updated_at TIMESTAMP

INDEX on (user_id)
```

### tasks
```sql
id UUID PRIMARY KEY
project_id UUID NOT NULL (FK projects.id ON DELETE CASCADE)
title VARCHAR NOT NULL
description TEXT
status ENUM ('TODO', 'IN_PROGRESS', 'DONE') DEFAULT 'TODO'
priority ENUM ('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM'
due_date DATE
created_at TIMESTAMP
updated_at TIMESTAMP

INDEX on (project_id)
INDEX on (user_id, status)  -- for queries
INDEX on (user_id, due_date)  -- for notifications
```

---

## API Endpoint Summary

### Authentication
- `GET /auth/google/callback?code=...` - Google OAuth callback
- `GET /auth/github/callback?code=...` - GitHub OAuth callback
- `POST /auth/logout` - Logout (requires JWT)

### Projects
- `GET /api/projects` - List user's projects (requires JWT)
- `POST /api/projects` - Create project (requires JWT)
- `PUT /api/projects/:id` - Rename project (requires JWT)
- `DELETE /api/projects/:id` - Delete project (requires JWT)

### Tasks
- `GET /api/tasks?search=...&status=...&priority=...&dueDateFilter=...` - List/filter (JWT)
- `POST /api/tasks` - Create task (JWT)
- `PUT /api/tasks/:id` - Update task (JWT)
- `DELETE /api/tasks/:id` - Delete task (JWT)
- `PATCH /api/tasks/:id/status` - Quick status change (JWT)

### Health
- `GET /health` - Health check (no auth)

---

## WebSocket Events Detail

### Server → Client

**task_overdue**
```javascript
{
  taskId: "uuid",
  title: "Fix bug in login",
  dueDate: "2024-01-10",
  projectName: "Project A"
}
```

**task_due_soon**
```javascript
{
  taskId: "uuid",
  title: "Review PR",
  daysUntil: 2,
  dueDate: "2024-01-17",
  projectName: "Project B"
}
```

**notification_batch** (on connect)
```javascript
{
  overdue: [ /* task_overdue objects */ ],
  dueSoon: [ /* task_due_soon objects */ ]
}
```

### Client → Server

**subscribe** (after connect)
```javascript
{
  interval: 5,  // Check every 5 minutes (minutes)
  types: ['overdue', 'dueSoon']  // Notification types
}
```

**ack_notification** (mark read)
```javascript
{
  notificationId: "uuid",
  taskId: "uuid"
}
```

---

## Environment Variables Required

### Backend
```
DATABASE_URL=postgresql://user:pass@db:5432/todo_db
JWT_SECRET=your_jwt_secret_here
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend
```
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

---

## Testing Strategy

### Unit Tests (Services, Utils)
- OAuth helper functions
- Date filter logic
- Validation functions
- WebSocket message formatting

### Integration Tests (API)
- OAuth login flow
- Project CRUD with authorization
- Task CRUD with authorization
- WebSocket connection and notifications

### E2E Tests (UI + Backend)
- User login → create project → create task
- Search and filter workflow
- WebSocket notification display
- Authorization boundary (can't access other user's data)

### Test Coverage Goal
- Minimum 70% for MVP
- Focus on:
  - Authorization (critical)
  - WebSocket (new feature)
  - CRUD operations (core feature)

---

## Deployment Checklist

### Local Development
```bash
# 1. Setup database
docker-compose up -d db
npm run migrate
npm run seed

# 2. Start backend
npm run dev:backend

# 3. Start frontend (separate terminal)
npm run dev:frontend

# 4. Run tests
npm test
```

### Docker Compose (Production-like)
```bash
docker-compose up
# Includes: PostgreSQL, backend, frontend (Nginx)
```

### Manual Checks
- [ ] Can login with Google
- [ ] Can login with GitHub
- [ ] Can create project
- [ ] Can create task with all fields
- [ ] Can search and filter tasks
- [ ] WebSocket notifications appear
- [ ] Tests pass
- [ ] No console errors
- [ ] Responsive on mobile

---

## Git Repository Structure

```
project/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── server.ts
│   ├── tests/
│   ├── db/migrations/
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── context/
│   │   └── App.tsx
│   ├── tests/
│   ├── Dockerfile
│   ├── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   ├── architecture.md
│   ├── requirements-matrix.md
│   ├── api-design.md
│   ├── websocket-design.md
│   └── development-plan.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
└── CHANGELOG.md
```

---

## How to Use These Documents

1. **Start**: Read `docs/architecture.md` for complete system design
2. **Reference**: Use `ASSIGNMENT-TO-ARCHITECTURE.md` when implementing specific features
3. **Verify**: Check `MISSING-REQUIREMENTS-ANALYSIS.md` for requirement coverage
4. **Understand**: Read `ARCHITECTURE-REVIEW.md` for design decisions
5. **Extend**: Use `docs/api-design.md` and `docs/websocket-design.md` for advanced patterns

---

## Summary

✅ **What We Have**:
- Simplified architecture for personal to-do manager MVP
- 100% coverage of assignment requirements
- Clear implementation path for all features
- Focused tech stack (no unnecessary complexity)
- Ready for 4-week development cycle

✅ **What We Removed**:
- Enterprise features (RBAC, audit logging, monitoring)
- Unnecessary infrastructure (Kubernetes, Redis, RabbitMQ)
- Features not in assignment (email auth, MFA, sharing)

✅ **What's Ready to Build**:
- 3-table database schema
- 13 API endpoints
- 5 WebSocket events
- 20 React components
- 22+ test cases
- Docker Compose setup

**Next**: Follow `docs/architecture.md` to begin implementation.
