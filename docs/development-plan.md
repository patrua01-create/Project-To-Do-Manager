# Development Plan - Personal To-Do Manager MVP

**Scope**: Single-developer MVP implementation  
**Timeline**: ~4 weeks (flexible based on progress)  
**Approach**: Phase-based, implementation-focused  

---

## Phase 1: Project Setup & Backend Foundation

**Duration**: 2-3 days  
**Deliverable**: Working backend scaffold with database

### Tasks

1. **Repository Structure**
   - Initialize Git repository
   - Create folder structure: `backend/`, `frontend/`, `docs/`
   - Set up `.gitignore`, `.env.example`

2. **Backend Setup**
   - Initialize Node.js project (`npm init`)
   - Install dependencies: Express, TypeScript, Passport.js, PostgreSQL driver, Socket.io, JWT, dotenv
   - Configure TypeScript (`tsconfig.json`)
   - Set up basic Express server on port 5000

3. **Database Setup**
   - Initialize Prisma ORM
   - Create PostgreSQL database schema (3 tables: users, projects, tasks)
   - Write Prisma migrations
   - Create seed script using Prisma client

4. **Environment Configuration**
   - Create `.env.example` with all required variables
   - Document OAuth provider setup (Google, GitHub)

### Success Criteria
- `npm run dev:backend` starts Express server
- Database connects successfully
- Can run `npm run seed` to populate test data

---

## Phase 2: Authentication & Authorization

**Duration**: 3-4 days  
**Deliverable**: OAuth login working, JWT tokens, protected routes

### Tasks

1. **OAuth Integration**
   - Set up Passport.js with Google Strategy
   - Set up Passport.js with GitHub Strategy
   - Implement `/auth/google/callback` and `/auth/github/callback` routes
   - Configure redirect URLs and environment variables

2. **Session Management**
   - Implement JWT token generation on OAuth success
   - Store JWT in httpOnly cookie
   - Create middleware to verify JWT on protected routes

3. **User Endpoints**
   - `POST /auth/logout` - clear session
   - `GET /auth/me` - return current user (optional, for frontend)

4. **Authorization Middleware**
   - Create middleware to verify JWT on all `/api/*` routes
   - Extract `user_id` from JWT and attach to request
   - Return 401 if token invalid, 403 if access denied

### Success Criteria
- Can login with Google OAuth (mock or real)
- Can login with GitHub OAuth (mock or real)
- JWT token persists in cookie
- Logout clears token
- Protected routes return 401 without token
- User data stored in database

---

## Phase 3: Core API - Projects & Tasks

**Duration**: 4-5 days  
**Deliverable**: All 13 REST endpoints working with authorization

### Tasks

1. **Project Endpoints**
   - `GET /api/projects` - list user's projects
   - `POST /api/projects` - create project (requires: name)
   - `PUT /api/projects/:id` - rename project
   - `DELETE /api/projects/:id` - delete project (cascade delete tasks)

2. **Task Endpoints**
   - `GET /api/tasks` - list tasks with filters (query params: search, status, priority, dueDateFilter)
   - `POST /api/tasks` - create task (requires: project_id, title, description, status, priority, due_date)
   - `PUT /api/tasks/:id` - update task fields
   - `DELETE /api/tasks/:id` - delete task
   - `PATCH /api/tasks/:id/status` - quick status change

3. **Input Validation**
   - Validate required fields
   - Validate enum values (status, priority)
   - Return clear error messages

4. **Authorization Checks**
   - Verify user owns project before project operations
   - Verify user owns task's project before task operations
   - Use `WHERE user_id = ?` in all queries

### Success Criteria
- All 10 endpoints return correct responses
- Authorization prevents cross-user access
- Search and filters work correctly
- Database queries are optimized (indexes on user_id, status, due_date)

---

## Phase 4: WebSocket Notifications

**Duration**: 3-4 days  
**Deliverable**: Real-time notifications working

### Tasks

