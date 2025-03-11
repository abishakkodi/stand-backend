import { supabaseAdmin } from '../config/supabase.js';
import { rulesEngine } from '../services/rules-engine.js';
import { v4 as uuidv4 } from 'uuid';

describe('Underwriter User Stories', () => {
  beforeEach(async () => {
    // Clean up existing data
    await supabaseAdmin.from('vulnerabilities').delete().neq('id', 0);
    await supabaseAdmin.from('rules').delete().neq('id', 0);
    await supabaseAdmin.from('observation_values').delete().neq('id', 0);
    await supabaseAdmin.from('observation_types').delete().neq('id', 0);
    await supabaseAdmin.from('properties').delete().neq('id', 0);
    await supabaseAdmin.from('mitigations').delete().neq('id', 0);
  });

  describe('Property Vulnerability Assessment', () => {
    it('should find all vulnerabilities for a given property', async () => {
      // Create test property
      const { data: property } = await supabaseAdmin
        .from('properties')
        .insert({ name: 'Test Property' })
        .select()
        .single();
      if (!property) throw new Error('Failed to create property');

      // Create window type observation
      const { data: windowType } = await supabaseAdmin
        .from('observation_types')
        .insert({ name: 'Window Type', value_type: 'string' })
        .select()
        .single();
      if (!windowType) throw new Error('Failed to create window type');

      // Create distance type observation
      const { data: distanceType } = await supabaseAdmin
        .from('observation_types')
        .insert({ name: 'Distance', value_type: 'number' })
        .select()
        .single();
      if (!distanceType) throw new Error('Failed to create distance type');

      // Create window values
      const { data: singlePane } = await supabaseAdmin
        .from('observation_values')
        .insert({ observation_type_id: windowType.id, value: 'single-pane' })
        .select()
        .single();
      if (!singlePane) throw new Error('Failed to create single pane value');

      // Create multiple rules
      const rules = await supabaseAdmin
        .from('rules')
        .insert([
          {
            name: 'Single Pane Window Present',
            description: 'Check if single pane windows exist',
            functional_rule: {
              join_operator: 'AND',
              conditions: [{
                observation_type_id: windowType.id,
                observation_value_ids: [singlePane.id],
                operator: 'EQUALS'
              }]
            }
          },
          {
            name: 'Window Distance Check',
            description: 'Check if windows are at safe distance',
            functional_rule: {
              join_operator: 'AND',
              conditions: [{
                observation_type_id: distanceType.id,
                operator: 'LESS_THAN',
                value: 30
              }]
            }
          }
        ])
        .select();
      if (!rules.data) throw new Error('Failed to create rules');

      // Create assessment with observations that trigger both rules
      const observations = [
        {
          id: uuidv4(),
          observation_type_id: windowType.id,
          observation_value_id: singlePane.id
        },
        {
          id: uuidv4(),
          observation_type_id: distanceType.id,
          observation_value_id: null,
          value: 20
        }
      ];

      await rulesEngine.processAssessment({
        id: uuidv4(),
        property_id: property.id,
        observations
      });

      // Verify vulnerabilities were created
      const { data: vulnerabilities } = await supabaseAdmin
        .from('vulnerabilities')
        .select('*, rules(*)')
        .eq('property_id', property.id);

      expect(vulnerabilities).toHaveLength(2);
      expect(vulnerabilities?.map(v => v.rules.name).sort()).toEqual([
        'Single Pane Window Present',
        'Window Distance Check'
      ].sort());
    });
  });

  describe('Vulnerability Mitigation', () => {
    it('should show available mitigations for a vulnerability', async () => {
      // Create test property and rule
      const { data: property } = await supabaseAdmin
        .from('properties')
        .insert({ name: 'Test Property' })
        .select()
        .single();
      if (!property) throw new Error('Failed to create property');

      const { data: rule } = await supabaseAdmin
        .from('rules')
        .insert({
          name: 'Single Pane Window Present',
          description: 'Check if single pane windows exist'
        })
        .select()
        .single();
      if (!rule) throw new Error('Failed to create rule');

      // Create vulnerability
      const { data: vulnerability } = await supabaseAdmin
        .from('vulnerabilities')
        .insert({
          rule_id: rule.id,
          property_id: property.id,
          assessment_id: uuidv4(),
          status: 'open'
        })
        .select()
        .single();
      if (!vulnerability) throw new Error('Failed to create vulnerability');

      // Create mitigations
      const mitigations = await supabaseAdmin
        .from('mitigations')
        .insert([
          {
            rule_id: rule.id,
            name: 'Replace Windows',
            description: 'Replace single-pane windows with double-pane windows',
            estimated_cost: 5000
          },
          {
            rule_id: rule.id,
            name: 'Install Storm Windows',
            description: 'Install storm windows over existing single-pane windows',
            estimated_cost: 2000
          }
        ])
        .select();
      if (!mitigations.data) throw new Error('Failed to create mitigations');

      // Get mitigations for vulnerability
      const { data: availableMitigations } = await supabaseAdmin
        .from('mitigations')
        .select()
        .eq('rule_id', vulnerability.rule_id);

      expect(availableMitigations).toHaveLength(2);
      expect(availableMitigations?.map(m => m.name).sort()).toEqual([
        'Replace Windows',
        'Install Storm Windows'
      ].sort());
    });
  });

  describe('Time-based Rule Evaluation', () => {
    it('should evaluate rules based on their effective date', async () => {
      // Create test property
      const { data: property } = await supabaseAdmin
        .from('properties')
        .insert({ name: 'Test Property' })
        .select()
        .single();
      if (!property) throw new Error('Failed to create property');

      // Create observation type
      const { data: windowType } = await supabaseAdmin
        .from('observation_types')
        .insert({ name: 'Window Type', value_type: 'string' })
        .select()
        .single();
      if (!windowType) throw new Error('Failed to create window type');

      // Create window value
      const { data: singlePane } = await supabaseAdmin
        .from('observation_values')
        .insert({ observation_type_id: windowType.id, value: 'single-pane' })
        .select()
        .single();
      if (!singlePane) throw new Error('Failed to create single pane value');

      // Create rule with future effective date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const { data: rule } = await supabaseAdmin
        .from('rules')
        .insert({
          name: 'Future Single Pane Rule',
          description: 'This rule should not be active yet',
          effective_from: futureDate.toISOString(),
          functional_rule: {
            join_operator: 'AND',
            conditions: [{
              observation_type_id: windowType.id,
              observation_value_ids: [singlePane.id],
              operator: 'EQUALS'
            }]
          }
        })
        .select()
        .single();
      if (!rule) throw new Error('Failed to create rule');

      // Create assessment
      const observations = [{
        id: uuidv4(),
        observation_type_id: windowType.id,
        observation_value_id: singlePane.id
      }];

      await rulesEngine.processAssessment({
        id: uuidv4(),
        property_id: property.id,
        observations,
        evaluation_date: new Date().toISOString()
      });

      // Verify no vulnerabilities were created (rule not yet effective)
      const { data: currentVulnerabilities } = await supabaseAdmin
        .from('vulnerabilities')
        .select()
        .eq('property_id', property.id);

      expect(currentVulnerabilities).toHaveLength(0);

      // Process assessment with future date
      await rulesEngine.processAssessment({
        id: uuidv4(),
        property_id: property.id,
        observations,
        evaluation_date: futureDate.toISOString()
      });

      // Verify vulnerability was created (rule is effective)
      const { data: futureVulnerabilities } = await supabaseAdmin
        .from('vulnerabilities')
        .select()
        .eq('property_id', property.id);

      expect(futureVulnerabilities).toHaveLength(1);
    });
  });

  describe('Human Readable Rules', () => {
    it('should provide human-readable format for rules', async () => {
      // Create observation types
      const { data: windowType } = await supabaseAdmin
        .from('observation_types')
        .insert({ name: 'Window Type', value_type: 'string' })
        .select()
        .single();
      if (!windowType) throw new Error('Failed to create window type');

      const { data: distanceType } = await supabaseAdmin
        .from('observation_types')
        .insert({ name: 'Distance', value_type: 'number' })
        .select()
        .single();
      if (!distanceType) throw new Error('Failed to create distance type');

      // Create window value
      const { data: singlePane } = await supabaseAdmin
        .from('observation_values')
        .insert({ observation_type_id: windowType.id, value: 'single-pane' })
        .select()
        .single();
      if (!singlePane) throw new Error('Failed to create single pane value');

      // Create complex rule
      const { data: rule } = await supabaseAdmin
        .from('rules')
        .insert({
          name: 'Complex Window Safety Rule',
          description: 'Check window type and distance requirements',
          functional_rule: {
            join_operator: 'AND',
            conditions: [
              {
                observation_type_id: windowType.id,
                observation_value_ids: [singlePane.id],
                operator: 'EQUALS'
              },
              {
                observation_type_id: distanceType.id,
                operator: 'LESS_THAN',
                value: 30
              }
            ]
          }
        })
        .select()
        .single();
      if (!rule) throw new Error('Failed to create rule');

      const humanReadable = await rulesEngine.getHumanReadableRule(rule.id);

      expect(humanReadable).toEqual({
        name: 'Complex Window Safety Rule',
        description: 'Check window type and distance requirements',
        conditions: 'Property has single-pane windows AND distance is less than 30 feet',
        effective_period: 'Currently active'
      });
    });
  });
}); 