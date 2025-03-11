import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import {
  CreateVulnerabilitySchema,
  UpdateVulnerabilitySchema
} from '../types/requests.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = CreateVulnerabilitySchema.parse(req.body);
    
    const { data: vulnerability, error } = await supabase
      .from('vulnerabilities')
      .insert(data)
      .select(`
        *,
        rules (name),
        property_assessments (id, created_at),
        mitigation_types (name)
      `)
      .single();

    if (error) throw error;
    
    res.status(201).json(vulnerability);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = supabase
      .from('vulnerabilities')
      .select(`
        *,
        rules (name),
        property_assessments (id, created_at),
        mitigation_types (name)
      `)
      .order('detected_at', { ascending: false });

    // Apply filters if provided
    if (req.query.property_id) {
      query.eq('property_id', req.query.property_id);
    }
    if (req.query.status) {
      query.eq('status', req.query.status);
    }
    if (req.query.assessment_id) {
      query.eq('assessment_id', req.query.assessment_id);
    }

    const { data: vulnerabilities, error } = await query;

    if (error) throw error;
    
    res.json(vulnerabilities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { data: vulnerability, error } = await supabase
      .from('vulnerabilities')
      .select(`
        *,
        rules (name),
        property_assessments (id, created_at),
        mitigation_types (name)
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!vulnerability) {
      return res.status(404).json({ error: 'Vulnerability not found' });
    }
    
    res.json(vulnerability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = UpdateVulnerabilitySchema.parse({ ...req.body, id: req.params.id });
    
    const { data: vulnerability, error } = await supabase
      .from('vulnerabilities')
      .update(data)
      .eq('id', req.params.id)
      .select(`
        *,
        rules (name),
        property_assessments (id, created_at),
        mitigation_types (name)
      `)
      .single();

    if (error) throw error;
    if (!vulnerability) {
      return res.status(404).json({ error: 'Vulnerability not found' });
    }
    
    res.json(vulnerability);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('vulnerabilities')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 