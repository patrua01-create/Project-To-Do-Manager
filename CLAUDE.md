# Personal To-Do Manager

## Project Goal
Build a full-stack MVP that satisfies all requirements defined in:
1. requirements.md (source of truth)
2. requirements.json (structured reference)
3. docs/architecture.md
4. docs/requirements-matrix.md

## Approved Technology Stack

### Frontend
- React 18
- TypeScript
- Vite
- CSS Modules
- Socket.IO Client

### Backend
- Node.js
- Express.js
- TypeScript
- Passport.js

### Database
- PostgreSQL
- Prisma ORM

### Real-Time Communication
- Socket.IO

### Testing
- Vitest
- Supertest

### Infrastructure
- Docker Compose

## Implementation Rules

- Follow requirements.md exactly.
- Do not introduce technologies not defined in architecture.md.
- Keep the solution simple and MVP-focused.
- Do not add enterprise features unless explicitly required.
- Do not use microservices.
- Do not use Kubernetes.
- Do not use RabbitMQ.
- Do not use Redis unless a requirement explicitly demands it.

## Security Requirements

- Enforce authorization on every project and task operation.
- Users must access only their own data.
- WebSocket connections must be authenticated.
- Follow OAuth best practices for Google and GitHub authentication.
- Validate all API inputs.

## Functional Requirements

The implementation must include:
- Google OAuth login
- GitHub OAuth login
- Persistent user session
- Project CRUD
- Task CRUD
- Search functionality
- Filters
- WebSocket notifications
- Client-to-server WebSocket messages (subscribe and/or ack)
- Seed data support
- Automated tests

## Development Workflow

Before implementing a feature:
1. Verify requirements in requirements.md.
2. Check architecture.md.
3. Update README if needed.
4. Add or update tests.

## Definition of Done

A feature is complete only when:
- Code is implemented.
- Tests are implemented.
- Authorization rules are respected.
- Documentation is updated if required.
- Requirements traceability remains valid.

## Current Project Status

Architecture phase completed.
Requirements validated.
Ready for backend implementation.