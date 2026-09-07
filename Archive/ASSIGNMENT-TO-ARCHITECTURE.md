# Assignment → Architecture Mapping

This document maps each assignment requirement to the simplified architecture, showing exactly how each requirement is implemented.

---

## 1. Core Rules

### "The system supports multiple users"
**Implementation**: 
- Database: `users` table stores each user (provider, provider_user_id, email, display_name, avatar_url)
- Backend: Each OAuth callback creates/updates user in DB
- Frontend: User stays logged in across sessions via JWT token

### "Each user sees only their own data"
**Implementation**:
- Database: `projects.user_id` foreign key enforces ownership
- Backend: Every endpoint checks `req.user.id` matches resource owner
- Queries: All queries filter `WHERE user_id = req.user.id`
- Example: `GET /api/projects` returns `SELECT * FROM projects WHERE user_id = ?`

### "There is no sharing of any kind"
**Implementation**:
- No sharing table in database
- No "share with user" UI feature
- No public links
- Each user can only access their own data
- Authorization check on every endpoint prevents access to other users' resources

---

## 2. Authentication and Accounts (SSO Only)

### "User authentication via SSO"
**Implementation**:
- Backend: `/auth/google/callback` and `/auth/github/callback` endpoints
- Strategy: Passport.js with `passport-google-oauth20` and `passport-github2` strategies
- Secure: PKCE flow, state parameter, client secret

### "Support Google OAuth (OpenID Connect)"
**Implementation**:
- Backend: Passport.js GoogleStrategy
- OAuth2 endpoints: `https://accounts.google.com/o/oauth2/v2/auth`
- Tokens: Access token + ID token (contains user profile)
- Environment vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Frontend: `<a href="/auth/google">Continue with Google</a>`

### "Support GitHub OAuth"
**Implementation**:
- Backend: Passport.js GitHubStrategy
- OAuth2 endpoints: `https://github.com/login/oauth/authorize`
- Environment vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- Frontend: `<a href="/auth/github">Continue with GitHub</a>`

### "Support logout"
**Implementation**:
- Backend: `POST /auth/logout` endpoint
- Action: Invalidate JWT token, clear session
- Frontend: Call logout API, clear tokens, redirect to login

### "Logged-in user stays authenticated across page refresh"
**Implementation**:
- Storage: JWT token in httpOnly cookie (secure, auto-sent)
- Frontend: On load, check if token exists in cookie
- If valid token: Auto-login, restore user state
- If expired/invalid: Redirect to login

### "User profile stored with: provider, provider_user_id, email, display_name, avatar_url"
**Implementation**:
- Schema: `users` table with these exact fields
- OAuth: Extract from Google ID token or GitHub API response
- Upsert logic: `INSERT INTO users (...) ON CONFLICT (provider, provider_user_id) DO UPDATE SET ...`
- Avatar: Provided by OAuth provider or set to null

---

## 3. Lists / Projects

### "User can create a list/project"
**Implementation**:
- API: `POST /api/projects`
- Input: `{ name: string }`
- Database: `INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (...)`
- Frontend: Form + submit button
- Auth: JWT required, user_id extracted from token

### "User can rename a list/project"
**Implementation**:
- API: `PUT /api/projects/:id`
- Input: `{ name: string }`
- Database: `UPDATE projects SET name = ? WHERE id = ? AND user_id = ?`
- Frontend: Click to edit or edit modal
- Auth: Verify user owns project

### "User can delete a list/project"
**Implementation**:
- API: `DELETE /api/projects/:id`
- Database: `DELETE FROM projects WHERE id = ? AND user_id = ?`
- Frontend: Delete button + confirmation
- Auth: Verify user owns project

### "Deleting a list/project - handle cascade delete"
**Implementation**:
- Strategy: CASCADE DELETE in database
- Database: `tasks` table has `FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`
- When project deleted: All associated tasks automatically deleted
- Documentation: README explains this strategy

---

## 4. Tasks

