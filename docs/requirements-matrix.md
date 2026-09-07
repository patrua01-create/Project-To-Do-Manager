# Requirements Matrix - Personal To-Do Manager

## Summary
This project is a **Personal To-Do Manager** MVP with the following scope:
- **Users**: Multi-user with single sign-on (OAuth)
- **Data Isolation**: No sharing; each user sees only their data
- **Core Features**: Projects, tasks, search, filters, WebSocket notifications
- **Timeline**: ~4 weeks development
- **Stack**: Node.js/Express, React, PostgreSQL, Socket.io

---

## Functional Requirements

### FR-1: Authentication & Authorization

| ID | Requirement | Priority | Status | Component | Test Case |
|----|-------------|----------|--------|-----------|-----------|
| FR-1.1 | Support Google OAuth (OpenID Connect) | P1 | Design | Passport.js + Backend | Login with Google mock |
| FR-1.2 | Support GitHub OAuth | P1 | Design | Passport.js + Backend | Login with GitHub mock |
| FR-1.3 | Logout functionality | P1 | Design | Auth service + UI | User can logout |
| FR-1.4 | Persistent session across page refresh | P1 | Design | JWT + httpOnly cookie | Token persistence test |
| FR-1.5 | User profile storage (provider, ID, email, display_name, avatar) | P1 | Design | DB schema + Passport | Profile stored correctly |
| FR-1.6 | Authorization: Users see only their own data | P1 | Design | Middleware + Services | User cannot access other user's projects |

---

### FR-2: Project Management

| ID | Requirement | Priority | Status | Component | Test Case |
|----|-------------|----------|--------|-----------|-----------|
| FR-2.1 | Create projects/lists | P1 | Design | API + UI | User can create project |
| FR-2.2 | Rename projects/lists | P1 | Design | API + UI | User can rename project |
| FR-2.3 | Delete projects/lists | P1 | Design | API + UI | User can delete project |
| FR-2.4 | Delete strategy: Cascade delete tasks | P1 | Design | DB schema | Deleting project deletes tasks |

---

### FR-3: Task Management

| ID | Requirement | Priority | Status | Component | Test Case |
|----|-------------|----------|--------|-----------|-----------|
| FR-3.1 | Create tasks with: title, description, status, priority, due date | P1 | Design | API + UI | User can create task |
| FR-3.2 | Edit task fields | P1 | Design | API + UI | User can edit task |
| FR-3.3 | Delete tasks | P1 | Design | API + UI | User can delete task |
| FR-3.4 | Quick status change from task list | P1 | Design | UI + API | User can change status inline |
| FR-3.5 | Task status values: TODO, IN_PROGRESS, DONE | P1 | Design | DB schema | Status enum validated |
| FR-3.6 | Task priority values: LOW, MEDIUM, HIGH | P1 | Design | DB schema | Priority enum validated |

---

### FR-4: Search & Filtering

| ID | Requirement | Priority | Status | Component | Test Case |
|----|-------------|----------|--------|-----------|-----------|
| FR-4.1 | Search tasks by title and description | P1 | Design | API + UI | Search finds matching tasks |
| FR-4.2 | Filter by status (TODO, IN_PROGRESS, DONE) | P1 | Design | API + UI | Filter shows correct tasks |
| FR-4.3 | Filter by priority (LOW, MEDIUM, HIGH) | P1 | Design | API + UI | Filter shows correct tasks |
| FR-4.4 | Filter by due date: overdue, today, next 7 days, all | P1 | Design | API + UI | Each category returns correct tasks |

---

### FR-5: Real-time WebSocket Notifications

