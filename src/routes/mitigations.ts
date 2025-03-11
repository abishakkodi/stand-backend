import { Router, Request, Response } from 'express';
import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../config/supabase.js';
import {
  CreateMitigationTypeSchema,
  UpdateMitigationTypeSchema,
  CreateMitigationValueSchema,
  UpdateMitigationValueSchema
} from '../types/requests.js';

const router = Router();

// Mitigation Types Routes

router.post('/types', async (req: Request, res: Response) => {
  try {
    const data = CreateMitigationTypeSchema.parse(req.body);
    
    const { data: mitigationType, error } = await supabase
      .from('mitigation_types')
      .insert(data)
      .select()
      .single();

    if (error) {
      const pgError = error as PostgrestError;
      throw new Error(pgError.message);
    }
    
    res.status(201).json(mitigationType);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: 'An unknown error occurred' });
    }
  }
});

router.get('/types', async (_req: Request, res: Response) => {
  try {
    const { data: mitigationTypes, error } = await supabase
      .from('mitigation_types')
      .select('*')
      .order('name');

    if (error) throw error;
    
    res.json(mitigationTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/types/:id', async (req: Request, res: Response) => {
  try {
    const { data: mitigationType, error } = await supabase
      .from('mitigation_types')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!mitigationType) {
      return res.status(404).json({ error: 'Mitigation type not found' });
    }
    
    res.json(mitigationType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/types/:id', async (req: Request, res: Response) => {
  try {
    const data = UpdateMitigationTypeSchema.parse({ ...req.body, id: req.params.id });
    
    const { data: mitigationType, error } = await supabase
      .from('mitigation_types')
      .update(data)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!mitigationType) {
      return res.status(404).json({ error: 'Mitigation type not found' });
    }
    
    res.json(mitigationType);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/types/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('mitigation_types')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mitigation Values Routes

router.post('/values', async (req: Request, res: Response) => {
  try {
    const data = CreateMitigationValueSchema.parse(req.body);
    
    const { data: mitigationValue, error } = await supabase
      .from('mitigation_values')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    
    res.status(201).json(mitigationValue);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/values', async (req: Request, res: Response) => {
  try {
    const query = supabase
      .from('mitigation_values')
      .select('*, mitigation_types(name)')
      .order('value');

    if (req.query.type_id) {
      query.eq('mitigation_type_id', req.query.type_id);
    }

    const { data: mitigationValues, error } = await query;

    if (error) throw error;
    
    res.json(mitigationValues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/values/:id', async (req: Request, res: Response) => {
  try {
    const { data: mitigationValue, error } = await supabase
      .from('mitigation_values')
      .select('*, mitigation_types(name)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!mitigationValue) {
      return res.status(404).json({ error: 'Mitigation value not found' });
    }
    
    res.json(mitigationValue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/values/:id', async (req: Request, res: Response) => {
  try {
    const data = UpdateMitigationValueSchema.parse({ ...req.body, id: req.params.id });
    
    const { data: mitigationValue, error } = await supabase
      .from('mitigation_values')
      .update(data)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!mitigationValue) {
      return res.status(404).json({ error: 'Mitigation value not found' });
    }
    
    res.json(mitigationValue);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/values/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('mitigation_values')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 