### "Task belongs to exactly one project"
**Implementation**:
- Schema: `tasks.project_id` foreign key (NOT NULL)
- When task deleted: Remove from only this project
- When project deleted: Tasks cascade deleted

### "Task fields: Title, Description/notes, Status, Due date, Priority"
**Implementation**:
- Schema:
  ```sql
  tasks (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL FK,
    title VARCHAR NOT NULL,
    description TEXT,
    status ENUM('TODO', 'IN_PROGRESS', 'DONE') NOT NULL DEFAULT 'TODO',
    priority ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
    due_date DATE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
  )
  ```

### "Status: To Do, In Progress, Done"
**Implementation**:
- Database: ENUM constraint with values `TODO`, `IN_PROGRESS`, `DONE`
- API: Accepts and returns these exact values (uppercase with underscores)
- Frontend UI labels: Display as "To Do", "In Progress", "Done" (human-readable)
- Frontend logic: Translate between API values and UI labels
- API validation: Only accept `TODO`, `IN_PROGRESS`, `DONE`

### "Priority: Low, Medium, High"
**Implementation**:
- Database: ENUM constraint with values `LOW`, `MEDIUM`, `HIGH`
- API: Accepts and returns these exact values (uppercase)
- Frontend UI labels: Display as "Low", "Medium", "High" (human-readable)
- Frontend logic: Translate between API values and UI labels
- API validation: Only accept `LOW`, `MEDIUM`, `HIGH`

### "Task operations: Create, Edit, Delete, Change status quickly"
**Implementation**:
- Create: `POST /api/tasks` with all fields
- Edit: `PUT /api/tasks/:id` with any fields
- Delete: `DELETE /api/tasks/:id`
- Quick status: `PATCH /api/tasks/:id/status` with just `{ status: ... }`
- Frontend: Quick status buttons in task list (no modal for status only)
- All endpoints: Verify user owns project (via project_id)

---

## 5. Search and Filters

### "Search tasks by title and description"
**Implementation**:
- API: `GET /api/tasks?search=query`
- Query: `SELECT * FROM tasks WHERE project_id IN (...) AND (title ILIKE ? OR description ILIKE ?)`
- Frontend: Search input updates query params, debounced API call
- Real-time: Results update as user types

### "Filter tasks by status"
**Implementation**:
- API: `GET /api/tasks?status=TODO,IN_PROGRESS`
- Query: `SELECT * FROM tasks WHERE ... AND status = ANY(ARRAY[...])`
- Frontend: Status filter buttons (multi-select or tabs)
- Persist: Save filter in URL or local state

### "Filter tasks by priority"
**Implementation**:
- API: `GET /api/tasks?priority=HIGH,MEDIUM`
- Query: `SELECT * FROM tasks WHERE ... AND priority = ANY(ARRAY[...])`
- Frontend: Priority filter dropdown or buttons

### "Filter by due date: overdue, today, next 7 days, all"
**Implementation**:
- API: `GET /api/tasks?dueDateFilter=overdue|today|next7days|all`
- Query logic:
  - `overdue`: `due_date < TODAY() AND status != 'DONE'`
  - `today`: `due_date = TODAY()`
  - `next7days`: `due_date BETWEEN TODAY() AND TODAY() + 7 days`
  - `all`: No due_date filter
- Frontend: Due date filter tabs or dropdown

### Combining filters
**Implementation**:
- API: `GET /api/tasks?search=fix&status=TODO&priority=HIGH&dueDateFilter=today`
- Query: Combine all WHERE conditions with AND
- Frontend: All filters work together, results update in real-time

---

## 6. Real-time Communication (WebSocket)

### "App must include two-way communication using WebSocket"

#### Server → Client: Notifications

**Overdue tasks notification**:
```javascript
// When connected, server checks every 5 minutes:
// SELECT * FROM tasks WHERE user_id = ? AND status != 'DONE' AND due_date < TODAY()

socket.emit('task_overdue', {
  taskId: 'uuid',
  title: 'Fix bug in login',
  dueDate: '2024-01-10',
  projectName: 'Project A'
})
```

