import { TLeafCondition, TConditionGroup } from '../../types/requests.js';
import { Observation } from './types.js';

export class ConditionEvaluator {
  evaluateConditions(
    conditionGroup: TConditionGroup,
    observations: Observation[]
  ): boolean {
    // If there are no conditions, the rule should not be triggered
    if (conditionGroup.conditions.length === 0) {
      return false;
    }

    return this.evaluateGroup(conditionGroup);
  }

  private evaluateGroup(group: TConditionGroup): boolean {
    // If there are no conditions in this group, it should not be triggered
    if (group.conditions.length === 0) {
      return false;
    }

    const results = group.conditions.map(condition => {
      if ('conditions' in condition) {
        return this.evaluateGroup(condition);
      }
      return this.evaluateLeafCondition(condition);
    });

    return group.join_operator === 'AND'
      ? results.every(result => result)
      : results.some(result => result);
  }

  private evaluateLeafCondition(condition: TLeafCondition): boolean {
    const observation = this.observations.find(
      obs => obs.observation_type_id === condition.observation_type_id
    );

    if (!observation) return false;

    if (condition.observation_value_ids) {
      return condition.observation_value_ids.includes(observation.observation_value_id || '');
    }

    if (condition.value !== undefined && observation.value !== undefined) {
      return this.evaluateOperator(condition.operator, observation.value, condition.value);
    }

    return false;
  }

  private evaluateOperator(operator: string, observationValue: string | number, conditionValue: string | number): boolean {
    switch (operator) {
      case 'EQUALS':
        return observationValue === conditionValue;
      case 'NOT_EQUALS':
        return observationValue !== conditionValue;
      case 'GREATER_THAN':
        return Number(observationValue) > Number(conditionValue);
      case 'LESS_THAN':
        return Number(observationValue) < Number(conditionValue);
      case 'GREATER_THAN_OR_EQUALS':
        return Number(observationValue) >= Number(conditionValue);
      case 'LESS_THAN_OR_EQUALS':
        return Number(observationValue) <= Number(conditionValue);
      case 'CONTAINS':
        return observationValue.toString().includes(conditionValue.toString());
      case 'NOT_CONTAINS':
        return !observationValue.toString().includes(conditionValue.toString());
      case 'IN':
        return conditionValue.toString().split(',').includes(observationValue.toString());
      case 'NOT_IN':
        return !conditionValue.toString().split(',').includes(observationValue.toString());
      default:
        return false;
    }
  }

  constructor(private observations: Observation[]) {}
} 