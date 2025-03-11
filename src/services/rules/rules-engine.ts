import { supabaseAdmin } from '../../config/supabase.js';
import { TConditionGroup } from '../../types/requests.js';
import { ConditionEvaluator } from './condition-evaluator.js';
import { VulnerabilityManager } from './vulnerability-manager.js';
import { RuleManager } from './rule-manager.js';
import { Rule, Vulnerability, PointInTimeAssessment, VulnerabilityState } from './types.js';

type Condition = {
  observation_type_id: string;
  value: string | number | boolean | string[] | number[] | boolean[];
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'GREATER_THAN_OR_EQUALS' | 'LESS_THAN_OR_EQUALS' | 'IN' | 'NOT_IN' | 'CONTAINS' | 'NOT_CONTAINS';
  value_type: 'ENUM' | 'NUMBER' | 'BOOLEAN' | 'DATE';
  observation_value_ids?: string[];
};

export class RulesEngine {
  private ruleManager = new RuleManager();
  private vulnerabilityManager = new VulnerabilityManager();

  async processAssessment(assessment: {
    id: string;
    property_id: string;
    observations: Array<{
      observation_type_id: string;
      observation_value_id?: string;
      value?: number | string;
    }>;
  }): Promise<void> {
    // Get all active rules
    const { data: rules } = await supabaseAdmin
      .from('rules')
      .select('*');

    if (!rules) return;

    // Test each rule against the observations
    const evaluator = new ConditionEvaluator(assessment.observations);
    const triggeredRules = rules.filter(rule => {
      const result = evaluator.evaluateConditions(rule.functional_rule, assessment.observations);
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
    for (const rule of triggeredRules) {
      await this.vulnerabilityManager.createVulnerability(
        rule.id,
        assessment.id,
        Number(assessment.property_id)
      );
    }
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

    const evaluator = new ConditionEvaluator(assessment.observations);
    for (const rule of activeRules) {
      if (evaluator.evaluateConditions(rule.functional_rule, assessment.observations)) {
        await this.vulnerabilityManager.createVulnerability(
          rule.id,
          assessment.id,
          assessment.property_id
        );
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

  // Delegate methods to RuleManager
  createRule = this.ruleManager.createRule.bind(this.ruleManager);
  updateRule = this.ruleManager.updateRule.bind(this.ruleManager);
  deleteRule = this.ruleManager.deleteRule.bind(this.ruleManager);
  testRule = this.ruleManager.testRule.bind(this.ruleManager);
  getHumanReadableRule = this.ruleManager.getHumanReadableRule.bind(this.ruleManager);

  // Delegate methods to VulnerabilityManager
  getVulnerabilityMitigationOptions = this.vulnerabilityManager.getVulnerabilityMitigationOptions.bind(this.vulnerabilityManager);
  applyMitigation = this.vulnerabilityManager.applyMitigation.bind(this.vulnerabilityManager);
  updateVulnerabilityStatus = this.vulnerabilityManager.updateStatus.bind(this.vulnerabilityManager);

  private getConditionsFromGroup(group: TConditionGroup): Condition[] {
    const conditions: Condition[] = [];
    group.conditions.forEach(condition => {
      if ('join_operator' in condition) {
        // This is a nested condition group
        conditions.push(...this.getConditionsFromGroup(condition as TConditionGroup));
      } else {
        // This is a leaf condition
        conditions.push(condition as Condition);
      }
    });
    return conditions;
  }

  async createRule(rule: { name: string; description: string; functional_rule: TConditionGroup }) {
    // First, validate all observation types and values exist
    const conditions = this.getConditionsFromGroup(rule.functional_rule);
    const observationTypeIds = new Set(
      conditions.map(condition => condition.observation_type_id)
    );

    // Get all referenced observation types
    const { data: observationTypes, error: typeError } = await supabaseAdmin
      .from('observation_types')
      .select('id, name, value_type')
      .in('id', Array.from(observationTypeIds));

    if (typeError || !observationTypes) {
      throw new Error(`Failed to validate observation types: ${typeError?.message}`);
    }

    // Validate all referenced observation types exist
    const foundTypeIds = new Set(observationTypes.map(t => t.id));
    const missingTypes = Array.from(observationTypeIds).filter(id => !foundTypeIds.has(id));
    if (missingTypes.length > 0) {
      throw new Error(`Invalid observation types: ${missingTypes.join(', ')}`);
    }

    // Get all observation value IDs that need validation
    const valueIds = new Set<string>();
    conditions.forEach(condition => {
      if (condition.observation_value_ids) {
        condition.observation_value_ids.forEach(id => valueIds.add(id));
      }
    });

    if (valueIds.size > 0) {
      // Get all referenced observation values
      const { data: observationValues, error: valueError } = await supabaseAdmin
        .from('observation_values')
        .select('id, observation_type_id')
        .in('id', Array.from(valueIds));

      if (valueError || !observationValues) {
        throw new Error(`Failed to validate observation values: ${valueError?.message}`);
      }

      // Validate all referenced observation values exist
      const foundValueIds = new Set(observationValues.map(v => v.id));
      const missingValues = Array.from(valueIds).filter(id => !foundValueIds.has(id));
      if (missingValues.length > 0) {
        throw new Error(`Invalid observation values: ${missingValues.join(', ')}`);
      }

      // Validate observation values belong to correct observation types
      const valueToType = new Map(observationValues.map(v => [v.id, v.observation_type_id]));
      conditions.forEach(condition => {
        if (condition.observation_value_ids) {
          condition.observation_value_ids.forEach(valueId => {
            const typeId = valueToType.get(valueId);
            if (typeId !== condition.observation_type_id) {
              throw new Error(
                `Observation value ${valueId} does not belong to observation type ${condition.observation_type_id}`
              );
            }
          });
        }
      });
    }

    // All validations passed, create the rule
    const { data: createdRule, error } = await supabaseAdmin
      .from('rules')
      .insert(rule)
      .select()
      .single();

    if (error || !createdRule) {
      throw new Error(`Failed to create rule: ${error?.message}`);
    }

    return createdRule;
  }
}

// Export an instance of the RulesEngine class
export const rulesEngine = new RulesEngine(); 