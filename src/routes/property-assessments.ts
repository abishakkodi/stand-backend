import { Router, Request, Response } from 'express';
import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../config/supabase.js';
import { CreatePropertyAssessmentSchema, UpdateAssessmentObservationSchema } from '../types/requests.js';
import { RulesEngine } from '../services/rules/rules-engine.js';

const router = Router();
const rulesEngine = new RulesEngine();

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = CreatePropertyAssessmentSchema.parse(req.body);
    
    // Start a transaction to insert assessment and observations
    const { data: assessment, error: assessmentError } = await supabase
      .from('property_assessments')
      .insert({
        property_id: data.property_id,
        assessor_id: data.assessor_id
      })
      .select()
      .single();

    if (assessmentError) {
      const pgError = assessmentError as PostgrestError;
      throw new Error(pgError.message);
    }

    // Insert observations
    const observations = data.observations.map(obs => ({
      ...obs,
      assessment_id: assessment.id
    }));

    const { data: createdObservations, error: observationsError } = await supabase
      .from('assessment_observations')
      .insert(observations)
      .select();

    if (observationsError) {
      const pgError = observationsError as PostgrestError;
      throw new Error(pgError.message);
    }

    // Process the assessment for vulnerabilities
    await rulesEngine.processAssessment({
      id: assessment.id,
      property_id: data.property_id,
      observations: createdObservations
    });

    res.status(201).json({
      ...assessment,
      observations: createdObservations
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: 'An unknown error occurred' });
    }
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = supabase
      .from('property_assessments')
      .select(`
        *,
        assessment_observations (
          id,
          observation_type_id,
          observation_value_id
        )
      `);

    if (req.query.property_id) {
      query.eq('property_id', req.query.property_id);
    }

    const { data: assessments, error } = await query;

    if (error) {
      const pgError = error as PostgrestError;
      throw new Error(pgError.message);
    }

    res.json(assessments);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { data: assessment, error } = await supabase
      .from('property_assessments')
      .select(`
        *,
        assessment_observations (
          id,
          observation_type_id,
          observation_value_id
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) {
      const pgError = error as PostgrestError;
      throw new Error(pgError.message);
    }

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    res.json(assessment);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

/**
 * Update an assessment observation with vulnerability and mitigation
 * @route PATCH /property-assessments/observations/:id
 */
router.patch('/observations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Observation ID is required' });
    }

    const validationResult = UpdateAssessmentObservationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues
      });
    }

    const { vulnerability_id, mitigation_id } = validationResult.data;

    // Update the assessment observation
    const { data: updatedObservation, error: updateError } = await supabase
      .from('assessment_observations')
      .update({
        vulnerability_id,
        mitigation_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      const pgError = updateError as PostgrestError;
      throw new Error(pgError.message);
    }

    if (!updatedObservation) {
      return res.status(404).json({ error: 'Assessment observation not found' });
    }

    res.json({
      message: 'Assessment observation updated successfully',
      observation: updatedObservation
    });

  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

export default router; 