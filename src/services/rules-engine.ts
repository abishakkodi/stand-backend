import { supabaseAdmin } from '../config/supabase.js';
import { TLeafCondition, TConditionGroup } from '../types/requests.js';
import { MitigationOption, MitigationType, MitigationValue } from './rules/types.js';

interface Observation {
  observation_type_id: string;
  observation_value_id?: string;
  value?: number | string;
}

interface Assessment {
  observations: Observation[];
}

interface Vulnerability {
  id: string;
  rule_id: string;
  assessment_id: string;
  property_id: number;
  status: 'open' | 'in_review' | 'resolved';
  detected_at: string;
  mitigation_type_id?: string;
  mitigation_value_id?: string;
  mitigation_description?: string;
  created_at: string;
  updated_at: string;
}

interface ObservationType {
  name: string;
}

interface ObservationValue {
  value: string;
}

interface RuleWithDetails {
  id: string;
  name: string;
  description: string;
  functional_rule: TConditionGroup;
  conditions?: Array<{
    observation_type: ObservationType;
    observation_values?: ObservationValue[];
  }>;
}

export interface PointInTimeAssessment {
  id: string;
  property_id: number;
  observations: AssessmentObservation[];
  evaluation_date: string;
}

interface VulnerabilityState {
  vulnerabilities: Vulnerability[];
  timestamp: string;
}

interface AssessmentObservation {
  id: string;
  observation_type_id: string;
  observation_value_id: string;
  assessment_id: string;
  created_at: string;
}

interface Rule {
  id: string;
  name: string;
  description: string;
  functional_rule: TConditionGroup;
  effective_from?: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
}

export class RulesEngine {
  async createRule(rule: {
    name: string;
    description: string;
    functional_rule: TConditionGroup;
  }) {
    return await supabaseAdmin.from('rules').insert(rule).select().single();
  }

  async updateRule(ruleId: string, updatedRule: Partial<Rule>): Promise<{ vulnerabilitiesRemoved: number }> {
    const { data: vulnerabilities } = await supabaseAdmin
      .from('vulnerabilities')
      .select()
      .eq('rule_id', ruleId);

    if (!vulnerabilities) {
      return { vulnerabilitiesRemoved: 0 };
    }

    let vulnerabilitiesRemoved = 0;

    // Test each vulnerability's observations against the updated rule
    for (const vulnerability of vulnerabilities) {
      const observations = await this.getVulnerabilityObservations(vulnerability);
      if (!observations.length) continue;
      
      const stillTriggered = this.evaluateConditions(
        updatedRule.functional_rule!,
        observations
      );

      if (!stillTriggered) {
        await supabaseAdmin
          .from('vulnerabilities')
          .delete()
          .eq('id', vulnerability.id);
        vulnerabilitiesRemoved++;
      }
    }

    // Update the rule
    await supabaseAdmin
      .from('rules')
      .update(updatedRule)
      .eq('id', ruleId);

    return { vulnerabilitiesRemoved };
  }

  async deleteRule(ruleId: string) {
    await supabaseAdmin.from('rules').delete().eq('id', ruleId);
  }

  async testRule(rule: {
    functional_rule: TConditionGroup;
  }, testCases: Array<{
    observations: Array<{
      observation_type_id: string;
      observation_value_id?: string;
      value?: number | string;
    }>;
  }>) {
    return testCases.map(testCase => ({
      case: testCase,
      triggered: this.evaluateConditions(rule.functional_rule, testCase.observations)
    }));
  }

  async testRuleUpdate(ruleId: string, updatedRule: {
    functional_rule: TConditionGroup;
  }): Promise<{ vulnerabilities_affected: number; vulnerabilities_removed: number }> {
    // Get all vulnerabilities for this rule
    const { data: vulnerabilities } = await supabaseAdmin
      .from('vulnerabilities')
      .select()
      .eq('rule_id', ruleId);

    if (!vulnerabilities) {
      return { vulnerabilities_affected: 0, vulnerabilities_removed: 0 };
    }

    let vulnerabilitiesRemoved = 0;

    // Test each vulnerability's observations against the updated rule
    for (const vulnerability of vulnerabilities) {
      const observations = await this.getVulnerabilityObservations(vulnerability);
      if (!observations.length) continue;

      const stillTriggered = this.evaluateConditions(
        updatedRule.functional_rule,
        observations
      );

      if (!stillTriggered) {
        vulnerabilitiesRemoved++;
      }
    }

    return {
      vulnerabilities_affected: vulnerabilities.length,
      vulnerabilities_removed: vulnerabilitiesRemoved
    };
  }

