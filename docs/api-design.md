# API Design Specification

## 1. Overview

This document defines the complete REST API specification for the project using OpenAPI 3.0 standard.

**Base URL**: `https://api.example.com/api/v1`

**API Version**: v1

**Content-Type**: `application/json`

**Authentication**: JWT Bearer token in Authorization header

---

## 2. Core Principles

### 2.1 RESTful Conventions

```
Resource Collections:    GET    /resource        (list)
                        POST   /resource        (create)

Resource Items:         GET    /resource/:id    (read)
                        PUT    /resource/:id    (update)
                        DELETE /resource/:id    (delete)
                        PATCH  /resource/:id    (partial update)

Sub-resources:          GET    /resource/:id/sub           (list)
                        POST   /resource/:id/sub           (create)
                        DELETE /resource/:id/sub/:subId    (delete)
```

### 2.2 Response Format

**Success Response (200, 201)**:
```json
{
  "success": true,
  "data": { /* resource or array */ },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0"
  }
}
```

**Error Response (4xx, 5xx)**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* additional context */ },
    "path": "/api/v1/endpoint",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_uuid_here"
  }
}
```

### 2.3 Pagination

```json
GET /api/v1/users?page=1&limit=20&sort=-created_at

Response:
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false,
    "startIndex": 0,
    "endIndex": 19
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 2.4 Filtering & Sorting

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field and order: `field` or `-field` for descending (default: `-created_at`)
- `filter`: JSON encoded filter object (see examples)
- `search`: Full-text search term

**Example**:
```
GET /api/v1/users?page=1&limit=20&sort=-created_at&search=john&filter={"role":"admin"}
```

### 2.5 HTTP Status Codes

| Code | Status | Use Case |
|------|--------|----------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input, validation error |
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists, constraint violation |
| 422 | Unprocessable Entity | Semantic error in request |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Service temporarily unavailable |
| 503 | Service Unavailable | Server maintenance or overload |

---

## 3. Authentication Endpoints

### 3.1 Register User

```
POST /auth/register

Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}

Response (201):
{
  "success": true,
  "data": {
    "id": "user_uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "status": "pending_verification",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "meta": { "timestamp": "2024-01-15T10:30:00Z" }
}

Error (400):
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": ["Email already exists"],
      "password": ["Password must contain uppercase letter"]
    }
  }
}
```

### 3.2 Verify Email

```
POST /auth/verify-email

Request:
{
  "token": "verification_token_from_email"
}

Response (200):
{
  "success": true,
  "data": {
    "id": "user_uuid",
    "email": "user@example.com",
    "status": "active",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3.3 Login

```
POST /auth/login

Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response (200):
{
  "success": true,
  "data": {
    "user": {
      "id": "user_uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["user", "admin"],
      "permissions": ["read:users", "write:users", "delete:users"]
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "refresh_token_jwt",
      "expiresIn": 900,
      "tokenType": "Bearer"
    }
  }
}

Error (401):
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

### 3.4 Refresh Token

```
POST /auth/refresh

Headers:
Authorization: Bearer <refresh_token>

Response (200):
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

### 3.5 Logout

```
POST /auth/logout

Headers:
Authorization: Bearer <access_token>

Response (200):
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

### 3.6 Request Password Reset

```
POST /auth/password-reset/request

Request:
{
  "email": "user@example.com"
}

Response (200):
{
  "success": true,
  "data": {
    "message": "Password reset email sent"
  }
}
```

### 3.7 Complete Password Reset

```
POST /auth/password-reset/complete

Request:
{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123!"
}

Response (200):
{
  "success": true,
  "data": {
    "message": "Password reset successful"
  }
}
```

---

## 4. User Management Endpoints

### 4.1 List Users

```
GET /users?page=1&limit=20&sort=-created_at&search=john

Headers:
Authorization: Bearer <access_token>

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "user_uuid_1",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["user"],
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "lastLogin": "2024-01-15T09:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}

Error (401):
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}

Error (403):
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions to read users"
  }
}
```

### 4.2 Get User Details

```
GET /users/:userId

Headers:
Authorization: Bearer <access_token>

Response (200):
{
  "success": true,
  "data": {
    "id": "user_uuid",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["user", "moderator"],
    "permissions": ["read:users", "write:posts"],
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "lastLogin": "2024-01-15T09:30:00Z",
    "profilePicture": "https://cdn.example.com/user_uuid.jpg"
  }
}
```

### 4.3 Create User (Admin)

```
POST /users

Headers:
Authorization: Bearer <access_token>

Request:
{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "roles": ["user"],
  "sendInvitation": true
}

Response (201):
{
  "success": true,
  "data": {
    "id": "new_user_uuid",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "roles": ["user"],
    "status": "pending_invitation",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 4.4 Update User

```
PUT /users/:userId

