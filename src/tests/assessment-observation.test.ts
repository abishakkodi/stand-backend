import { supabaseAdmin } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Assessment Observation Management', () => {
  beforeEach(async () => {
    // Clean up existing data
    await supabaseAdmin.from('assessment_observations').delete().neq('id', 0);
    await supabaseAdmin.from('vulnerabilities').delete().neq('id', 0);
    await supabaseAdmin.from('property_assessments').delete().neq('id', 0);
    await supabaseAdmin.from('mitigation_values').delete().neq('id', 0);
    await supabaseAdmin.from('mitigation_types').delete().neq('id', 0);
  });

  describe('Update Assessment Observation', () => {
    it('should link vulnerability and mitigation to an observation', async () => {
      // Create test property assessment
      const { data: assessment } = await supabaseAdmin
        .from('property_assessments')
        .insert({
          property_id: 1,
          assessor_id: uuidv4()
        })
        .select()
        .single();
      if (!assessment) throw new Error('Failed to create assessment');

      // Create test observation
      const { data: observation } = await supabaseAdmin
        .from('assessment_observations')
        .insert({
          assessment_id: assessment.id,
          observation_type_id: uuidv4(),
          observation_value_id: uuidv4()
        })
        .select()
        .single();
      if (!observation) throw new Error('Failed to create observation');

      // Create test vulnerability
      const { data: vulnerability } = await supabaseAdmin
        .from('vulnerabilities')
        .insert({
          rule_id: uuidv4(),
          property_id: 1,
          assessment_id: assessment.id,
          status: 'open'
        })
        .select()
        .single();
      if (!vulnerability) throw new Error('Failed to create vulnerability');

      // Create test mitigation type and value
      const { data: mitigationType } = await supabaseAdmin
        .from('mitigation_types')
        .insert({
          name: 'Test Mitigation Type',
          value_type: 'enum'
        })
        .select()
        .single();
      if (!mitigationType) throw new Error('Failed to create mitigation type');

      const { data: mitigationValue } = await supabaseAdmin
        .from('mitigation_values')
        .insert({
          mitigation_type_id: mitigationType.id,
          value: 'test-value',
          category: 'FULL'
        })
        .select()
        .single();
      if (!mitigationValue) throw new Error('Failed to create mitigation value');

      // Update the observation with vulnerability and mitigation
      const response = await fetch(`/api/property-assessments/observations/${observation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vulnerability_id: vulnerability.id,
          mitigation_id: mitigationValue.id
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.message).toBe('Assessment observation updated successfully');
      expect(result.observation.vulnerability_id).toBe(vulnerability.id);
      expect(result.observation.mitigation_id).toBe(mitigationValue.id);

      // Verify the update in the database
      const { data: updatedObservation } = await supabaseAdmin
        .from('assessment_observations')
        .select()
        .eq('id', observation.id)
        .single();

      expect(updatedObservation).toBeTruthy();
      expect(updatedObservation?.vulnerability_id).toBe(vulnerability.id);
      expect(updatedObservation?.mitigation_id).toBe(mitigationValue.id);
    });

    it('should return 404 for non-existent observation', async () => {
      const response = await fetch(`/api/property-assessments/observations/${uuidv4()}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vulnerability_id: uuidv4(),
          mitigation_id: uuidv4()
        })
      });

      expect(response.status).toBe(404);
      const result = await response.json();
      expect(result.error).toBe('Assessment observation not found');
    });

    it('should validate request body', async () => {
      const response = await fetch(`/api/property-assessments/observations/${uuidv4()}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vulnerability_id: 'invalid-uuid',
          mitigation_id: 'invalid-uuid'
        })
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Invalid request body');
      expect(result.details).toBeTruthy();
    });
  });
}); 