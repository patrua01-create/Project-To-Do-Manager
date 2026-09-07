# WebSocket Design Specification

## 1. Overview

This document specifies real-time communication between client and server using WebSocket protocol with Socket.io.

**Protocol**: WebSocket (WS/WSS)

**Library**: Socket.io (with fallback transports)

**Connection URL**: `wss://api.example.com/socket.io/?token=<jwt_token>`

**Namespace Pattern**: `/socket.io` (default)

---

## 2. Connection Management

### 2.1 Connection Lifecycle

```
┌─────────────────────────────────────────────────────┐
│              Client Connects                        │
│  1. Client initiates WS connection                  │
│  2. Includes JWT token in query/header              │
│  3. Server validates token                          │
│  4. Server loads user context (roles, perms)        │
│  5. Server sets up connection state                 │
│  6. Client receives CONNECT_ACK                     │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│           Client Subscribes to Channels             │
│  1. Client sends SUBSCRIBE event                    │
│  2. Server validates permission                     │
│  3. Server joins socket to channel room             │
│  4. Server broadcasts USER_JOINED to others         │
│  5. Client receives SUBSCRIBED confirmation         │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│         Client-Server Communication                 │
│  1. Client sends event with data                    │
│  2. Server processes and validates                  │
│  3. Server broadcasts to channel subscribers        │
│  4. Client receives updates in real-time            │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│          Disconnection/Cleanup                      │
│  1. Client/Server disconnects                       │
│  2. Server removes from all channels                │
│  3. Server broadcasts USER_LEFT to others           │
│  4. Connection state cleaned up                     │
└─────────────────────────────────────────────────────┘
```

### 2.2 Connection Parameters

```typescript
// Client-side connection
import io from 'socket.io-client';

const socket = io('wss://api.example.com', {
  auth: {
    token: 'jwt_token_here'
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
  query: {
    clientVersion: '1.0.0'
  }
});
```

### 2.3 Connection Events

**Client-side Events**:

```javascript
// Connection established
socket.on('connect', () => {
  console.log('Connected with ID:', socket.id);
});

// Received initial connection ACK from server
socket.on('connect_ack', (data) => {
  console.log('User ID:', data.userId);
  console.log('Roles:', data.roles);
});

// Connection lost
socket.on('disconnect', (reason) => {
  // reason: 'io server disconnect', 'io client namespace disconnect', 'ping timeout', etc.
});

// Connection error
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

// Attempting to reconnect
socket.on('reconnect_attempt', () => {
  console.log('Reconnecting...');
});

// Successfully reconnected
socket.on('reconnect', () => {
  console.log('Reconnected!');
});
```

---

## 3. Event Schema

### 3.1 Standard Event Format

**Server → Client (Broadcast/Emit)**:
```json
{
  "id": "evt_uuid_here",
  "type": "event_name",
  "channel": "channel_name",
  "sender": {
    "userId": "user_uuid",
    "userName": "John Doe"
  },
  "data": {
    /* event-specific data */
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0"
  }
}
```

**Client → Server (Action)**:
```json
{
  "id": "evt_uuid_here",
  "action": "action_name",
  "channel": "channel_name",
  "payload": {
    /* action-specific data */
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 3.2 Acknowledgment Pattern

```javascript
// Client sends with callback
socket.emit('action_name', data, (ack) => {
  console.log('Server acknowledged:', ack);
});

// Server-side
socket.on('action_name', (data, callback) => {
  // Process action
  callback({ success: true, data: /* result */ });
});
```

---

## 4. Channel Structure

### 4.1 Channel Types

#### User Channels (Private)

```
Naming: user:{userId}

Purpose: Personal notifications, direct messages, profile updates

Permissions: Only the user can join

Events:
  - USER_PROFILE_UPDATE
  - USER_SETTINGS_CHANGE
  - DIRECT_MESSAGE
  - NOTIFICATION
  - SESSION_STARTED
  - SESSION_ENDED

Example:
socket.emit('subscribe', { channel: 'user:abc123' });
socket.on('user_notification', (data) => { /* ... */ });
```

#### Room Channels (Shared)

```
Naming: room:{roomId}

Purpose: Shared spaces, team collaboration, discussions

Permissions: Users with room:view permission

Events:
  - MESSAGE
  - USER_JOINED
  - USER_LEFT
  - TYPING_START
  - TYPING_STOP
  - MESSAGE_EDITED
  - MESSAGE_DELETED
  - READ_RECEIPT

