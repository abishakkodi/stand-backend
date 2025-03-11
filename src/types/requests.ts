import { z } from 'zod';

export const CreatePropertySchema = z.object({
  address: z.string(),
  full_address: z.string(),
  last_assessed: z.string().datetime().nullable().optional(),
  year_built: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).optional(),
  underwriter_user_id: z.string().uuid().optional(),
  assessed_value: z.number().positive().optional(),
  assessed_value_currency: z.enum(['USD', 'EUR', 'GBP']).optional()
});

export type CreatePropertyRequest = z.infer<typeof CreatePropertySchema>;

export const CreatePropertyAssessmentSchema = z.object({
  assessor_id: z.string().uuid(),
  observations: z.array(z.object({
    observation_type_id: z.string().uuid(),
    observation_value_id: z.string().uuid()
  })),
  property_id: z.string().uuid()
});

export type CreatePropertyAssessmentRequest = z.infer<typeof CreatePropertyAssessmentSchema>;

// Enum for comparison operators
export const ComparisonOperator = z.enum([
  'EQUALS',
  'NOT_EQUALS',
  'GREATER_THAN',
  'LESS_THAN',
  'GREATER_THAN_OR_EQUALS',
  'LESS_THAN_OR_EQUALS',
  'IN',
  'NOT_IN',
  'CONTAINS',  // For array types
  'NOT_CONTAINS'
]);

// Enum for data types
export const ValueType = z.enum([
  'ENUM',
  'BOOLEAN',
  'NUMBER',
  'STRING',
  'DATE'
]);

// Enum for logical joins
export const LogicalJoinOperator = z.enum([
  'AND',
  'OR'
]).nullable();

// Schema for a single condition
export const RuleCondition = z.object({
  observation_type_id: z.string().uuid(),
  observation_value_ids: z.array(z.string().uuid()).optional(),
  operator: ComparisonOperator,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
    z.array(z.boolean())
  ]),
  value_type: ValueType
});

// Schema for the functional rule
export const FunctionalRuleSchema = z.object({
  conditions: z.array(RuleCondition).default([]),
  join_operator: LogicalJoinOperator.default(null),
  metadata: z.record(z.string(), z.any()).optional()
}).default(() => ({
  conditions: [],
  join_operator: null
}));

export const CreateRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  is_active: z.boolean().default(true),
  effective_from: z.string().datetime().default(() => new Date().toISOString()),
  effective_to: z.string().datetime().nullable().optional(),
  user_id: z.string().uuid().nullable().optional(),
  version: z.number().int().min(1).default(1),
  functional_rule: FunctionalRuleSchema
});

export const UpdateRuleSchema = CreateRuleSchema.partial().extend({
  rule_id: z.string().uuid()
});

export type CreateRuleRequest = z.infer<typeof CreateRuleSchema>;
export type UpdateRuleRequest = z.infer<typeof UpdateRuleSchema>;

export const CreateObservationTypeSchema = z.object({
  name: z.string(),
  description: z.string(),
  value_type: z.string(),
  multiple: z.boolean().default(false)
});

export const UpdateObservationTypeSchema = CreateObservationTypeSchema.partial().extend({
  id: z.string().uuid()
});

export const CreateObservationValueSchema = z.object({
  observation_type_id: z.string().uuid(),
  value: z.string(),
  description: z.string()
});

export const UpdateObservationValueSchema = CreateObservationValueSchema.partial().extend({
  id: z.string().uuid()
});

export type CreateObservationTypeRequest = z.infer<typeof CreateObservationTypeSchema>;
export type UpdateObservationTypeRequest = z.infer<typeof UpdateObservationTypeSchema>;
export type CreateObservationValueRequest = z.infer<typeof CreateObservationValueSchema>;
export type UpdateObservationValueRequest = z.infer<typeof UpdateObservationValueSchema>; 