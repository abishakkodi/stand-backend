import { Router, Request, Response } from 'express';
import {
  CreateObservationTypeSchema,
  UpdateObservationTypeSchema,
  CreateObservationValueSchema,
  UpdateObservationValueSchema
} from '../types/requests.js';
import { pool } from '../config/database.js';
import { z } from 'zod';

const router = Router();

/**
 * Create a new observation type
 * @route POST /observations/types
 */
router.post('/types', async (req: Request, res: Response) => {
  try {
    const validationResult = CreateObservationTypeSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues
      });
    }

    const { name, description, value_type, multiple } = validationResult.data;

    const result = await pool.query(
      `INSERT INTO observation_types (
        name,
        description,
        value_type,
        multiple,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING id`,
      [name, description, value_type, multiple]
    );

    res.status(201).json({
      message: 'Observation type created successfully',
      type_id: result.rows[0].id
    });

  } catch (error) {
    console.error('Error creating observation type:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create observation type'
    });
  }
});

/**
 * Get all observation types
 * @route GET /observations/types
 */
router.get('/types', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM observation_types ORDER BY name ASC'
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching observation types:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch observation types'
    });
  }
});

/**
 * Get a specific observation type
 * @route GET /observations/types/:id
 */
router.get('/types/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({ error: 'Invalid observation type ID format' });
    }

    const result = await pool.query(
      'SELECT * FROM observation_types WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Observation type not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching observation type:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch observation type'
    });
  }
});

/**
 * Update an observation type
 * @route PUT /observations/types/:id
 */
router.put('/types/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({ error: 'Invalid observation type ID format' });
    }

    const validationResult = UpdateObservationTypeSchema.safeParse({ ...req.body, id });
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues
      });
    }

    const { name, description, value_type, multiple } = validationResult.data;

    const updates: string[] = [];
    const values: any[] = [];
    let valueIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${valueIndex}`);
      values.push(name);
      valueIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${valueIndex}`);
      values.push(description);
      valueIndex++;
    }
    if (value_type !== undefined) {
      updates.push(`value_type = $${valueIndex}`);
      values.push(value_type);
      valueIndex++;
    }
    if (multiple !== undefined) {
      updates.push(`multiple = $${valueIndex}`);
      values.push(multiple);
      valueIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE observation_types
       SET ${updates.join(', ')}
       WHERE id = $${valueIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Observation type not found' });
    }

    res.json({
      message: 'Observation type updated successfully',
      type: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating observation type:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update observation type'
    });
  }
});

/**
 * Delete an observation type
 * @route DELETE /observations/types/:id
 */
router.delete('/types/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({ error: 'Invalid observation type ID format' });
    }

    const result = await pool.query(
      'DELETE FROM observation_types WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Observation type not found' });
    }

    res.json({
      message: 'Observation type deleted successfully',
      type_id: result.rows[0].id
    });

  } catch (error) {
    console.error('Error deleting observation type:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete observation type'
    });
  }
});

/**
 * Create a new observation value
 * @route POST /observations/values
 */
router.post('/values', async (req: Request, res: Response) => {
  try {
    const validationResult = CreateObservationValueSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues
      });
    }

    const { observation_type_id, value, description } = validationResult.data;

    // Verify observation type exists
    const typeExists = await pool.query(
      'SELECT id FROM observation_types WHERE id = $1',
      [observation_type_id]
    );

    if (typeExists.rows.length === 0) {
      return res.status(404).json({ error: 'Observation type not found' });
    }

    const result = await pool.query(
      `INSERT INTO observation_values (
        observation_type_id,
        value,
        description,
        created_at
      ) VALUES ($1, $2, $3, NOW())
      RETURNING id`,
      [observation_type_id, value, description]
    );

    res.status(201).json({
      message: 'Observation value created successfully',
      value_id: result.rows[0].id
    });

  } catch (error) {
    console.error('Error creating observation value:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create observation value'
    });
  }
});

/**
 * Get all observation values for a type
 * @route GET /observations/types/:typeId/values
 */
router.get('/types/:typeId/values', async (req: Request, res: Response) => {
  try {
    const { typeId } = req.params;
    if (!z.string().uuid().safeParse(typeId).success) {
      return res.status(400).json({ error: 'Invalid observation type ID format' });
    }

    const result = await pool.query(
      'SELECT * FROM observation_values WHERE observation_type_id = $1 ORDER BY value ASC',
      [typeId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching observation values:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch observation values'
    });
  }
});

/**
 * Get a specific observation value
 * @route GET /observations/values/:id
 */
router.get('/values/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({ error: 'Invalid observation value ID format' });
    }

    const result = await pool.query(
      'SELECT * FROM observation_values WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Observation value not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching observation value:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch observation value'
    });
  }
});

/**
 * Update an observation value
 * @route PUT /observations/values/:id
 */
router.put('/values/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({ error: 'Invalid observation value ID format' });
    }

    const validationResult = UpdateObservationValueSchema.safeParse({ ...req.body, id });
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues
      });
    }

    const { observation_type_id, value, description } = validationResult.data;

    const updates: string[] = [];
    const values: any[] = [];
    let valueIndex = 1;

    if (observation_type_id !== undefined) {
      // Verify new observation type exists
      const typeExists = await pool.query(
        'SELECT id FROM observation_types WHERE id = $1',
        [observation_type_id]
      );

      if (typeExists.rows.length === 0) {
        return res.status(404).json({ error: 'Observation type not found' });
      }

      updates.push(`observation_type_id = $${valueIndex}`);
      values.push(observation_type_id);
      valueIndex++;
    }
    if (value !== undefined) {
      updates.push(`value = $${valueIndex}`);
      values.push(value);
      valueIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${valueIndex}`);
      values.push(description);
      valueIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE observation_values
       SET ${updates.join(', ')}
       WHERE id = $${valueIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Observation value not found' });
    }

    res.json({
      message: 'Observation value updated successfully',
      value: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating observation value:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update observation value'
    });
  }
});

/**
 * Delete an observation value
 * @route DELETE /observations/values/:id
 */
router.delete('/values/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({ error: 'Invalid observation value ID format' });
    }

    const result = await pool.query(
      'DELETE FROM observation_values WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Observation value not found' });
    }

    res.json({
      message: 'Observation value deleted successfully',
      value_id: result.rows[0].id
    });

  } catch (error) {
    console.error('Error deleting observation value:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete observation value'
    });
  }
});

export default router; 