Example:
socket.emit('subscribe', { channel: 'room:xyz789' });
socket.on('room_message', (data) => { /* ... */ });
```

#### Broadcast Channels (System-wide)

```
Naming: broadcast:{topic}

Purpose: System announcements, notifications

Permissions: All authenticated users

Events:
  - SYSTEM_ANNOUNCEMENT
  - MAINTENANCE_ALERT
  - NEW_FEATURE
  - SECURITY_UPDATE
  - STATUS_UPDATE

Example:
socket.emit('subscribe', { channel: 'broadcast:announcements' });
socket.on('broadcast_announcement', (data) => { /* ... */ });
```

#### Presence Channels (Activity)

```
Naming: presence:{context}

Purpose: Track active users, online status

Permissions: Users with context:view permission

Events:
  - PRESENCE_JOINED
  - PRESENCE_LEFT
  - PRESENCE_UPDATE
  - ACTIVE_USERS

Example:
socket.emit('subscribe', { channel: 'presence:dashboard' });
socket.on('presence_user_joined', (data) => { /* ... */ });
```

---

## 5. Core Events

### 5.1 Connection Events

**Server → Client**:

```javascript
// Connection acknowledged
'connect_ack'
{
  userId: "user_uuid",
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  roles: ["user", "admin"],
  permissions: ["read:users", "write:posts"],
  connectedAt: "2024-01-15T10:30:00Z",
  sessionId: "session_uuid"
}

// Authentication failed
'auth_failed'
{
  code: "INVALID_TOKEN",
  message: "JWT token is invalid or expired"
}

// Permission denied
'permission_denied'
{
  channel: "room:xyz",
  message: "You don't have permission to join this channel"
}
```

### 5.2 Subscription Events

**Client → Server**:

```javascript
// Subscribe to channel
socket.emit('subscribe', {
  channel: "room:xyz",
  options: { /* optional */ }
}, callback);

// Unsubscribe from channel
socket.emit('unsubscribe', {
  channel: "room:xyz"
}, callback);

// List active subscriptions
socket.emit('list_subscriptions', {}, callback);
```

**Server → Client**:

```javascript
// Subscription confirmed
'subscribed'
{
  channel: "room:xyz",
  subscribers: 5,
  history: [ /* last 10 messages */ ]
}

// Unsubscription confirmed
'unsubscribed'
{
  channel: "room:xyz"
}

// User joined channel
'user_joined'
{
  channel: "room:xyz",
  userId: "user_uuid",
  userName: "Jane Smith",
  joinedAt: "2024-01-15T10:30:00Z",
  totalUsers: 6
}

// User left channel
'user_left'
{
  channel: "room:xyz",
  userId: "user_uuid",
  userName: "Jane Smith",
  leftAt: "2024-01-15T10:31:00Z",
  totalUsers: 5
}
```

### 5.3 Message Events

**Client → Server**:

```javascript
// Send message to channel
socket.emit('send_message', {
  channel: "room:xyz",
  content: "Hello everyone!",
  mentions: ["user_uuid_1"],
  attachments: [ /* optional */ ]
}, callback);

// Edit message
socket.emit('edit_message', {
  messageId: "msg_uuid",
  content: "Updated message",
  editedAt: "2024-01-15T10:31:00Z"
}, callback);

// Delete message
socket.emit('delete_message', {
  messageId: "msg_uuid"
}, callback);
```

**Server → Client**:

```javascript
// New message received
'new_message'
{
  id: "msg_uuid",
  channel: "room:xyz",
  sender: {
    userId: "user_uuid",
    userName: "John Doe",
    avatar: "https://cdn.example.com/john.jpg"
  },
  content: "Hello everyone!",
  mentions: [/* users mentioned */],
  attachments: [],
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: null,
  likes: 0
}

// Message edited
'message_edited'
{
  id: "msg_uuid",
  channel: "room:xyz",
  content: "Updated message",
  editedAt: "2024-01-15T10:31:00Z",
  editedBy: "user_uuid"
}

// Message deleted
'message_deleted'
{
  id: "msg_uuid",
  channel: "room:xyz",
  deletedAt: "2024-01-15T10:32:00Z"
}
```

### 5.4 Presence & Typing Events

**Client → Server**:

```javascript
// Indicate user is typing
socket.emit('typing_start', {
  channel: "room:xyz"
});

// Indicate user stopped typing
socket.emit('typing_stop', {
  channel: "room:xyz"
});

// Send read receipt
socket.emit('read_receipt', {
  messageId: "msg_uuid",
  channel: "room:xyz"
});

