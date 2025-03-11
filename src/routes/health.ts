import { Router } from 'express';
import { supabaseService } from '../config/supabase.js';
import { RequestHandler } from '../types/index.js';
import { HealthResponse } from '../types/index.js';

export const healthRouter = Router();

const healthCheck: RequestHandler = async (_req, res) => {
  try {
    const isHealthy = await supabaseService.healthCheck();

    const response: HealthResponse = {
      success: isHealthy,
      message: isHealthy ? 'API is healthy' : 'API is running but database connection failed',
      database: isHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    };

    res.status(isHealthy ? 200 : 503).json(response);
  } catch (error) {
    const response: HealthResponse = {
      success: false,
      message: 'API is running but database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
};

healthRouter.get('/', healthCheck); 