Headers:
Authorization: Bearer <access_token>

Request:
{
  "firstName": "John",
  "lastName": "Smith",
  "profilePicture": "data:image/jpeg;base64,..."
}

Response (200):
{
  "success": true,
  "data": {
    "id": "user_uuid",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "updatedAt": "2024-01-15T10:35:00Z"
  }
}
```

### 4.5 Delete User (Soft Delete)

```
DELETE /users/:userId

Headers:
Authorization: Bearer <access_token>

Response (204): No Content

Or (200):
{
  "success": true,
  "data": {
    "id": "user_uuid",
    "deletedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 4.6 Get User Roles

```
GET /users/:userId/roles

Headers:
Authorization: Bearer <access_token>

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "role_uuid_1",
      "name": "user",
      "description": "Regular user role",
      "permissions": ["read:posts", "write:posts"],
      "assignedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 4.7 Assign Role to User

```
POST /users/:userId/roles

Headers:
Authorization: Bearer <access_token>

Request:
{
  "roleId": "role_uuid"
}

Response (201):
{
  "success": true,
  "data": {
    "userId": "user_uuid",
    "roleId": "role_uuid",
    "assignedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 4.8 Remove Role from User

```
DELETE /users/:userId/roles/:roleId

Headers:
Authorization: Bearer <access_token>

Response (204): No Content
```

---

## 5. Role Management Endpoints

### 5.1 List Roles

```
GET /roles?page=1&limit=20

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "role_uuid_1",
      "name": "admin",
      "description": "Administrator role",
      "permissions": ["read:users", "write:users", "delete:users", "manage:roles"],
      "userCount": 5,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

### 5.2 Get Role Details

```
GET /roles/:roleId

Response (200):
{
  "success": true,
  "data": {
    "id": "role_uuid",
    "name": "admin",
    "description": "Administrator role",
    "permissions": [
      {
        "id": "perm_uuid_1",
        "name": "read:users",
        "description": "Read user information",
        "assignedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 5.3 Create Role

```
POST /roles

Request:
{
  "name": "moderator",
  "description": "Moderator role with limited permissions",
  "permissions": ["read:users", "write:posts", "delete:posts"]
}

Response (201):
{
  "success": true,
  "data": {
    "id": "new_role_uuid",
    "name": "moderator",
    "description": "Moderator role",
    "permissions": [ ... ],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 5.4 Update Role

```
PUT /roles/:roleId

Request:
{
  "description": "Updated moderator role",
  "permissions": ["read:users", "write:posts", "delete:posts", "manage:comments"]
}

Response (200):
{
  "success": true,
  "data": { ... }
}
```

### 5.5 Delete Role

```
DELETE /roles/:roleId

Response (204): No Content
```

### 5.6 Get Role Permissions

```
GET /roles/:roleId/permissions

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "perm_uuid",
      "name": "read:users",
      "description": "Read user information",
      "resource": "users",
      "action": "read"
    }
  ]
}
```

### 5.7 Add Permission to Role

```
POST /roles/:roleId/permissions

Request:
{
  "permissionId": "perm_uuid"
}

Response (201):
{
  "success": true,
  "data": {
    "roleId": "role_uuid",
    "permissionId": "perm_uuid",
    "assignedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 5.8 Remove Permission from Role

```
DELETE /roles/:roleId/permissions/:permissionId

Response (204): No Content
```

---

## 6. Health & Status Endpoints

### 6.1 Health Check

```
GET /health

Response (200):
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

### 6.2 Service Status

```
GET /status

Response (200):
{
  "success": true,
  "data": {
    "status": "operational",
    "services": {
      "database": {
        "status": "connected",
        "latency": 5
      },
      "redis": {
        "status": "connected",
        "latency": 2
      },
      "rabbitmq": {
        "status": "connected",
        "latency": 8
      }
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## 7. Error Handling

### 7.1 Error Code Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing/invalid authentication |
| `FORBIDDEN` | 403 | Authenticated but no permission |
| `RESOURCE_NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Resource already exists |
| `UNPROCESSABLE_ENTITY` | 422 | Semantic error in request |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `AUTHENTICATION_FAILED` | 401 | Auth process failed |
| `PERMISSION_DENIED` | 403 | Specific permission missing |
| `INVALID_TOKEN` | 401 | JWT token invalid/expired |

### 7.2 Error Response Examples

**Validation Error**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "email": [
        "Email is required",
        "Email must be valid"
      ],
      "password": [
        "Password must be at least 8 characters"
      ]
    }
  }
}
```

**Permission Error**:
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You don't have permission to perform this action",
    "details": {
      "required": ["delete:users"],
      "granted": ["read:users", "write:users"]
    }
  }
}
```

---

## 8. Request/Response Headers

### Request Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Request-ID: <uuid>  (optional, auto-generated if not provided)
X-API-Key: <key>      (optional, for service-to-service auth)
Accept: application/json
Accept-Language: en-US
User-Agent: <client-identifier>
```

### Response Headers

```
Content-Type: application/json
X-Request-ID: <uuid>  (echo from request)
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705318800
Cache-Control: no-cache, no-store, must-revalidate
Vary: Accept-Encoding
ETag: <hash>  (for GET requests)
```

---

## 9. Rate Limiting

### Rules

- **Unauthenticated**: 100 requests per minute per IP
- **Authenticated**: 1000 requests per minute per user
- **Admin**: 5000 requests per minute per user

### Headers

```
X-RateLimit-Limit: 1000       (total limit)
X-RateLimit-Remaining: 999    (requests left)
X-RateLimit-Reset: 1705318800 (Unix timestamp when limit resets)
```

### Exceeding Limit

```
Status: 429 Too Many Requests

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "limit": 1000,
      "window": "1 minute",
      "retryAfter": 60
    }
  }
}
```

---

## 10. API Versioning

### Version Strategy

- Base path includes version: `/api/v1`, `/api/v2`
- Maintain backward compatibility for at least 6 months after new version
- Deprecation notices in response headers

### Deprecation Header

```
Deprecation: true
Sunset: Sun, 15 Jul 2024 23:59:59 GMT
Link: </api/v2/endpoint>; rel="successor-version"
```

---

## 11. Security

### Authentication

```
Authorization: Bearer <jwt_token>

JWT Payload Example:
{
  "sub": "user_uuid",
  "iat": 1705314600,
  "exp": 1705315500,
  "roles": ["user", "admin"],
  "permissions": ["read:users", "write:users"]
}
```

### CORS

```
Allowed Origins: https://app.example.com, https://admin.example.com
Allowed Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Allowed Headers: Authorization, Content-Type, X-Request-ID
Credentials: true
```

### CSRF Protection

```
All state-changing requests (POST, PUT, DELETE, PATCH) require:
1. Same-Site cookie policy (SameSite=Strict)
2. CSRF token validation
3. Content-Type: application/json
```

---

## 12. Caching

### Cache Strategy

- **GET requests**: Cache for 5 minutes (Cache-Control: max-age=300)
- **POST/PUT/DELETE**: No-cache (Cache-Control: no-cache, no-store)
- **User-specific data**: Private cache (Cache-Control: private)

### Cache Headers

```
Cache-Control: public, max-age=300
ETag: "abc123def456"
Last-Modified: Mon, 15 Jan 2024 10:30:00 GMT
```

### Cache Invalidation

```
DELETE /cache/:resource (admin only)

Clears cache for:
- Individual resource: DELETE /cache/users/user_uuid
- Resource type: DELETE /cache/users
- All: DELETE /cache
```

---

## 13. OpenAPI/Swagger Integration

### Endpoint

```
GET /api/v1/docs
GET /api/v1/docs/swagger.json
GET /api/v1/docs/openapi.json
```

### Tools

- **Swagger UI**: Interactive API documentation
- **ReDoc**: Alternative documentation viewer
- **Postman**: Import collection from OpenAPI spec

---

## 14. Common Patterns

### Filtering Example

```
GET /users?filter={"status":"active","roles":["admin","user"]}

Filter operators:
- $eq: Equal
- $ne: Not equal
- $gt: Greater than
- $gte: Greater than or equal
- $lt: Less than
- $lte: Less than or equal
- $in: In array
- $nin: Not in array
- $regex: Regular expression match
```

### Partial Updates

```
PATCH /users/:userId

Request:
{
  "firstName": "John"
}

Only specified fields are updated; others remain unchanged.
```

### Batch Operations

```
POST /users/batch/delete

Request:
{
  "ids": ["user_uuid_1", "user_uuid_2", "user_uuid_3"]
}

Response (200):
{
  "success": true,
  "data": {
    "deleted": 3,
    "failed": 0,
    "results": [
      { "id": "user_uuid_1", "status": "deleted" }
    ]
  }
}
```

---

## 15. Testing the API

### cURL Examples

```bash
# Register
curl -X POST https://api.example.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!","firstName":"John"}'

# Login
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!"}'

# Get Users (with token)
curl -X GET https://api.example.com/api/v1/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"

# Create User
curl -X POST https://api.example.com/api/v1/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","firstName":"Jane","roles":["user"]}'
```