// Update user status
socket.emit('user_status', {
  status: "online|away|busy|offline",
  statusMessage: "In a meeting"
});
```

**Server → Client**:

```javascript
// User is typing
'typing_indicator'
{
  channel: "room:xyz",
  userId: "user_uuid",
  userName: "Jane Smith",
  typingAt: "2024-01-15T10:30:00Z"
}

// User stopped typing
'typing_stopped'
{
  channel: "room:xyz",
  userId: "user_uuid"
}

// Message read receipt
'message_read'
{
  messageId: "msg_uuid",
  userId: "user_uuid",
  readAt: "2024-01-15T10:30:00Z"
}

// User status changed
'user_status_changed'
{
  userId: "user_uuid",
  userName: "Jane Smith",
  status: "away",
  statusMessage: "In a meeting",
  changedAt: "2024-01-15T10:30:00Z"
}

// Active users in channel
'active_users'
{
  channel: "room:xyz",
  users: [
    {
      userId: "user_uuid_1",
      userName: "John Doe",
      status: "online",
      avatar: "url"
    }
  ],
  total: 5
}
```

### 5.5 Notification Events

**Server → Client**:

```javascript
// Generic notification
'notification'
{
  id: "notif_uuid",
  type: "info|success|warning|error",
  title: "Notification Title",
  message: "Notification message",
  data: { /* contextual data */ },
  actions: [
    { label: "Action", action: "action_name" }
  ],
  read: false,
  createdAt: "2024-01-15T10:30:00Z"
}

// Specific notifications
'user_mentioned'
{
  messageId: "msg_uuid",
  channel: "room:xyz",
  mentionedBy: "John Doe",
  excerpt: "Hey @Jane, check this out..."
}

'message_replied'
{
  messageId: "msg_uuid",
  channel: "room:xyz",
  repliedBy: "John Doe",
  replyCount: 2
}

'role_assigned'
{
  roleId: "role_uuid",
  roleName: "admin",
  assignedAt: "2024-01-15T10:30:00Z"
}

'permission_changed'
{
  permissions: ["read:users", "write:users"],
  changedAt: "2024-01-15T10:30:00Z"
}
```

### 5.6 Error Events

**Server → Client**:

```javascript
// Generic error
'error'
{
  code: "ERROR_CODE",
  message: "Human-readable error message",
  details: { /* additional context */ },
  requestId: "req_uuid"
}

// Examples
'error'
{
  code: "MESSAGE_NOT_FOUND",
  message: "Message does not exist"
}

'error'
{
  code: "CHANNEL_FULL",
  message: "Channel has reached maximum capacity"
}

'error'
{
  code: "RATE_LIMIT_EXCEEDED",
  message: "Too many messages. Please wait before sending more.",
  details: {
    retryAfter: 30
  }
}
```

---

## 6. Message Flow Examples

### 6.1 Simple Message Exchange

```
Client                              Server
  │                                   │
  ├─── emit('send_message', {}) ────>│
  │     content: "Hello"              │
  │                                   │
  │                                   ├─ Validate message
  │                                   ├─ Save to DB
  │                                   ├─ Broadcast to room
  │                                   │
  │<─── emit callback ────────────────┤
  │     { success: true }             │
  │                                   │
  │<─── on('new_message') ────────────┤
  │     { id, content, timestamp }    │
  │                                   │
```

### 6.2 Real-time Collaboration

```
User A                          Server                          User B
  │                               │                               │
  ├─── subscribe(room:xyz) ────>  │                               │
  │                               ├── add to room                 │
  │                               │── broadcast user_joined       │
  │                               │<─── subscribe(room:xyz) ──────┤
  │                               │
  │                               ├── send active_users
  │<─── on('user_joined') ────────┤─── on('subscribed') ────────>│
  │                               │
  │─── typing_start ────────────> │── broadcast to room
  │                               │<─── on('typing_indicator') ───┤
  │                               │
  │─── send_message ────────────> │── save message
  │                               │── broadcast new_message
  │<─ on('new_message') ──────────────── on('new_message') ──────┤
  │                               │
```

### 6.3 Error Handling with Retry

```
Client                              Server
  │                                   │
  ├─── emit('action', data) ────────>│
  │                                   │
  │                                   ├─ Error occurs
  │<─── emit callback(error) ─────────┤
  │     { code, message }             │
  │                                   │
  │ (Client retries after delay)      │
  │                                   │
  ├─── emit('action', data) ────────>│
  │                                   │
  │                                   ├─ Success
  │<─── emit callback(success) ───────┤
  │     { data }                      │
