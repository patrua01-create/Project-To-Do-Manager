import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { createServer } from 'http';
import './config/passport.js';
import { initializeDatabase, closeDatabaseConnection } from './config/database.js';
import { initializeWebSocket } from './config/websocket.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import { ApiResponse } from './types/index.js';

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.get('/health', (_req, res) => {
  const response: ApiResponse = {
    success: true,
    data: { status: 'ok' }
  };
  res.json(response);
});

app.use('/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await initializeDatabase();

    const server = createServer(app);
    initializeWebSocket(server, FRONTEND_URL);

    server.listen(PORT, () => {
      console.log(`✓ Database connected`);
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`  API: http://localhost:${PORT}`);
      console.log(`  Frontend: ${FRONTEND_URL}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await closeDatabaseConnection();
    process.exit(0);
  });

  start();
}

export default app;