1. **WebSocket Server Setup**
   - Initialize Socket.io on Express server
   - Implement authentication on connect (verify JWT)
   - Create rooms per user for data isolation

2. **Notification Events (Server → Client)**
   - `task_overdue` - send when task due_date < today and status != DONE
   - `task_due_soon` - send when task due_date between today and today+3 days and status != DONE
   - `notification_batch` - send on connect with initial overdue + due_soon tasks

3. **Subscription Events (Client → Server)**
   - `subscribe` - client ready to receive notifications (optional: with interval preference)
   - `ack_notification` - client acknowledges notification as read

4. **Periodic Checks**
   - Every 5 minutes (configurable): query overdue + due_soon tasks for connected users
   - Emit notifications only if new

### Success Criteria
- WebSocket connection establishes on frontend load
- Initial notification batch sent on connect
- Periodic checks run every 5 minutes
- New tasks appear as notifications
- Client can send subscribe and ack messages
- Only user's own notifications sent

---

## Phase 5: Frontend Setup & Components

**Duration**: 3-4 days  
**Deliverable**: Scaffold and core components

### Tasks

1. **Frontend Project Setup**
   - Initialize React app with Vite
   - Configure TypeScript
   - Set up CSS Modules
   - Configure environment variables (VITE_API_URL, VITE_WS_URL)
   - Create folder structure: `components/`, `pages/`, `hooks/`, `services/`, `context/`, `types/`, `styles/`

2. **Authentication Context**
   - Create AuthContext for user state
   - Implement useAuth hook
   - Auto-login on page load if JWT exists
   - Logout functionality

3. **Core Components**
   - **LoginPage**: OAuth buttons (Google, GitHub)
   - **AppLayout**: Sidebar + main area layout
   - **Sidebar**: Project list
   - **TaskList**: Display tasks for selected project
   - **TaskForm**: Modal/drawer for create/edit tasks
   - **TaskSearch**: Search input
   - **FilterBar**: Status, priority, due date filters
   - **NotificationPanel**: Display WebSocket notifications
   - **LoadingSpinner**: Loading state
   - **EmptyState**: No tasks/no results

4. **Styling**
   - Create CSS Modules for each component
   - Define spacing, typography, color variables
   - Ensure responsive design (mobile-first)

### Success Criteria
- Frontend builds with `npm run dev:frontend`
- OAuth login redirects to dashboard
- Can view projects and tasks (connected to backend)
- Search and filters render
- Responsive layout on mobile

---

## Phase 6: API Integration & Notifications

**Duration**: 2-3 days  
**Deliverable**: Frontend connected to all backend features

### Tasks

1. **API Service Layer**
   - Create API client with authorization headers
   - Implement project service (CRUD)
   - Implement task service (CRUD + filters)
   - Handle API errors

2. **WebSocket Client Integration**
   - Connect Socket.io client to backend
   - Listen for notification events
   - Send subscribe message on connect
   - Send ack_notification when notification dismissed
   - Update NotificationPanel with incoming notifications

3. **State Management**
   - Use React Context for projects, tasks, notifications
   - Implement optimistic updates for CRUD
   - Handle loading/error states

4. **Task Operations**
   - Create task (modal → POST → update list)
   - Edit task (modal → PUT → update list)
   - Delete task (confirmation → DELETE → update list)
   - Change status (inline → PATCH → update)
   - Search/filter (query params → GET)

### Success Criteria
- Can create, read, update, delete projects
- Can create, read, update, delete tasks
- Search and filters work end-to-end
- Notifications appear in real-time
- All CRUD operations reflect immediately

---

## Phase 7: Testing

**Duration**: 2-3 days  
**Deliverable**: Test suite with 70%+ coverage

### Tasks

