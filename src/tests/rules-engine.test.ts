import { supabaseAdmin } from '../config/supabase.js';
import { rulesEngine } from '../services/rules/rules-engine.js';
import { v4 as uuidv4 } from 'uuid';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TConditionGroup } from '../types/requests.js';

interface AssessmentObservation {
  observation_type_id: string;
  observation_value_id?: string;
  value?: string | number;
}

type Condition = {
  observation_type_id: string;
  value: string | number | boolean | string[] | number[] | boolean[];
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'GREATER_THAN_OR_EQUALS' | 'LESS_THAN_OR_EQUALS' | 'IN' | 'NOT_IN' | 'CONTAINS' | 'NOT_CONTAINS';
  value_type: 'ENUM' | 'NUMBER' | 'BOOLEAN' | 'DATE';
  observation_value_ids?: string[];
};

// Mock Supabase
jest.mock('../config/supabase.js');

describe('RulesEngine Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Underwriter User Stories', () => {
    it('should process observations and find vulnerabilities for a property', async () => {
      // Mock active rules
      (supabaseAdmin.from as jest.Mock).mockImplementation(() => ({
        select: () => ({
          data: [{
            id: 'rule-1',
            name: 'Test Rule',
            functional_rule: {
              join_operator: 'AND' as const,
              conditions: [{
                observation_type_id: 'window_type',
                observation_value_ids: ['single_pane'],
                value: 'single_pane',
                operator: 'EQUALS' as const,
                value_type: 'ENUM' as const
              }]
            }
          }]
        })
      }));

      const assessment = {
        id: 'assessment-1',
        property_id: 'property-1',
        observations: [{
          observation_type_id: 'window_type',
          observation_value_id: 'single_pane'
        }]
      };

      await rulesEngine.processAssessment(assessment);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('vulnerabilities');
    });

    it('should get mitigation options for a vulnerability', async () => {
      (supabaseAdmin.from as jest.Mock).mockImplementation(() => ({
        select: () => ({
          single: () => ({
            data: { mitigation_type_id: 'type-1' }
          })
        }),
        eq: () => ({
          single: () => ({
            data: { mitigation_type_id: 'type-1' }
          })
        })
      }));

      const options = await rulesEngine.getVulnerabilityMitigationOptions('vuln-1');
      expect(options).toBeDefined();
    });

    it('should process assessment at a specific point in time', async () => {
      const timestamp = '2024-03-18T12:00:00Z';
      
      (supabaseAdmin.from as jest.Mock).mockImplementation(() => ({
        select: () => ({
          lte: () => ({
            is: () => ({
              data: [{
                id: 'rule-1',
                functional_rule: {
                  join_operator: 'AND' as const,
                  conditions: [{
                    observation_type_id: 'window_type',
                    observation_value_ids: ['single_pane'],
                    value: 'single_pane',
                    operator: 'EQUALS' as const,
                    value_type: 'ENUM' as const
                  }]
                }
              }]
            })
          })
        })
      }));

      const assessment = {
        id: 'assessment-1',
        property_id: 123,
        observations: [],
        evaluation_date: timestamp
      };

      await rulesEngine.processAssessmentAtTime(assessment);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('rules');
    });

    it('should get human readable rule description', async () => {
      (supabaseAdmin.from as jest.Mock).mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: {
                id: 'rule-1',
                name: 'Test Rule',
                description: 'Test Description',
                functional_rule: {
                  join_operator: 'AND' as const,
                  conditions: [{
                    observation_type_id: 'window_type',
                    observation_value_ids: ['single_pane'],
                    value: 'single_pane',
                    operator: 'EQUALS' as const,
                    value_type: 'ENUM' as const
                  }]
                }
              }
            })
          })
        })
      }));

      const description = await rulesEngine.getHumanReadableRule('rule-1');
      expect(description).toContain('Test Rule');
      expect(description).toContain('Test Description');
    });
  });

  describe('Applied Science User Stories', () => {
    it('should create new rules with valid observation type and value UUIDs', async () => {
      // Create UUIDs for our types and values
      const windowTypeId = uuidv4();
      const distanceTypeId = uuidv4();
      const singlePaneId = uuidv4();

      // Mock the observation types lookup
      (supabaseAdmin.from as jest.Mock).mockImplementation((table) => {
        if (table === 'observation_types') {
          return {
            select: () => ({
              in: () => ({
                data: [
                  { id: windowTypeId, name: 'window_type', value_type: 'ENUM' },
                  { id: distanceTypeId, name: 'distance_to_coast', value_type: 'NUMBER' }
                ]
              })
            })
          };
        }
        if (table === 'observation_values') {
          return {
            select: () => ({
              in: () => ({
                data: [
                  { id: singlePaneId, observation_type_id: windowTypeId, value: 'single_pane' }
                ]
              })
            })
          };
        }
        if (table === 'rules') {
          return {
            insert: () => ({
              select: () => ({
                single: () => ({
                  data: {
                    id: 'rule-1',
                    name: 'Window Protection Rule',
                    description: 'Detects properties with inadequate window protection',
                    functional_rule: {
                      join_operator: 'AND' as const,
                      conditions: [
                        {
                          observation_type_id: windowTypeId,
                          observation_value_ids: [singlePaneId],
                          value: 'single_pane',
                          operator: 'EQUALS' as const,
                          value_type: 'ENUM' as const
                        },
                        {
                          observation_type_id: distanceTypeId,
                          value: 10,
                          operator: 'LESS_THAN' as const,
                          value_type: 'NUMBER' as const
                        }
                      ]
                    }
                  }
                })
              })
            })
          };
        }
        return {};
      });

      // First verify the observation types exist
      const observationTypes = await supabaseAdmin
        .from('observation_types')
        .select()
        .in('id', [windowTypeId, distanceTypeId]);
      
      expect(observationTypes.data).toHaveLength(2);
      
      // Then verify the observation values exist
      const observationValues = await supabaseAdmin
        .from('observation_values')
        .select()
        .in('id', [singlePaneId]);
      
      expect(observationValues.data).toHaveLength(1);

      // Now create the rule with valid UUIDs
      const newRule = {
        name: 'Window Protection Rule',
        description: 'Detects properties with inadequate window protection',
        functional_rule: {
          join_operator: 'AND' as const,
          conditions: [
            {
              observation_type_id: windowTypeId,
              observation_value_ids: [singlePaneId],
              value: 'single_pane',
              operator: 'EQUALS' as const,
              value_type: 'ENUM' as const
            },
            {
              observation_type_id: distanceTypeId,
              value: 10,
              operator: 'LESS_THAN' as const,
              value_type: 'NUMBER' as const
            }
          ]
        }
      };

      const result = await rulesEngine.createRule(newRule);
      expect(result).toHaveProperty('id', 'rule-1');

      // Verify the conditions have the correct UUIDs
      const conditions = result.functional_rule.conditions as Condition[];
      expect(conditions[0].observation_type_id).toBe(windowTypeId);
      expect(conditions[0].observation_value_ids![0]).toBe(singlePaneId);
      expect(conditions[1].observation_type_id).toBe(distanceTypeId);
    });

    it('should delete rules', async () => {
      (supabaseAdmin.from as jest.Mock).mockImplementation(() => ({
        delete: () => ({
          eq: () => ({
            error: null
          })
        })
      }));

      await expect(rulesEngine.deleteRule('rule-1')).resolves.not.toThrow();
    });

    it('should update existing rules', async () => {
      const updatedRule = {
        description: 'Updated Description',
        functional_rule: {
          join_operator: 'AND' as const,
          conditions: [{
            observation_type_id: 'window_type',
            observation_value_ids: ['single_pane'],
            value: 'single_pane',
            operator: 'EQUALS' as const,
            value_type: 'ENUM' as const
          }]
        }
      };

      (supabaseAdmin.from as jest.Mock).mockImplementation(() => ({
        select: () => ({
          eq: () => []
        }),
        update: () => ({
          eq: () => ({
            data: { ...updatedRule, id: 'rule-1' }
          })
        })
      }));

      const result = await rulesEngine.updateRule('rule-1', updatedRule);
      expect(result).toHaveProperty('vulnerabilitiesRemoved', 0);
    });

    it('should test rules against sample observations', async () => {
      const rule = {
        functional_rule: {
          join_operator: 'AND' as const,
          conditions: [{
            observation_type_id: 'window_type',
            observation_value_ids: ['single_pane'],
            value: 'single_pane',
            operator: 'EQUALS' as const,
            value_type: 'ENUM' as const
          }]
        }
      };

      const testCases = [{
        observations: [{
          observation_type_id: 'window_type',
          observation_value_id: 'single_pane'
        }]
      }];

      const results = await rulesEngine.testRule(rule, testCases);
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('triggered');
    });
  });
});

