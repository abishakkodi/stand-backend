import { supabaseAdmin } from '../config/supabase.js';
import { rulesEngine } from '../services/rules-engine.js';
import { PointInTimeAssessment } from '../services/rules-engine.js';
import { v4 as uuidv4 } from 'uuid';
import { RulesEngine } from '../services/rules/rules-engine.js';
import { MitigationOption } from '../services/rules/types.js';

describe('Mitigation Handling', () => {
  beforeEach(async () => {
    // Clean up existing data
    await supabaseAdmin.from('vulnerabilities').delete().neq('id', 0);
    await supabaseAdmin.from('mitigation_values').delete().neq('id', 0);
    await supabaseAdmin.from('mitigation_types').delete().neq('id', 0);
    await supabaseAdmin.from('rules').delete().neq('id', 0);
    await supabaseAdmin.from('observation_values').delete().neq('id', 0);
    await supabaseAdmin.from('observation_types').delete().neq('id', 0);
    await supabaseAdmin.from('properties').delete().neq('id', 0);
  });

  describe('Underwriter - View Mitigation Options', () => {
    it('should get all mitigation options for a vulnerability', async () => {
      // Create test property
      const { data: property } = await supabaseAdmin
        .from('properties')
        .insert({ name: 'Test Property' })
        .select()
        .single();
      if (!property) throw new Error('Failed to create property');

      // Create mitigation type
      const { data: mitigationType } = await supabaseAdmin
        .from('mitigation_types')
        .insert({
          name: 'Window Protection',
          description: 'Methods to protect windows',
          value_type: 'enum',
          multiple: false
        })
        .select()
        .single();
      if (!mitigationType) throw new Error('Failed to create mitigation type');

      // Create mitigation values
      const { data: mitigationValues } = await supabaseAdmin
        .from('mitigation_values')
        .insert([
          {
            mitigation_type_id: mitigationType.id,
            value: 'Install storm shutters',
            description: 'Install permanent storm shutters',
            category: 'FULL'
          },
          {
            mitigation_type_id: mitigationType.id,
            value: 'Apply protective film',
            description: 'Apply security window film',
            category: 'BRIDGE'
          }
        ])
        .select();
      if (!mitigationValues) throw new Error('Failed to create mitigation values');

      // Create a vulnerability
      const { data: vulnerability } = await supabaseAdmin
        .from('vulnerabilities')
        .insert({
          rule_id: uuidv4(),
          assessment_id: uuidv4(),
          property_id: property.id,
          mitigation_type_id: mitigationType.id
        })
        .select()
        .single();
      if (!vulnerability) throw new Error('Failed to create vulnerability');

      // Get mitigation options
      const options = await rulesEngine.getVulnerabilityMitigationOptions(vulnerability.id);

      expect(options).toHaveLength(1);
      expect(options[0].type).toEqual({
        id: mitigationType.id,
        name: 'Window Protection',
        description: 'Methods to protect windows',
        value_type: 'enum',
        multiple: false
      });
      expect(options[0].values).toHaveLength(2);
      expect(options[0].values[0]).toEqual({
        id: expect.any(String),
        description: 'Install permanent storm shutters',
        category: 'FULL'
      });
      expect(options[0].values[1]).toEqual({
        id: expect.any(String),
        description: 'Apply security window film',
        category: 'BRIDGE'
      });
    });

    it('should apply a mitigation to a vulnerability', async () => {
      // Create test property and vulnerability
      const { data: property } = await supabaseAdmin
        .from('properties')
        .insert({ name: 'Test Property' })
        .select()
        .single();
      if (!property) throw new Error('Failed to create property');

      const { data: vulnerability } = await supabaseAdmin
        .from('vulnerabilities')
        .insert({
          rule_id: uuidv4(),
          assessment_id: uuidv4(),
          property_id: property.id
        })
        .select()
        .single();
      if (!vulnerability) throw new Error('Failed to create vulnerability');

      // Apply mitigation
      const updatedVulnerability = await rulesEngine.applyMitigation(
        vulnerability.id,
        uuidv4(),
        'Installed storm shutters on all windows'
      );

      expect(updatedVulnerability.status).toBe('in_review');
      expect(updatedVulnerability.mitigation_description).toBe('Installed storm shutters on all windows');
    });
  });

  describe('Point-in-Time Assessment', () => {
    it('should evaluate rules at a specific point in time', async () => {
      // Create test property
      const { data: property } = await supabaseAdmin
        .from('properties')
        .insert({ name: 'Test Property' })
        .select()
        .single();
      if (!property) throw new Error('Failed to create property');

      // Create a rule with future effective date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const { data: rule } = await supabaseAdmin
        .from('rules')
        .insert({
          name: 'Future Rule',
          description: 'This rule becomes effective in the future',
          functional_rule: {
            join_operator: 'AND' as const,
            conditions: []
          },
          effective_from: futureDate.toISOString()
        })
        .select()
        .single();
      if (!rule) throw new Error('Failed to create rule');

      // Create assessment
      const assessment: PointInTimeAssessment = {
        id: uuidv4(),
        property_id: property.id,
        observations: [],
        evaluation_date: new Date().toISOString() // Current date
      };

      // Process assessment
      await rulesEngine.processAssessmentAtTime(assessment);

      // Verify no vulnerabilities were created (rule not yet effective)
      const { data: vulnerabilities } = await supabaseAdmin
        .from('vulnerabilities')
        .select()
        .eq('property_id', property.id);

      expect(vulnerabilities).toHaveLength(0);
    });

    it('should get vulnerability state at a specific point in time', async () => {
      // Create test property
      const { data: property } = await supabaseAdmin
        .from('properties')
        .insert({ name: 'Test Property' })
        .select()
        .single();
      if (!property) throw new Error('Failed to create property');

      // Create vulnerabilities at different times
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);

      await supabaseAdmin
        .from('vulnerabilities')
        .insert([
          {
            rule_id: uuidv4(),
            assessment_id: uuidv4(),
            property_id: property.id,
            detected_at: pastDate.toISOString()
          },
          {
            rule_id: uuidv4(),
            assessment_id: uuidv4(),
            property_id: property.id,
            detected_at: new Date().toISOString()
          }
        ]);

      // Get state at past date
      const state = await rulesEngine.getVulnerabilityStateAtTime(
        property.id,
        pastDate.toISOString()
      );

      expect(state.vulnerabilities).toHaveLength(1);
      const detectedAt = new Date(state.vulnerabilities[0].detected_at).getTime();
      const pastDateTime = pastDate.getTime();
      expect(detectedAt).toBeLessThanOrEqual(pastDateTime);
    });
  });
}); 