**Due soon tasks notification**:
```javascript
// SELECT * FROM tasks WHERE user_id = ? AND status != 'DONE' 
// AND due_date BETWEEN TODAY() AND TODAY() + 3 days

socket.emit('task_due_soon', {
  taskId: 'uuid',
  title: 'Review PR',
  daysUntil: 2,
  dueDate: '2024-01-17',
  projectName: 'Project B'
})
```

#### Client → Server: Messages (Two-way)

**Subscribe message** (after connect):
```javascript
// Client sends after connection established
socket.emit('subscribe', {
  interval: 5,  // Check every 5 minutes
  types: ['overdue', 'dueSoon']
})
```

**Acknowledgment message** (mark read):
```javascript
// Client acknowledges notification
socket.emit('ack_notification', {
  notificationId: 'uuid',
  taskId: 'uuid'
})
```

### "On WebSocket connect: Initial batch + periodic checks"

**Implementation**:
```javascript
// Backend: On client connect
socket.on('connect', async () => {
  // Verify JWT token
  const user = verifyToken(socket.handshake.auth.token)
  
  // 1. Send initial batch
  const overdue = getOverdueTasks(user.id)
  const dueSoon = getDueSoonTasks(user.id)
  socket.emit('notification_batch', { overdue, dueSoon })
  
  // 2. Set up periodic check
  const interval = setInterval(() => {
    const updates = checkNotifications(user.id)
    socket.emit('task_overdue', updates.overdue)
    socket.emit('task_due_soon', updates.dueSoon)
  }, 5 * 60 * 1000) // Every 5 minutes
})
```

### "Display notifications in UI"

**Implementation**:
- Toast component: Auto-dismiss after 5 seconds
- Or: Notification panel (persistent)
- Or: Banner at top of screen
- Content: Task title, due date, project name, action link
- Action: Click notification → navigate to task

---

## 7. UI Requirements

### "Authentication screen with OAuth buttons"
**Components**:
- `LoginPage.tsx`: Centered login form
- `GoogleGitHubButtons.tsx`: Two buttons with provider logos
- Links: `/auth/google` and `/auth/github`

### "Main layout: Left sidebar for projects, main area for tasks"
**Components**:
- `AppLayout.tsx`: Main grid layout
- `Sidebar.tsx`: Project list, create button, delete buttons
- `TaskListView.tsx`: Task list for selected project

### "Task list view for selected project"
**Components**:
- `TaskList.tsx`: Display tasks with filters
- Task rows: Title, status, priority, due date
- Quick status change buttons (TODO → IN_PROGRESS → DONE)

### "Task create and edit UI"
**Components**:
- `TaskForm.tsx`: Modal or drawer
- Fields: Title, Description, Status, Priority, Due Date
- Submit: Create or Update API call

### "Search input and filter controls"
**Components**:
- `TaskSearch.tsx`: Search input
- `FilterBar.tsx`: Status, priority, due date filters
- Location: Above task list

### "Notifications UI visible"
**Components**:
- `NotificationPanel.tsx`: List of notifications
- Or: Toast component auto-appearing
- Shows: Task title, due date, action button
- Close/dismiss: Remove notification

### "Responsive for narrow screens"
**Implementation**:
- CSS Modules: Media queries `@media (max-width: 640px)`
- Sidebar: Hidden on mobile, hamburger menu
- Sidebar: Drawer on tablet, full sidebar on desktop
- Tasks: Stack on mobile, grid on larger screens
- Flexbox/Grid for adaptive layouts

### "Consistent spacing and typography"
**Implementation**:
- CSS Modules: Spacing scale defined in shared variables/mixins
- Font sizes: Semantic hierarchy (small, base, large)
- Colors: Consistent palette using CSS variables
- Line-height and letter-spacing standards

### "Visible hover and focus states"
**Implementation**:
- Buttons: CSS `:hover` and `:focus` states with visual feedback
- Links: `:hover` with underline, `:focus` with ring
- Forms: `:focus` with border color change and outline ring