describe('Underwriter User Tests', () => {
  beforeEach(async () => {
    // Clean up existing data
    await supabaseAdmin.from('vulnerabilities').delete().neq('id', 0);
    await supabaseAdmin.from('rules').delete().neq('id', 0);
    await supabaseAdmin.from('observation_values').delete().neq('id', 0);
    await supabaseAdmin.from('observation_types').delete().neq('id', 0);
    await supabaseAdmin.from('properties').delete().neq('id', 0);
  });

  it('should find all vulnerabilities for a given property', async () => {
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

    // Create observation value
    const { data: singlePane } = await supabaseAdmin
      .from('observation_values')
      .insert({ observation_type_id: windowType.id, value: 'single-pane' })
      .select()
      .single();
    if (!singlePane) throw new Error('Failed to create single pane value');

    // Create rule
    const { data: rule } = await supabaseAdmin
      .from('rules')
      .insert({
        name: 'Single Pane Window Rule',
        description: 'Identifies properties with single-pane windows',
        functional_rule: {
          join_operator: 'AND' as const,
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

    // Create assessment with single-pane window observation
    const createdObservations = [{
      observation_type_id: windowType.id,
      observation_value_id: singlePane.id,
      value: 'single-pane'
    }];

    const assessment = {
      id: uuidv4(),
      property_id: property.id,
      observations: createdObservations
    };

    await rulesEngine.processAssessment(assessment);

    // Verify vulnerability was created
    const { data: vulnerabilities } = await supabaseAdmin
      .from('vulnerabilities')
      .select()
      .eq('property_id', property.id);

    expect(vulnerabilities).toHaveLength(1);
    expect(vulnerabilities![0].rule_id).toBe(rule.id);
  });
});

describe('Applied Science User Tests', () => {
  beforeEach(async () => {
    // Clean up existing data
    await supabaseAdmin.from('vulnerabilities').delete().neq('id', 0);
    await supabaseAdmin.from('rules').delete().neq('id', 0);
    await supabaseAdmin.from('observation_values').delete().neq('id', 0);
    await supabaseAdmin.from('observation_types').delete().neq('id', 0);
    await supabaseAdmin.from('properties').delete().neq('id', 0);
  });

  it('should add new rules to the database', async () => {
    const { data: windowType } = await supabaseAdmin
      .from('observation_types')
      .insert({ name: 'Window Type', value_type: 'string' })
      .select()
      .single();
    if (!windowType) throw new Error('Failed to create window type');

    const { data: singlePane } = await supabaseAdmin
      .from('observation_values')
      .insert({ observation_type_id: windowType.id, value: 'single-pane' })
      .select()
      .single();
    if (!singlePane) throw new Error('Failed to create single pane value');

    const { data: rule } = await supabaseAdmin
      .from('rules')
      .insert({
        name: 'New Rule',
        description: 'A new rule for testing',
        functional_rule: {
          join_operator: 'AND' as const,
          conditions: [{
            observation_type_id: windowType.id,
            observation_value_ids: [singlePane.id],
            operator: 'EQUALS'
          }]
        }
      })
      .select()
      .single();
    
    expect(rule).toBeDefined();
    expect(rule!.name).toBe('New Rule');
  });

  it('should delete rules from the database', async () => {
    const { data: windowType } = await supabaseAdmin
      .from('observation_types')
      .insert({ name: 'Window Type', value_type: 'string' })
      .select()
      .single();
    if (!windowType) throw new Error('Failed to create window type');

    const { data: rule } = await supabaseAdmin
      .from('rules')
      .insert({
        name: 'Rule to Delete',
        description: 'This rule will be deleted',
        functional_rule: {
          join_operator: 'AND' as const,
          conditions: []
        }
      })
      .select()
      .single();
    if (!rule) throw new Error('Failed to create rule');

    await supabaseAdmin.from('rules').delete().eq('id', rule.id);
    const { data: deletedRule } = await supabaseAdmin.from('rules').select().eq('id', rule.id);
    expect(deletedRule).toHaveLength(0);
  });

  it('should update existing rules in the database', async () => {
    const { data: windowType } = await supabaseAdmin
      .from('observation_types')
      .insert({ name: 'Window Type', value_type: 'string' })
      .select()
      .single();
    if (!windowType) throw new Error('Failed to create window type');

    const { data: rule } = await supabaseAdmin
      .from('rules')
      .insert({
        name: 'Rule to Update',
        description: 'This rule will be updated',
        functional_rule: {
          join_operator: 'AND' as const,
          conditions: []
        }
      })
      .select()
      .single();
    if (!rule) throw new Error('Failed to create rule');

    const { data: updatedRule } = await supabaseAdmin
      .from('rules')
      .update({ name: 'Updated Rule' })
      .eq('id', rule.id)
      .select()
      .single();
    
    expect(updatedRule).toBeDefined();
    expect(updatedRule!.name).toBe('Updated Rule');
  });

  it('should easily test new rules to validate correctness', async () => {
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

    // Create observation value
    const { data: singlePane } = await supabaseAdmin
      .from('observation_values')
      .insert({ observation_type_id: windowType.id, value: 'single-pane' })
      .select()
      .single();
    if (!singlePane) throw new Error('Failed to create single pane value');

    // Create rule
    const { data: rule } = await supabaseAdmin
      .from('rules')
      .insert({
        name: 'Test Rule',
        description: 'This rule will be tested',
        functional_rule: {
          join_operator: 'AND' as const,
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

    // Create assessment with matching observation
    const createdObservations = [{
      observation_type_id: windowType.id,
      observation_value_id: singlePane.id,
      value: 'single-pane'
    }];

    const assessment = {
      id: uuidv4(),
      property_id: property.id,
      observations: createdObservations
    };

    await rulesEngine.processAssessment(assessment);

    // Verify vulnerability was created
    const { data: vulnerabilities } = await supabaseAdmin
      .from('vulnerabilities')
      .select()
      .eq('rule_id', rule.id);

    expect(vulnerabilities).toHaveLength(1);
  });
}); 