| ID | Requirement | Priority | Status | Component | Test Case |
|----|-------------|----------|--------|-----------|-----------|
| FR-5.1 | WebSocket server sends overdue task notifications | P1 | Design | Socket.io backend | Notification sent for overdue tasks |
| FR-5.2 | WebSocket server sends due soon notifications (within 3 days) | P1 | Design | Socket.io backend | Notification sent for due soon tasks |
| FR-5.3 | Initial notification batch on connect | P1 | Design | Socket.io backend | Client receives batch on connection |
| FR-5.4 | Periodic checks (every 5 minutes, configurable) | P1 | Design | Socket.io backend | Notifications sent periodically |
| FR-5.5 | WebSocket authorization: Only user's own notifications | P1 | Design | Socket.io middleware | User only receives own notifications |
| FR-5.6 | Client sends subscribe message (two-way communication) | P1 | Design | Socket.io client | Client can send subscribe message |
| FR-5.7 | Client sends ack message to mark read (two-way communication) | P1 | Design | Socket.io client | Client can acknowledge notifications |
| FR-5.8 | Display notifications in UI (toast, banner, or panel) | P1 | Design | React component | Notifications visible to user |

---

### FR-6: Frontend UI Requirements

| ID | Requirement | Priority | Status | Component | Test Case |
|----|-------------|----------|--------|-----------|-----------|
| FR-6.1 | Login screen with "Continue with Google" button | P1 | Design | React component | Button visible and clickable |
| FR-6.2 | Login screen with "Continue with GitHub" button | P1 | Design | React component | Button visible and clickable |
| FR-6.3 | Main layout: Left sidebar for projects, main area for tasks | P1 | Design | React layout | Layout renders correctly |
| FR-6.4 | Task list view for selected project | P1 | Design | React component | Tasks display for selected project |
| FR-6.5 | Task create/edit UI (modal, drawer, or page) | P1 | Design | React component | User can create/edit tasks |
| FR-6.6 | Search input accessible from task list | P1 | Design | React component | Search input present |
| FR-6.7 | Filter controls accessible from task list | P1 | Design | React component | Filters present |
| FR-6.8 | Notifications UI visible (toast, banner, or panel) | P1 | Design | React component | Notifications display |
| FR-6.9 | Responsive design: Sidebar collapses on narrow screens | P1 | Design | CSS (CSS Modules) | Mobile view responsive |
| FR-6.10 | Consistent spacing and typography | P1 | Design | CSS/components | Visual consistency |
| FR-6.11 | Visible hover and focus states | P1 | Design | CSS | Interactive feedback |
| FR-6.12 | Empty states for no tasks and no search results | P1 | Design | React component | Empty states display |
| FR-6.13 | Loading state for main screens/data blocks | P1 | Design | React component | Loading spinners show |
| FR-6.14 | Client-side form validation feedback | P1 | Design | React component | Validation errors display |

---

### FR-7: Backend API Requirements

| ID | Requirement | Priority | Status | Component | Test Case |
|----|-------------|----------|--------|-----------|-----------|
| FR-7.1 | REST API for authentication (OAuth callbacks) | P1 | Design | Express routes | OAuth flow works |
| FR-7.2 | REST API for projects (CRUD) | P1 | Design | Express routes | CRUD operations work |
| FR-7.3 | REST API for tasks (CRUD) | P1 | Design | Express routes | CRUD operations work |
| FR-7.4 | Authorization enforcement: Verify user owns resource | P1 | Design | Middleware | User cannot access others' data |
| FR-7.5 | WebSocket authorization enforcement | P1 | Design | Socket.io middleware | WS auth validated |
| FR-7.6 | Input validation with clear error messages | P1 | Design | Validation middleware | Invalid input rejected clearly |
| FR-7.7 | Secure OAuth implementation | P1 | Design | Passport.js + PKCE | OAuth flow secure |
| FR-7.8 | Environment variable configuration for OAuth | P1 | Design | .env file | Credentials configured via env vars |

---

### FR-8: Database Requirements

| ID | Requirement | Priority | Status | Component | Test Case |
|----|-------------|----------|--------|-----------|-----------|
| FR-8.1 | Database: PostgreSQL | P1 | Design | Infrastructure | DB runs and connects |
| FR-8.2 | User data persistence | P1 | Design | DB schema | User records saved |
| FR-8.3 | Project data persistence | P1 | Design | DB schema | Project records saved |
| FR-8.4 | Task data persistence | P1 | Design | DB schema | Task records saved |
| FR-8.5 | Data isolation: Users see only their own data | P1 | Design | DB queries + FK | Queries filter by user_id |
| FR-8.6 | Seed data or sample data functionality | P1 | Design | DB seed script | Sample data can be created |