### "Empty states for no tasks and no search results"
**Components**:
- Empty project: "No tasks yet. Create your first task →"
- Empty search: "No tasks match your search. Try different keywords."
- Empty filter: "No tasks match these filters."

### "Loading state for main screens"
**Implementation**:
- Task list loading: Spinner while fetching
- Project list loading: Skeleton loaders
- API calls: Show loading spinner until response

### "Client-side form validation feedback"
**Implementation**:
- Task form: Required fields marked
- Validation: `title` required, `dueDate` valid date
- Error messages: "Title is required", "Date must be in future"
- Red border on invalid fields

---

## 8. Backend Requirements

### "Provide REST API that supports UI flows"
**API Endpoints**:
- Auth: 3 endpoints (Google callback, GitHub callback, logout)
- Projects: 4 endpoints (list, create, rename, delete)
- Tasks: 5 endpoints (list, create, update, delete, quick-status)
- Health: 1 endpoint
- Total: 13 endpoints

### "Enforce authorization on every list/task operation"
**Implementation**:
- Middleware: `authMiddleware` verifies JWT on all protected routes
- Route handler: Check `req.user.id` matches resource owner
- Pattern: `WHERE user_id = req.user.id`
- Error: Return 403 Forbidden if not owner

Example:
```javascript
router.put('/api/projects/:id', authMiddleware, async (req, res) => {
  const project = await db.query(
    'SELECT * FROM projects WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  )
  if (!project) return res.status(403).json({ error: 'Forbidden' })
  // Update project...
})
```

### "Enforce authorization on WebSocket connections"
**Implementation**:
- On connect: Verify JWT token in socket handshake
- Reject: Invalid/expired tokens
- Only send notifications for user's tasks
- Prevent: User receiving another user's notifications

### "Validate inputs and return clear errors"
**Implementation**:
- Middleware: Input validation before handler
- Example: Task title required, status in enum, due_date is valid date
- Error format:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Title is required"
    }
  }
  ```

### "Implement SSO OAuth securely"
**Security measures**:
- PKCE flow for authorization code exchange
- State parameter to prevent CSRF
- Client secret stored in environment variable
- Redirect URI must match registered value
- Tokens never exposed to frontend (auth header only)

**Environment variables**:
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
JWT_SECRET=...
FRONTEND_URL=http://localhost:3000
```

---

## 9. Data Requirements

### "Persist data in PostgreSQL"
**Setup**:
```bash
docker-compose up -d db
npm run migrate
```

**Database**:
```sql
CREATE DATABASE todo_db;
```

### "Seed script or sample data"
**Implementation Options**:
1. NPM script: `npm run seed`
2. API endpoint: `POST /api/seed` (admin only, disabled in prod)
3. Manual SQL file: `db/seed.sql`

**Sample data**:
- 1-2 users
- 2-3 projects per user
- 5-10 tasks per project
- Mix of statuses, priorities, due dates

---

## 10. Quality Requirements

### "Test: SSO login success path"
**Test case**:
```javascript
test('User can login with Google', async () => {
  // Mock Google OAuth response
  const googleResponse = {
    id: 'google123',
    email: 'user@gmail.com',
    displayName: 'John Doe',
    photos: [{ value: 'http://avatar.jpg' }]
  }
  
  // Call /auth/google/callback with mock
  const response = await request(app).get('/auth/google/callback').query(googleResponse)
  
  // Verify user in DB
  const user = await db.query('SELECT * FROM users WHERE provider = ?', ['google'])
  expect(user).toBeTruthy()
  expect(user.email).toBe('user@gmail.com')
})
```

### "Test: User can create list and task"
**Test case**:
```javascript
test('User can create project and task', async () => {
  // Login
  const user = await loginUser()
  const token = user.token
  
  // Create project
  const project = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'My Project' })
  
  // Create task
  const task = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({
      projectId: project.data.id,
      title: 'Task 1',
      status: 'TODO',
      priority: 'HIGH'
    })
  
  expect(task.status).toBe(201)
  expect(task.data.projectId).toBe(project.data.id)
})
```

