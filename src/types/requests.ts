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
  'CONTAINS',
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
]);

// Schema for a leaf condition (actual comparison)
export const LeafCondition = z.object({
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

// Define types for our schemas
export type TLeafCondition = z.infer<typeof LeafCondition>;
export type TConditionGroup = {
  join_operator: z.infer<typeof LogicalJoinOperator>;
  conditions: Array<TLeafCondition | TConditionGroup>;
};

// Schema for a condition group (recursive structure)
export const ConditionGroup: z.ZodType<TConditionGroup> = z.object({
  join_operator: LogicalJoinOperator,
  conditions: z.lazy(() => z.array(
    z.union([LeafCondition, ConditionGroup])
  ))
});

// Schema for the functional rule
export const FunctionalRuleSchema = z.object({
  root: ConditionGroup,
  metadata: z.record(z.string(), z.any()).optional()
}).default({
  root: {
    join_operator: 'AND' as const,
    conditions: []
  }
});

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

// Enum for mitigation categories
export const MitigationCategory = z.enum([
  'FULL',
  // Add other categories as needed
]);

// Enum for vulnerability status
export const VulnerabilityStatus = z.enum([
  'open',
  'closed',
  // Add other statuses as needed
]);

export const CreateMitigationTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  value_type: z.string().default('enum'),
  multiple: z.boolean().default(false)
});

export const UpdateMitigationTypeSchema = CreateMitigationTypeSchema.partial().extend({
  id: z.string().uuid()
});

export const CreateMitigationValueSchema = z.object({
  mitigation_type_id: z.string().uuid(),
  value: z.string().min(1),
  description: z.string().nullable().optional(),
  category: MitigationCategory.default('FULL')
});

export const UpdateMitigationValueSchema = CreateMitigationValueSchema.partial().extend({
  id: z.string().uuid()
});

export const CreateVulnerabilitySchema = z.object({
  rule_id: z.string().uuid(),
  assessment_id: z.string().uuid(),
  assessment_observation_id: z.string().uuid().nullable().optional(),
  property_id: z.number().int().positive(),
  status: VulnerabilityStatus.default('open'),
  mitigation_description: z.string().nullable().optional(),
  mitigation_id: z.string().nullable().optional(),
  mitigation_type_id: z.string().uuid().nullable().optional()
});

export const UpdateVulnerabilitySchema = CreateVulnerabilitySchema.partial().extend({
  id: z.string().uuid()
});

export type CreateMitigationTypeRequest = z.infer<typeof CreateMitigationTypeSchema>;
export type UpdateMitigationTypeRequest = z.infer<typeof UpdateMitigationTypeSchema>;
export type CreateMitigationValueRequest = z.infer<typeof CreateMitigationValueSchema>;
export type UpdateMitigationValueRequest = z.infer<typeof UpdateMitigationValueSchema>;
export type CreateVulnerabilityRequest = z.infer<typeof CreateVulnerabilitySchema>;
export type UpdateVulnerabilityRequest = z.infer<typeof UpdateVulnerabilitySchema>;

export const UpdateAssessmentObservationSchema = z.object({
  vulnerability_id: z.string().uuid(),
  mitigation_id: z.string().uuid()
}); 