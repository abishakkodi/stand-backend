import { TConditionGroup } from '../../types/requests.js';

export interface Observation {
  observation_type_id: string;
  observation_value_id?: string;
  value?: string | number;
}

export interface Assessment {
  observations: Observation[];
}

export interface Vulnerability {
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

export interface ObservationType {
  name: string;
}

export interface ObservationValue {
  value: string;
}

export interface RuleWithDetails {
  id: string;
  name: string;
  description: string;
  functional_rule: TConditionGroup;
  conditions?: Array<{
    observation_type: ObservationType;
    observation_values?: ObservationValue[];
  }>;
}

export interface MitigationType {
  id: string;
  name: string;
  description: string;
  value_type: string;
  multiple: boolean;
}

export interface MitigationValue {
  id: string;
  description: string;
  category: 'FULL' | 'BRIDGE';
}

export interface MitigationOption {
  id: string;
  type: MitigationType;
  values: MitigationValue[];
}

export interface PointInTimeAssessment {
  id: string;
  property_id: number;
  observations: AssessmentObservation[];
  evaluation_date: string;
}

export interface VulnerabilityState {
  vulnerabilities: Vulnerability[];
  timestamp: string;
}

export interface AssessmentObservation {
  id: string;
  observation_type_id: string;
  observation_value_id: string;
  assessment_id: string;
  created_at: string;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  functional_rule: TConditionGroup;
  effective_from?: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
} 