1. **Backend Tests** (Jest + Supertest)
   - OAuth mock test (Google, GitHub login)
   - Project CRUD test (create, read, update, delete)
   - Task CRUD test (create, read, update, delete)
   - Authorization test (user cannot access another user's data)
   - Search/filter test (verify correct results)
   - WebSocket test (verify notifications sent)

2. **Frontend Tests** (Vitest)
   - Component rendering tests
   - API service tests (mock fetch)
   - WebSocket integration tests (mock Socket.io)
   - Filter logic tests

3. **Manual Testing Checklist**
   - Login with Google (or mock)
   - Login with GitHub (or mock)
   - Create project and tasks
   - Search and filter tasks
   - Delete project (cascade delete tasks)
   - View notifications (connected to WebSocket)
   - Responsive design (mobile/tablet/desktop)
   - No console errors

### Success Criteria
- All tests pass (`npm test`)
- Coverage ≥ 70% for critical paths
- No unhandled errors

---

## Phase 8: Documentation & Deployment

**Duration**: 1-2 days  
**Deliverable**: Deployment-ready app with documentation

### Tasks

1. **README**
   - Local setup instructions (npm install, .env, npm run migrate, npm run seed)
   - Start commands (npm run dev:backend, npm run dev:frontend)
   - OAuth provider setup guide (Google, GitHub)
   - WebSocket message format and rules
   - Test command (npm test)

2. **Docker Compose** (Optional)
   - Create `docker-compose.yml` with services: db, backend, frontend
   - Dockerfile for backend and frontend
   - Instructions for `docker-compose up`

3. **API Documentation**
   - List all 13 endpoints with method, path, auth, request/response examples
   - Document error responses

4. **WebSocket Documentation**
   - Document all 5 events (format, when sent, when received)
   - Document client-server messages (format, when sent)

### Success Criteria
- README sufficient for another developer to run locally
- Docker Compose starts all services
- All endpoints documented
- WebSocket behavior clear

---

## Implementation Workflow

1. **Always verify requirements first**: Check requirements.md before implementing
2. **Test incrementally**: Don't wait for Phase 8 to test
3. **Commit frequently**: Small, logical commits for each feature
4. **Document as you go**: Update README as features complete
5. **Authorization everywhere**: Never forget `WHERE user_id = ?` in queries

---

## Technology Stack

**Backend**
- Node.js + Express.js + TypeScript
- PostgreSQL + Prisma ORM
- Passport.js (OAuth)
- Socket.io (WebSocket)
- JWT + httpOnly cookies

**Frontend**
- React 18 + TypeScript + Vite
- CSS Modules (scoped styling)
- Socket.io client
- Fetch API (no extra HTTP library)

**Testing**
- Jest + Supertest (backend)
- Vitest (frontend)

**Deployment**
- Docker Compose (local)

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Prisma ORM (not raw SQL) | Type-safe queries, built-in migrations, prevents SQL injection |
| CSS Modules (not Tailwind) | Scoped styling, type-safe, lightweight |
| React Context (not Redux) | Sufficient for single-user app, less boilerplate |
| Socket.io (not raw WebSocket) | Auto-reconnection, fallbacks, simpler API |
| 5-minute notification interval | Reasonable balance, configurable via env var |
| Cascade delete (not block) | Simpler implementation, documented in README |

---

## Estimated Effort

| Phase | Duration | Complexity |
|-------|----------|-----------|
| 1. Setup | 2-3 days | Low |
| 2. Auth | 3-4 days | Medium |
| 3. API | 4-5 days | Medium |
| 4. WebSocket | 3-4 days | Medium |
| 5. Frontend Scaffold | 3-4 days | Low |
| 6. Integration | 2-3 days | Medium |
| 7. Testing | 2-3 days | Low |
| 8. Documentation | 1-2 days | Low |
| **Total** | **~4 weeks** | **MVP** |

---

## Next Steps

1. Start with Phase 1 (Setup)
2. Follow phases sequentially
3. Test each phase before moving to next
4. Commit after each completed phase
5. When complete, run full test suite and manual acceptance tests

---

**Status**: Ready to begin implementation  
**Created**: 2026-09-01  
**Last Updated**: 2026-09-01