  async processAssessment(assessment: {
    id: string;
    property_id: string;
    observations: Array<{
      observation_type_id: string;
      observation_value_id?: string;
      value?: number | string;
    }>;
  }) {
    // Get all active rules
    const { data: rules } = await supabaseAdmin
      .from('rules')
      .select('*');

    console.log('Retrieved rules:', rules);

    if (!rules) return;

    // Test each rule against the observations
    const triggeredRules = rules.filter(rule => {
      const result = this.evaluateConditions(rule.functional_rule, assessment.observations);
      console.log('Rule evaluation:', {
        ruleId: rule.id,
        ruleName: rule.name,
        observations: assessment.observations,
        result
      });
      return result;
    });

    console.log('Triggered rules:', triggeredRules);

    // Create vulnerabilities for triggered rules
    const vulnerabilities = triggeredRules.map(rule => ({
      rule_id: rule.id,
      assessment_id: assessment.id,
      property_id: assessment.property_id
    }));

    console.log('Creating vulnerabilities:', vulnerabilities);

    if (vulnerabilities.length > 0) {
      const { data, error } = await supabaseAdmin.from('vulnerabilities').insert(vulnerabilities);
      if (error) {
        console.error('Error creating vulnerabilities:', error);
      } else {
        console.log('Created vulnerabilities:', data);
      }
    }
  }

  private evaluateConditions(
    conditionGroup: TConditionGroup,
    observations: Array<{
      observation_type_id: string;
      observation_value_id?: string;
      value?: number | string;
    }>
  ): boolean {
    // If there are no conditions, the rule should not be triggered
    if (conditionGroup.conditions.length === 0) {
      return false;
    }

    const evaluateLeafCondition = (condition: TLeafCondition) => {
      const observation = observations.find(
        obs => obs.observation_type_id === condition.observation_type_id
      );

      if (!observation) return false;

      if (condition.observation_value_ids) {
        return condition.observation_value_ids.includes(observation.observation_value_id || '');
      }

      if (condition.value !== undefined && observation.value !== undefined) {
        switch (condition.operator) {
          case 'EQUALS':
            return observation.value === condition.value;
          case 'NOT_EQUALS':
            return observation.value !== condition.value;
          case 'GREATER_THAN':
            return Number(observation.value) > Number(condition.value);
          case 'LESS_THAN':
            return Number(observation.value) < Number(condition.value);
          case 'GREATER_THAN_OR_EQUALS':
            return Number(observation.value) >= Number(condition.value);
          case 'LESS_THAN_OR_EQUALS':
            return Number(observation.value) <= Number(condition.value);
          case 'CONTAINS':
            return observation.value.toString().includes(condition.value.toString());
          case 'NOT_CONTAINS':
            return !observation.value.toString().includes(condition.value.toString());
          case 'IN':
            return condition.value.toString().split(',').includes(observation.value.toString());
          case 'NOT_IN':
            return !condition.value.toString().split(',').includes(observation.value.toString());
          default:
            return false;
        }
      }

      return false;
    };

    const evaluateGroup = (group: TConditionGroup): boolean => {
      // If there are no conditions in this group, it should not be triggered
      if (group.conditions.length === 0) {
        return false;
      }

      const results = group.conditions.map(condition => {
        if ('conditions' in condition) {
          return evaluateGroup(condition);
        }
        return evaluateLeafCondition(condition);
      });

      return group.join_operator === 'AND'
        ? results.every(result => result)
        : results.some(result => result);
    };

    return evaluateGroup(conditionGroup);
  }

