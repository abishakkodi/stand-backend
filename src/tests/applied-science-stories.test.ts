import { supabaseAdmin } from '../config/supabase.js';
import { rulesEngine } from '../services/rules-engine.js';
import { v4 as uuidv4 } from 'uuid';

describe('Applied Science User Stories', () => {
  beforeEach(async () => {
    // Clean up existing data
    await supabaseAdmin.from('vulnerabilities').delete().neq('id', 0);
    await supabaseAdmin.from('rules').delete().neq('id', 0);
    await supabaseAdmin.from('observation_values').delete().neq('id', 0);
    await supabaseAdmin.from('observation_types').delete().neq('id', 0);
    await supabaseAdmin.from('properties').delete().neq('id', 0);
  });

  describe('Rule Management', () => {
    it('should add new rules to the database', async () => {
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

      // Create new rule
      const newRule = {
        name: 'Single Pane Window Rule',
        description: 'Identifies properties with single-pane windows',
        functional_rule: {
          join_operator: 'AND',
          conditions: [{
            observation_type_id: windowType.id,
            observation_value_ids: [singlePane.id],
            operator: 'EQUALS'
          }]
        }
      };

      const { data: rule } = await rulesEngine.createRule(newRule);
      expect(rule).toBeDefined();
      expect(rule.name).toBe(newRule.name);
      expect(rule.functional_rule).toEqual(newRule.functional_rule);

      // Verify rule exists in database
      const { data: savedRule } = await supabaseAdmin
        .from('rules')
        .select()
        .eq('id', rule.id)
        .single();
      
      expect(savedRule).toBeDefined();
      expect(savedRule?.name).toBe(newRule.name);
    });

    it('should update existing rules in the database', async () => {
      // Create initial rule
      const { data: rule } = await supabaseAdmin
        .from('rules')
        .insert({
          name: 'Old Rule Name',
          description: 'Old description',
          functional_rule: {
            join_operator: 'AND',
            conditions: []
          }
        })
        .select()
        .single();
      if (!rule) throw new Error('Failed to create rule');

      // Update rule
      const updates = {
        name: 'Updated Rule Name',
        description: 'Updated description'
      };

      const updatedRule = await rulesEngine.updateRule(rule.id, updates);
      expect(updatedRule.name).toBe(updates.name);
      expect(updatedRule.description).toBe(updates.description);

      // Verify changes in database
      const { data: savedRule } = await supabaseAdmin
        .from('rules')
        .select()
        .eq('id', rule.id)
        .single();
      
      expect(savedRule?.name).toBe(updates.name);
      expect(savedRule?.description).toBe(updates.description);
    });

    it('should delete rules from the database', async () => {
      // Create rule to delete
      const { data: rule } = await supabaseAdmin
        .from('rules')
        .insert({
          name: 'Rule to Delete',
          description: 'This rule will be deleted',
          functional_rule: {
            join_operator: 'AND',
            conditions: []
          }
        })
        .select()
        .single();
      if (!rule) throw new Error('Failed to create rule');

      // Delete rule
      await rulesEngine.deleteRule(rule.id);

      // Verify rule no longer exists
      const { data: deletedRule } = await supabaseAdmin
        .from('rules')
        .select()
        .eq('id', rule.id)
        .single();
      
      expect(deletedRule).toBeNull();
    });
  });

  describe('Rule Testing', () => {
    it('should validate new rules against test cases', async () => {
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

      // Create rule to test
      const newRule = {
        name: 'Complex Safety Rule',
        description: 'Tests multiple conditions',
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
      };

      // Test cases that should trigger the rule
      const positiveTestCase = {
        observations: [
          {
            observation_type_id: windowType.id,
            observation_value_id: singlePane.id
          },
          {
            observation_type_id: distanceType.id,
            value: 20
          }
        ]
      };

      // Test cases that should not trigger the rule
      const negativeTestCase = {
        observations: [
          {
            observation_type_id: windowType.id,
            observation_value_id: singlePane.id
          },
          {
            observation_type_id: distanceType.id,
            value: 40
          }
        ]
      };

      const testResults = await rulesEngine.testRule(newRule, [
        positiveTestCase,
        negativeTestCase
      ]);

      expect(testResults).toEqual([
        { case: positiveTestCase, triggered: true },
        { case: negativeTestCase, triggered: false }
      ]);
    });

    it('should validate rule updates against existing vulnerabilities', async () => {
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

      // Create initial rule
      const { data: rule } = await supabaseAdmin
        .from('rules')
        .insert({
          name: 'Window Rule',
          description: 'Original rule',
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

      // Create assessment that triggers the rule
      const observations = [{
        id: uuidv4(),
        observation_type_id: windowType.id,
        observation_value_id: singlePane.id
      }];

      await rulesEngine.processAssessment({
        id: uuidv4(),
        property_id: property.id,
        observations
      });

      // Verify initial vulnerability
      const { data: initialVulns } = await supabaseAdmin
        .from('vulnerabilities')
        .select()
        .eq('rule_id', rule.id);
      expect(initialVulns).toHaveLength(1);

      // Update rule to be more restrictive
      const updatedRule = {
        ...rule,
        functional_rule: {
          join_operator: 'AND',
          conditions: [
            {
              observation_type_id: windowType.id,
              observation_value_ids: [singlePane.id],
              operator: 'EQUALS'
            },
            {
              observation_type_id: windowType.id,
              operator: 'LESS_THAN',
              value: 30
            }
          ]
        }
      };

      // Test impact of rule change
      const impact = await rulesEngine.testRuleUpdate(rule.id, updatedRule);
      expect(impact.vulnerabilities_affected).toBe(1);
      expect(impact.vulnerabilities_removed).toBe(1);
    });
  });
}); 