---

## Non-Functional Requirements

### NFR-1: Performance (MVP-Level)

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| NFR-1.1 | API response time (typical) | < 500ms | P2 |
| NFR-1.2 | WebSocket notification latency | < 1 second | P2 |
| NFR-1.3 | Page load time | < 5s | P2 |
| NFR-1.4 | Support concurrent users | 10+ simultaneous | P2 |

---

### NFR-2: Security

| ID | Requirement | Standard | Priority |
|----|-------------|----------|----------|
| NFR-2.1 | HTTPS / TLS in production | Required | P1 |
| NFR-2.2 | OAuth tokens in secure httpOnly cookies | Required | P1 |
| NFR-2.3 | No passwords stored (OAuth only) | Design pattern | P1 |
| NFR-2.4 | SQL injection prevention (Prisma ORM) | Required | P1 |
| NFR-2.5 | XSS prevention (React auto-escape) | Design pattern | P1 |
| NFR-2.6 | Authorization checks on all endpoints | Code review | P1 |
| NFR-2.7 | WebSocket authentication required | Required | P1 |

---

### NFR-3: Testing

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| NFR-3.1 | OAuth login mock test | Implemented | P1 |
| NFR-3.2 | User create project and task test | Implemented | P1 |
| NFR-3.3 | Authorization isolation test | Implemented | P1 |
| NFR-3.4 | WebSocket notification test | Implemented | P1 |
| NFR-3.5 | Overall test coverage | 70%+ | P2 |

---

### NFR-4: Maintainability

| ID | Requirement | Standard | Priority |
|----|-------------|----------|----------|
| NFR-4.1 | TypeScript for type safety | Required | P1 |
| NFR-4.2 | API documentation (README section or OpenAPI) | Required | P1 |
| NFR-4.3 | Code is readable and well-organized | Code review | P1 |
| NFR-4.4 | Setup instructions sufficient for another developer | README | P1 |

---

## Mapping: Assignment Requirements → Architecture

| Assignment Section | What It Requires | How We Build It |
|-------------------|-----------------|-----------------|
| Core rules | Multi-user, data isolation, no sharing | User FK on projects/tasks, auth checks |
| Auth (2.1) | SSO (Google, GitHub), logout, persistence | Passport.js OAuth, JWT, httpOnly cookies |
| Projects (2.2) | Create, rename, delete (cascade) | REST API, DB FK, cascade delete |
| Tasks (2.3) | CRUD with title, desc, status, priority, due date | REST API, full schema |
| Search/Filters (2.4) | Search title/desc, filter status/priority/due date | API query parameters, React filters |
| WebSocket (2.5) | Overdue + due soon notifications, 2-way communication | Socket.io server/client, initial batch + periodic |
| UI (3) | Modern, responsive, styled, all required screens | React + CSS Modules, all components |
| Backend (4) | REST API, auth enforcement, input validation | Express, middleware, Passport |
| Database (5) | PostgreSQL, seed data | Schema with migrations, seed script |
| Quality (6) | Tests: auth, CRUD, auth isolation, WebSocket | Jest + test cases |
| Deliverables (7) | Git repo, README, OAuth guide, API docs, WebSocket docs, tests | All documented |

---

## What Was Removed (Not in Assignment)

❌ **Enterprise features** (not required):
- User management admin panel
- Role-based access control (RBAC)
- Audit logging
- User activity tracking
- Bulk operations
- Email-based authentication (only OAuth)
- MFA (multi-factor authentication)
- Advanced permission system
- Rate limiting middleware

❌ **DevOps/Infrastructure** (out of scope for MVP):
- Kubernetes deployment
- Redis caching
- Message queue (RabbitMQ)
- Advanced monitoring (Prometheus/Grafana)
- Disaster recovery / high availability

