import express from 'express';
import cors from 'cors';
import propertyRouter from './routes/property.js';
import rulesRouter from './routes/rules.js';
import observationsRouter from './routes/observations.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/property', propertyRouter);
app.use('/rules', rulesRouter);
app.use('/observations', observationsRouter);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

export default app; 