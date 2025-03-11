// Generated TypeScript types for database tables

export interface Assessment_observationsInsert {
  id?: string;
  assessment_id: string;
  observation_type_id: string;
  observation_value_id?: string | null;
  custom_value?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface Observation_detailsInsert {
  id?: string;
  property_observation_id: string;
  observation_type_id: string;
  observation_value_id?: string | null;
  custom_value?: string | null;
  created_at?: Date;
}

export interface Observation_typesInsert {
  id?: string;
  name: string;
  description?: string | null;
  created_at?: Date;
  value_type?: string;
  multiple?: boolean;
}

export interface Observation_valuesInsert {
  id?: string;
  observation_type_id: string;
  value: string;
  created_at?: Date;
  description?: string | null;
}

export interface PropertiesInsert {
  address: string;
  full_address: string;
  last_assessed?: Date | null;
  year_built?: number | null;
  location?: Record<string, any> | null;
  vulnerabilities?: Record<string, any> | null;
  underwriter_user_id?: string | null;
  created_at?: Date;
  updated_at?: Date;
  assessed_value?: number | null;
  assessed_value_currency?: any | null;
}

export interface Property_assessmentsInsert {
  id?: string;
  property_id: number;
  assessment_date?: Date;
  status?: any;
  assessor_id?: string | null;
  notes?: string | null;
  risk_score?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface Property_observationsInsert {
  id?: string;
  property_id: number;
  observation_date?: Date;
  created_at?: Date;
}

export interface RulesInsert {
  rule_id?: string;
  name: string;
  description: string;
  is_active?: boolean;
  effective_from?: Date;
  effective_to?: Date | null;
  created_at?: Date;
  updated_at?: Date;
  user_id?: string | null;
  version?: number;
  functional_rule?: Record<string, any>;
}

