-- Create enum for rule action types
CREATE TYPE rule_action_type AS ENUM ('notify', 'flag', 'block');

-- Create enum for rule condition operators
CREATE TYPE rule_condition_operator AS ENUM ('equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains');

-- Create rules table
CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    conditions JSONB NOT NULL CHECK (jsonb_array_length(conditions) > 0),
    actions JSONB NOT NULL CHECK (jsonb_array_length(actions) > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 1000) DEFAULT 500,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add validation check for conditions array structure
ALTER TABLE rules ADD CONSTRAINT valid_conditions CHECK (
    jsonb_typeof(conditions) = 'array' AND
    NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(conditions) AS condition
        WHERE NOT (
            jsonb_typeof(condition->>'field') = 'string' AND
            jsonb_typeof(condition->>'operator') = 'string' AND
            condition->>'value' IS NOT NULL
        )
    )
);

-- Add validation check for actions array structure
ALTER TABLE rules ADD CONSTRAINT valid_actions CHECK (
    jsonb_typeof(actions) = 'array' AND
    NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(actions) AS action
        WHERE NOT (
            jsonb_typeof(action->>'type') = 'string' AND
            (action->>'type')::text IN ('notify', 'flag', 'block')
        )
    )
);

-- Create index for faster querying of active rules
CREATE INDEX idx_rules_is_active ON rules(is_active) WHERE is_active = true;

-- Create index for priority-based sorting
CREATE INDEX idx_rules_priority ON rules(priority);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rules_updated_at
    BEFORE UPDATE ON rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 