  async getHumanReadableRule(ruleId: string): Promise<string> {
    const { data: rule } = await supabaseAdmin
      .from('rules')
      .select(`
        id,
        name,
        description,
        functional_rule
      `)
      .eq('id', ruleId)
      .single() as { data: RuleWithDetails | null };

    if (!rule) throw new Error('Rule not found');

    const formatCondition = async (condition: TLeafCondition) => {
      // Get observation type name
      const { data: obsType } = await supabaseAdmin
        .from('observation_types')
        .select('name')
        .eq('id', condition.observation_type_id)
        .single();
      
      const typeName = obsType?.name || condition.observation_type_id;

      if (condition.observation_value_ids) {
        // Get observation values
        const { data: obsValues } = await supabaseAdmin
          .from('observation_values')
          .select('value')
          .in('id', condition.observation_value_ids);
        
        const values = obsValues?.map(v => v.value).join(' or ') || 
          condition.observation_value_ids.join(' or ');
        
        return `${typeName} is ${values}`;
      }

      if (condition.value !== undefined) {
        const operatorText = {
          'EQUALS': 'equals',
          'NOT_EQUALS': 'does not equal',
          'GREATER_THAN': 'is greater than',
          'LESS_THAN': 'is less than',
          'GREATER_THAN_OR_EQUALS': 'is greater than or equal to',
          'LESS_THAN_OR_EQUALS': 'is less than or equal to',
          'CONTAINS': 'contains',
          'NOT_CONTAINS': 'does not contain',
          'IN': 'is in',
          'NOT_IN': 'is not in'
        }[condition.operator || 'EQUALS'];

        return `${typeName} ${operatorText} ${condition.value}`;
      }

      return '';
    };

    const formatGroup = async (group: TConditionGroup): Promise<string> => {
      const conditions = await Promise.all(group.conditions.map(async condition => {
        if ('conditions' in condition) {
          return `(${await formatGroup(condition)})`;
        }
        return formatCondition(condition);
      }));

      return conditions.join(` ${group.join_operator.toLowerCase()} `);
    };

    const conditions = await formatGroup(rule.functional_rule);
    return `Rule: ${rule.name}\nDescription: ${rule.description}\nConditions: ${conditions}`;
  }