```

---

## 7. Authentication & Authorization

### 7.1 Token-based Authentication

```javascript
// Client connects with JWT token
const socket = io('wss://api.example.com', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIs...'
  }
});

// Server validates token
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication failed'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.roles = decoded.roles;
    socket.permissions = decoded.permissions;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});
```

### 7.2 Channel-level Authorization

```javascript
// Subscribe with permission check
socket.on('subscribe', (data, callback) => {
  const { channel } = data;
  
  // Check if user has permission to join channel
  if (!hasPermission(socket.userId, channel)) {
    return callback({ 
      success: false, 
      error: 'PERMISSION_DENIED' 
    });
  }
  
  socket.join(channel);
  callback({ success: true });
});
```

### 7.3 Event-level Authorization

```javascript
// Validate permission before processing event
socket.on('send_message', (data, callback) => {
  const { channel } = data;
  
  // Check room membership
  if (!socket.rooms.has(channel)) {
    return callback({ 
      success: false, 
      error: 'NOT_IN_CHANNEL' 
    });
  }
  
  // Check message permission
  if (!socket.permissions.includes('write:messages')) {
    return callback({ 
      success: false, 
      error: 'PERMISSION_DENIED' 
    });
  }
  
  // Process message
  io.to(channel).emit('new_message', message);
  callback({ success: true });
});
```

---

## 8. Reconnection & Offline Handling

### 8.1 Automatic Reconnection

```javascript
const socket = io('wss://api.example.com', {
  reconnection: true,
  reconnectionDelay: 1000,           // Start at 1s
  reconnectionDelayMax: 5000,        // Max 5s
  reconnectionAttempts: 5,           // Try 5 times
  randomizationFactor: 0.1           // Add randomization
});

// Exponential backoff: 1s, 2.2s, 4.84s, 10.648s, 23.42s
```

### 8.2 Offline Message Queue

```javascript
// Client-side queue for offline messages
class OfflineQueue {
  constructor() {
    this.queue = [];
  }
  
  add(event, data) {
    this.queue.push({ event, data, timestamp: Date.now() });
    this.save();
  }
  
  flush(socket) {
    this.queue.forEach(({ event, data }) => {
      socket.emit(event, data);
    });
    this.queue = [];
    this.save();
  }
  
  save() {
    localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
  }
}

// On reconnection
socket.on('connect', () => {
  offlineQueue.flush(socket);
});
```

### 8.3 Message Acknowledgment

```javascript
// Client sends with acknowledgment
socket.emit('send_message', { 
  channel: 'room:xyz', 
  content: 'Hello' 
}, (ack) => {
  if (ack.success) {
    // Message delivered to server
    saveToPendingDeleted(); // Remove from pending
  } else {
    // Retry or queue
  }
});
```

---

## 9. Scaling & Deployment

### 9.1 Multiple Server Instances

```
Use Redis Adapter for Socket.io:

const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient();
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### 9.2 Channel Routing

```
Load Balancer
        │
    ┌───┴───┐
    │       │
   WS1     WS2
   
Channel 'room:xyz' subscribers:
- User A connected to WS1
- User B connected to WS2
- User C connected to WS1

Message from User A broadcasts via:
1. Redis adapter sends to all servers
2. WS1 sends to Users A & C
3. WS2 sends to User B
```

### 9.3 Connection Limits

```
Per server instance:
- Max connections: 10,000
- Message queue per connection: 1000
- Memory per connection: ~10KB

Scaling:
- 1 server: 10,000 concurrent
- 5 servers: 50,000 concurrent
- 10 servers: 100,000 concurrent
```

---

## 10. Monitoring & Debugging

### 10.1 Metrics to Track

```
Connection Metrics:
- Active connections
- Connection attempts
- Failed connections
- Reconnection rate
- Average connection duration

Event Metrics:
- Messages per second
- Event types distribution
- Event processing time
- Error rate by event type
- Queue size

Performance:
- Message latency (p50, p95, p99)
- Memory usage
- CPU usage
- Network bandwidth
```

### 10.2 Logging

```javascript
// Server-side logging
io.use((socket, next) => {
  logger.info('Connection attempt', {
    socketId: socket.id,
    userId: socket.handshake.auth.userId,
    ip: socket.handshake.address,
    timestamp: new Date().toISOString()
  });
  next();
});

socket.on('subscribe', (data) => {
  logger.info('Channel subscription', {
    socketId: socket.id,
    userId: socket.userId,
    channel: data.channel,
    timestamp: new Date().toISOString()
  });
});

socket.on('error', (error) => {
  logger.error('Socket error', {
    socketId: socket.id,
    userId: socket.userId,
    error: error.message,
    timestamp: new Date().toISOString()
  });
});
```

