import { Router } from 'express';
import { healthRouter } from './health.js';

export const router = Router();

// Health check route
router.use('/health', healthRouter);

// Add other routes here
// router.use('/users', usersRouter);
// router.use('/posts', postsRouter);
// etc. 