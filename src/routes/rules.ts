import { Router, Request, Response } from 'express';
import { CreateRuleSchema, UpdateRuleSchema } from '../types/requests.js';
import { pool } from '../config/database.js';
import { z } from 'zod';

const router = Router();

/**
 * Create a new rule
 * @route POST /rules
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = CreateRuleSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues
      });
    }

    const {
      name,
      description,
      is_active,
      effective_from,
      effective_to,
      user_id,
      version,
      functional_rule
    } = validationResult.data;

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO rules (
          name,
          description,
          is_active,
          effective_from,
          effective_to,
          user_id,
          version,
          functional_rule,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING rule_id`,
        [
          name,
          description,
          is_active,
          effective_from,
          effective_to,
          user_id,
          version,
          JSON.stringify(functional_rule)
        ]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Rule created successfully',
        rule_id: result.rows[0].rule_id
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating rule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create rule'
    });
  }
});

/**
 * Get all rules
 * @route GET /rules
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM rules ORDER BY name ASC`
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching rules:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch rules'
    });
  }
});

/**
 * Get a specific rule by ID
 * @route GET /rules/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({ error: 'Invalid rule ID format' });
    }

    const result = await pool.query(
      'SELECT * FROM rules WHERE rule_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching rule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch rule'
    });
  }
});

/**
 * Update a rule
 * @route PUT /rules/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({ error: 'Invalid rule ID format' });
    }

    // Validate request body
    const validationResult = UpdateRuleSchema.safeParse({ ...req.body, rule_id: id });
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues
      });
    }

    const {
      name,
      description,
      is_active,
      effective_from,
      effective_to,
      user_id,
      version,
      functional_rule
    } = validationResult.data;

    // Build dynamic update query
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
    if (is_active !== undefined) {
      updates.push(`is_active = $${valueIndex}`);
      values.push(is_active);
      valueIndex++;
    }
    if (effective_from !== undefined) {
      updates.push(`effective_from = $${valueIndex}`);
      values.push(effective_from);
      valueIndex++;
    }
    if (effective_to !== undefined) {
      updates.push(`effective_to = $${valueIndex}`);
      values.push(effective_to);
      valueIndex++;
    }
    if (user_id !== undefined) {
      updates.push(`user_id = $${valueIndex}`);
      values.push(user_id);
      valueIndex++;
    }
    if (version !== undefined) {
      updates.push(`version = $${valueIndex}`);
      values.push(version);
      valueIndex++;
    }
    if (functional_rule !== undefined) {
      updates.push(`functional_rule = $${valueIndex}`);
      values.push(JSON.stringify(functional_rule));
      valueIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add ID to values array
    values.push(id);

    const result = await pool.query(
      `UPDATE rules
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE rule_id = $${valueIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({
      message: 'Rule updated successfully',
      rule: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating rule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update rule'
    });
  }
});

/**
 * Delete a rule
 * @route DELETE /rules/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({ error: 'Invalid rule ID format' });
    }

    const result = await pool.query(
      'DELETE FROM rules WHERE rule_id = $1 RETURNING rule_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({
      message: 'Rule deleted successfully',
      rule_id: result.rows[0].rule_id
    });

  } catch (error) {
    console.error('Error deleting rule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete rule'
    });
  }
});

export default router; 