### 10.3 Debug Mode

```javascript
// Enable debug logging
import debug from 'debug';

// Client-side
localStorage.debug = 'socket.io-client:socket';

// Server-side
process.env.DEBUG = 'socket.io:*';
```

---

## 11. Security Best Practices

### 11.1 Input Validation

```javascript
socket.on('send_message', (data, callback) => {
  // Validate message content
  if (!data.content || typeof data.content !== 'string') {
    return callback({ error: 'Invalid message' });
  }
  
  // Sanitize HTML
  const sanitized = xss(data.content);
  
  // Check length
  if (sanitized.length > 5000) {
    return callback({ error: 'Message too long' });
  }
  
  // Process
  io.to(data.channel).emit('new_message', { 
    content: sanitized 
  });
});
```

### 11.2 Rate Limiting

```javascript
const rateLimit = require('socket.io-rate-limiter');

io.use(rateLimit({
  store: redisStore,
  points: 100,              // Number of points
  duration: 60,             // Per 60 seconds
  blockDuration: 60 * 15    // Block for 15 minutes on limit
}));
```

### 11.3 Message Encryption

```javascript
// End-to-end encryption for private channels
socket.on('send_message', (data, callback) => {
  if (data.encrypted) {
    // Verify signature
    if (!verifySignature(data)) {
      return callback({ error: 'Invalid signature' });
    }
  }
  
  // Process encrypted message
  io.to(data.channel).emit('new_message', data);
});
```

---

## 12. Testing WebSocket Communication

### 12.1 Client-side Tests

```javascript
describe('WebSocket Communication', () => {
  let socket;
  
  beforeEach((done) => {
    socket = io('http://localhost:3000', {
      auth: { token: 'test_token' }
    });
    socket.on('connect', done);
  });
  
  afterEach(() => {
    socket.disconnect();
  });
  
  it('should receive message on subscription', (done) => {
    socket.emit('subscribe', { channel: 'room:test' });
    
    socket.on('new_message', (data) => {
      expect(data.content).toBe('Hello');
      done();
    });
    
    socket.emit('send_message', { 
      channel: 'room:test', 
      content: 'Hello' 
    });
  });
});
```

### 12.2 Server-side Tests

```javascript
describe('Server WebSocket', () => {
  let io, socket;
  
  beforeAll((done) => {
    io = require('socket.io')();
    io.listen(3000);
    done();
  });
  
  it('should authenticate connection', (done) => {
    const socket = require('socket.io-client')('http://localhost:3000', {
      auth: { token: 'valid_token' }
    });
    
    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      socket.disconnect();
      done();
    });
  });
});
```

---

## Appendix: Quick Reference

| Event | Direction | Purpose |
|-------|-----------|---------|
| `connect` | S→C | Connection established |
| `connect_ack` | S→C | Initial connection data |
| `disconnect` | Both | Disconnection |
| `subscribe` | C→S | Join channel |
| `subscribed` | S→C | Joined channel |
| `send_message` | C→S | Send message |
| `new_message` | S→C | Receive message |
| `typing_start` | C→S | User is typing |
| `typing_indicator` | S→C | Show typing indicator |
| `user_joined` | S→C | User entered channel |
| `user_left` | S→C | User left channel |
| `notification` | S→C | System notification |
| `error` | S→C | Error event |

---

## Example: Complete Chat Implementation

```javascript
// Client-side
class ChatClient {
  constructor(token) {
    this.socket = io('wss://api.example.com', {
      auth: { token }
    });
    this.setupListeners();
  }
  
  setupListeners() {
    this.socket.on('connect', () => console.log('Connected'));
    this.socket.on('new_message', (msg) => this.onMessage(msg));
    this.socket.on('typing_indicator', (data) => this.onTyping(data));
  }
  
  joinRoom(roomId) {
    this.socket.emit('subscribe', { channel: `room:${roomId}` });
  }
  
  sendMessage(roomId, content) {
    this.socket.emit('send_message', {
      channel: `room:${roomId}`,
      content
    });
  }
  
  notifyTyping(roomId) {
    this.socket.emit('typing_start', { 
      channel: `room:${roomId}` 
    });
  }
  
  onMessage(message) {
    console.log('New message:', message);
  }
  
  onTyping(data) {
    console.log(`${data.userName} is typing...`);
  }
}
```