  async updateVulnerabilityStatus(vulnerabilityId: string, status: 'open' | 'in_review' | 'resolved', notes?: string) {
    const { data, error } = await supabaseAdmin
      .from('vulnerabilities')
      .update({
        status,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', vulnerabilityId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update vulnerability status: ${error.message}`);
    }

    return data;
  }

  async getVulnerabilityMitigationOptions(vulnerabilityId: string): Promise<MitigationOption[]> {
    const { data: vulnerability } = await supabaseAdmin
      .from('vulnerabilities')
      .select('mitigation_type_id')
      .eq('id', vulnerabilityId)
      .single();

    if (!vulnerability?.mitigation_type_id) {
      return [];
    }

    // First get the mitigation type
    const { data: mitigationType } = await supabaseAdmin
      .from('mitigation_types')
      .select('*')
      .eq('id', vulnerability.mitigation_type_id)
      .single();

    if (!mitigationType) {
      return [];
    }

    // Then get the mitigation values
    const { data: mitigationValues } = await supabaseAdmin
      .from('mitigation_values')
      .select('id, description, category')
      .eq('mitigation_type_id', vulnerability.mitigation_type_id);

    if (!mitigationValues) {
      return [];
    }

    // Format the response
    return [{
      id: mitigationType.id,
      type: {
        id: mitigationType.id,
        name: mitigationType.name,
        description: mitigationType.description,
        value_type: mitigationType.value_type,
        multiple: mitigationType.multiple
      },
      values: mitigationValues.map(value => ({
        id: value.id,
        description: value.description,
        category: value.category
      }))
    }];
  }

  async applyMitigation(
    vulnerabilityId: string,
    mitigationValueId: string,
    description: string
  ): Promise<Vulnerability> {
    const { data: vulnerability } = await supabaseAdmin
      .from('vulnerabilities')
      .update({
        status: 'in_review',
        mitigation_value_id: mitigationValueId,
        mitigation_description: description,
        updated_at: new Date().toISOString()
      })
      .eq('id', vulnerabilityId)
      .select()
      .single();

    if (!vulnerability) {
      throw new Error('Failed to update vulnerability');
    }

    return vulnerability;
  }

  async processAssessmentAtTime(assessment: PointInTimeAssessment): Promise<void> {
    const { data: activeRules } = await supabaseAdmin
      .from('rules')
      .select()
      .lte('effective_from', assessment.evaluation_date)
      .is('effective_to', null);

    if (!activeRules) {
      return;
    }

    for (const rule of activeRules) {
      if (this.evaluateConditions(rule.functional_rule, assessment.observations)) {
        await this.createVulnerability(rule.id, assessment.id, assessment.property_id);
      }
    }
  }

  async getVulnerabilityStateAtTime(propertyId: number, timestamp: string): Promise<VulnerabilityState> {
    const { data: vulnerabilities } = await supabaseAdmin
      .from('vulnerabilities')
      .select()
      .eq('property_id', propertyId)
      .lte('detected_at', timestamp);

    return {
      vulnerabilities: vulnerabilities || [],
      timestamp
    };
  }

  private async createVulnerability(ruleId: string, assessmentId: string, propertyId: number): Promise<void> {
    const { error } = await supabaseAdmin
      .from('vulnerabilities')
      .insert({
        rule_id: ruleId,
        assessment_id: assessmentId,
        property_id: propertyId,
        status: 'open',
        detected_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to create vulnerability: ${error.message}`);
    }
  }

  async getVulnerabilityObservations(vulnerability: Vulnerability): Promise<AssessmentObservation[]> {
    const { data: assessment } = await supabaseAdmin
      .from('assessments')
      .select('observations')
      .eq('id', vulnerability.assessment_id)
      .single();

    return assessment?.observations || [];
  }

  async evaluateVulnerability(vulnerability: Vulnerability): Promise<boolean> {
    const { data: rule } = await supabaseAdmin
      .from('rules')
      .select()
      .eq('id', vulnerability.rule_id)
      .single();

    if (!rule) {
      return false;
    }

    const observations = await this.getVulnerabilityObservations(vulnerability);
    return this.evaluateConditions(rule.functional_rule, observations);
  }

  async evaluateVulnerabilities(propertyId: number): Promise<void> {
    const { data: vulnerabilities } = await supabaseAdmin
      .from('vulnerabilities')
      .select()
      .eq('property_id', propertyId);

    if (!vulnerabilities) {
      return;
    }

    for (const vulnerability of vulnerabilities) {
      const observations = await this.getVulnerabilityObservations(vulnerability);
      const { data: rule } = await supabaseAdmin
        .from('rules')
        .select()
        .eq('id', vulnerability.rule_id)
        .single();

      if (!rule) {
        continue;
      }

      if (!this.evaluateConditions(rule.functional_rule, observations)) {
        await supabaseAdmin
          .from('vulnerabilities')
          .delete()
          .eq('id', vulnerability.id);
      }
    }
  }

  async evaluateRuleChange(ruleId: string, updatedRule: TConditionGroup): Promise<{ vulnerabilitiesRemoved: number }> {
    const { data: vulnerabilities } = await supabaseAdmin
      .from('vulnerabilities')
      .select()
      .eq('rule_id', ruleId);

    if (!vulnerabilities) {
      return { vulnerabilitiesRemoved: 0 };
    }

    let vulnerabilitiesRemoved = 0;

    // Test each vulnerability's observations against the updated rule
    for (const vulnerability of vulnerabilities) {
      const observations = await this.getVulnerabilityObservations(vulnerability);
      if (!observations.length) continue;

      const stillTriggered = this.evaluateConditions(updatedRule, observations);

      if (!stillTriggered) {
        await supabaseAdmin
          .from('vulnerabilities')
          .delete()
          .eq('id', vulnerability.id);
        vulnerabilitiesRemoved++;
      }
    }

    return { vulnerabilitiesRemoved };
  }
}

// Export an instance of the RulesEngine class
export const rulesEngine = new RulesEngine();