❌ **Advanced UI features** (not required):
- Dark mode
- Advanced accessibility (WCAG compliance beyond basics)
- User preferences/settings
- Shared workspaces

---

## Acceptance Criteria (From Assignment)

| Criteria | Test Method | Status |
|----------|------------|--------|
| New user can log in with Google | Manual test with mock OAuth | ✅ Design |
| New user can log in with GitHub | Manual test with mock OAuth | ✅ Design |
| User can create lists/projects | Manual test + automated test | ✅ Design |
| User can create tasks | Manual test + automated test | ✅ Design |
| User can search/filter tasks | Manual test + automated test | ✅ Design |
| Data is private per user | Automated test | ✅ Design |
| User cannot access another user's data | Automated test | ✅ Design |
| While connected, app receives overdue notifications | WebSocket test | ✅ Design |
| While connected, app receives due soon notifications | WebSocket test | ✅ Design |
| WebSocket includes client→server message (subscribe/ack) | Code inspection + test | ✅ Design |
| Tests pass locally | Test suite runs | ✅ Design |
| README sufficient for another dev to run app | README review | ✅ Design |

---

## Database Schema Summary

```sql
users (id, provider, provider_user_id, email, display_name, avatar_url, created_at, updated_at)
projects (id, user_id, name, created_at, updated_at)
tasks (id, project_id, title, description, status, priority, due_date, created_at, updated_at)

Indexes:
  projects (user_id)
  tasks (project_id, user_id, status, due_date)
```

---

## API Endpoints Summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /auth/google/callback | - | OAuth callback |
| GET | /auth/github/callback | - | OAuth callback |
| POST | /auth/logout | JWT | Logout |
| GET | /api/projects | JWT | List user's projects |
| POST | /api/projects | JWT | Create project |
| PUT | /api/projects/:id | JWT | Rename project |
| DELETE | /api/projects/:id | JWT | Delete project |
| GET | /api/tasks | JWT | List tasks (with filters) |
| POST | /api/tasks | JWT | Create task |
| PUT | /api/tasks/:id | JWT | Update task |
| DELETE | /api/tasks/:id | JWT | Delete task |
| PATCH | /api/tasks/:id/status | JWT | Quick status change |
| GET | /health | - | Health check |

---

## WebSocket Events Summary

| Direction | Event | Purpose |
|-----------|-------|---------|
| S→C | connect_ack | Initial user data on connect |
| S→C | task_overdue | Notification: task is overdue |
| S→C | task_due_soon | Notification: task due within 3 days |
| C→S | subscribe | Client ready to receive notifications |
| C→S | ack_notification | Mark notification as acknowledged |

---

## Testing Summary

| Test Type | Count | Coverage |
|-----------|-------|----------|
| OAuth login mock | 2 (Google, GitHub) | Authentication |
| Project CRUD | 4 | Project operations |
| Task CRUD | 4 | Task operations |
| Authorization | 4 | Data isolation |
| Search/Filters | 4 | Task filtering |
| WebSocket | 4 | Notifications |
| **Total** | **22+** | **70%+** |

---

## Project Scope Summary

| Aspect | Scope |
|--------|-------|
| Users | Multi-user (2+), single OAuth provider per user |
| Tables | 3 (users, projects, tasks) |
| API Endpoints | 12 |
| WebSocket Events | 5 |
| React Components | ~15-20 |
| Tests | 22+ test cases |
| Development Time | ~4 weeks (2-3 developers) |

---

## Next Steps for Development

1. ✅ Review architecture and requirements
2. 📝 Set up repository structure
3. 🔧 Initialize backend (Express, TypeScript, Passport)
4. 🗄️ Create database schema and migrations
5. 🔐 Implement OAuth flows
6. 🛣️ Implement REST API endpoints
7. ⚡ Implement WebSocket notifications
8. 🎨 Build React frontend
9. 🧪 Write and run tests
10. 📚 Complete README and documentation
11. 🐳 Create Docker Compose setup
12. 🚀 Verify all acceptance criteria
