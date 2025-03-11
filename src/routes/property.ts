import { Router, Request, Response } from 'express';
import { CreatePropertyAssessmentSchema, CreatePropertySchema } from '../types/requests.js';
import { pool } from '../config/database.js';
import { z } from 'zod';

const router = Router();

/**
 * Create a new property
 * @route POST /property
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = CreatePropertySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request body',
        details: validationResult.error.issues 
      });
    }

    const {
      address,
      full_address,
      year_built,
      location,
      underwriter_user_id,
      assessed_value,
      assessed_value_currency
    } = validationResult.data;

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO properties (
          address,
          full_address,
          year_built,
          location,
          underwriter_user_id,
          assessed_value,
          assessed_value_currency,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id`,
        [
          address,
          full_address,
          year_built,
          location,
          underwriter_user_id,
          assessed_value,
          assessed_value_currency
        ]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Property created successfully',
        property_id: result.rows[0].id
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create property'
    });
  }
});

/**
 * Create a new property assessment with observations
 * @route POST /property/:id/assessment
 */
router.post('/:id/assessment', async (req: Request, res: Response) => {
  try {
    // Validate request parameters
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({ error: 'Invalid property ID format' });
    }

    // Validate request body
    const validationResult = CreatePropertyAssessmentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request body',
        details: validationResult.error.issues 
      });
    }

    const { assessor_id, observations, property_id } = validationResult.data;

    // Verify property IDs match
    if (id !== property_id) {
      return res.status(400).json({ 
        error: 'Property ID in URL does not match the one in request body' 
      });
    }

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create property assessment
      const assessmentResult = await client.query(
        `INSERT INTO property_assessments (
          property_id,
          assessor_id,
          assessment_date,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, NOW(), 'completed', NOW(), NOW())
        RETURNING id`,
        [property_id, assessor_id]
      );

      const assessmentId = assessmentResult.rows[0].id;

      // Create assessment observations
      for (const observation of observations) {
        await client.query(
          `INSERT INTO assessment_observations (
            assessment_id,
            observation_type_id,
            observation_value_id,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, NOW(), NOW())`,
          [assessmentId, observation.observation_type_id, observation.observation_value_id]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Property assessment created successfully',
        assessment_id: assessmentId
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating property assessment:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create property assessment'
    });
  }
});

export default router; 