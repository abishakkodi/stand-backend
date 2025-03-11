import { supabaseAdmin } from '../../config/supabase.js';
import { Rule, RuleWithDetails, ObservationType, ObservationValue } from './types.js';
import { TConditionGroup } from '../../types/requests.js';
import { ConditionEvaluator } from './condition-evaluator.js';
import { VulnerabilityManager } from './vulnerability-manager.js';

export class RuleManager {
  private vulnerabilityManager = new VulnerabilityManager();

  async createRule(rule: {
    name: string;
    description: string;
    functional_rule: TConditionGroup;
  }): Promise<Rule> {
    const { data, error } = await supabaseAdmin
      .from('rules')
      .insert(rule)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create rule: ${error.message}`);
    }

    return data;
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
      const observations = await this.vulnerabilityManager.getVulnerabilityObservations(vulnerability);
      if (!observations.length) continue;
      
      const evaluator = new ConditionEvaluator(observations);
      const stillTriggered = evaluator.evaluateConditions(
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

  async deleteRule(ruleId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('rules')
      .delete()
      .eq('id', ruleId);

    if (error) {
      throw new Error(`Failed to delete rule: ${error.message}`);
    }
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
    return testCases.map(testCase => {
      const evaluator = new ConditionEvaluator(testCase.observations);
      return {
        case: testCase,
        triggered: evaluator.evaluateConditions(rule.functional_rule, testCase.observations)
      };
    });
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

    const formatCondition = async (condition: any) => {
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
} 