### "Test: Authorization isolation"
**Test case**:
```javascript
test('User cannot access another user projects', async () => {
  const user1 = await loginUser('user1@example.com')
  const user2 = await loginUser('user2@example.com')
  
  // User1 creates project
  const project = await createProject(user1.token, 'My Project')
  
  // User2 tries to access project
  const response = await request(app)
    .get(`/api/projects/${project.id}`)
    .set('Authorization', `Bearer ${user2.token}`)
  
  expect(response.status).toBe(403)
  expect(response.data.error).toBe('Forbidden')
})
```

### "Test: WebSocket notifications"
**Test case**:
```javascript
test('User receives overdue task notification', async () => {
  // Create task with past due date
  const task = await createTask({
    title: 'Overdue task',
    dueDate: '2024-01-01',
    status: 'TODO'
  })
  
  // Connect WebSocket
  const client = io('http://localhost:5000', {
    auth: { token: userToken }
  })
  
  // Listen for notification
  client.on('task_overdue', (notification) => {
    expect(notification.taskId).toBe(task.id)
    expect(notification.title).toBe('Overdue task')
  })
  
  // Server checks and sends notification
  await wait(100) // Let server send
})
```

---

## 11. Deliverables

### "Source code in Git repository"
- Structure: Standard Node.js + React layout
- Gitignore: `node_modules/`, `.env`, `.env.local`, etc.
- Readme: Complete with setup instructions

### "README with local run instructions"
**Sections**:
1. Prerequisites (Node, PostgreSQL, npm)
2. Setup backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run migrate
   npm run seed
   npm run dev
   ```
3. Setup frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Access: http://localhost:3000

### "README: OAuth configuration guide"
**Section**: "OAuth Configuration"
- Google:
  - Create project in Google Cloud Console
  - Create OAuth 2.0 Client ID (Web application)
  - Add authorized redirect: `http://localhost:5000/auth/google/callback`
  - Set env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- GitHub:
  - Create OAuth app in GitHub Settings
  - Authorization callback: `http://localhost:5000/auth/github/callback`
  - Set env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

### "README: WebSocket message formats"
**Section**: "WebSocket Events"
- Format server → client (task_overdue, task_due_soon)
- Format client → server (subscribe, ack_notification)
- Frequency: Every 5 minutes periodic check
- Example messages with JSON

### "API documentation"
**Format**: README section with endpoint table
- Method, Path, Auth, Purpose
- Request/response examples for 3-4 endpoints

### "Test command"
**In README**:
```bash
# Run all tests
npm test

# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test
```

### "Optional: Containerization"
**Included**:
- `Dockerfile` for backend
- `Dockerfile` for frontend
- `docker-compose.yml` for full stack
- README: "Docker setup" section

---

## Summary Table

| Assignment Section | Implementation | Files |
|-------------------|----------------|-------|
| Core rules | Database schema (user_id FK), authorization middleware | API, DB |
| Auth (2.1) | Passport.js OAuth strategies, JWT tokens, httpOnly cookies | backend/auth |
| Projects (2.2) | CRUD endpoints, cascade delete, DB schema | API, DB |
| Tasks (2.3) | CRUD endpoints, full schema with enums | API, DB |
| Search/Filters (2.4) | Query parameters, ILIKE search, date range queries | API |
| WebSocket (2.5) | Socket.io server, initial batch, periodic checks, 2-way events | backend/websocket |
| UI (3) | React components, CSS Modules, responsive design | frontend/components |
| Backend (4) | Express.js, REST API, authorization checks | backend/routes |
| Database (5) | PostgreSQL schema, migrations, seed script | db/ |
| Quality (6) | Jest tests, OAuth mock, CRUD test, auth isolation, WebSocket | tests/ |
| Deliverables (7) | README, Docker Compose, API docs, WebSocket docs | / |

**Result**: Every requirement from the assignment has a specific implementation path in the simplified architecture.
