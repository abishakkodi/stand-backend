-- Create enum for rule action types
CREATE TYPE rule_action_type AS ENUM ('notify', 'flag', 'block');

-- Create enum for rule condition operators
CREATE TYPE rule_condition_operator AS ENUM ('equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains');

-- Create rules table
CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    user_id UUID,
    version INTEGER NOT NULL DEFAULT 1,
    functional_rule JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add basic validation check for functional_rule
ALTER TABLE rules ADD CONSTRAINT valid_functional_rule CHECK (
    jsonb_typeof(functional_rule) = 'object' AND
    functional_rule ? 'join_operator' AND
    functional_rule ? 'conditions'
);

-- Create index for name-based searching
CREATE INDEX idx_rules_name ON rules(name);

-- Create index for faster querying of active rules
CREATE INDEX idx_rules_is_active ON rules(is_active) WHERE is_active = true;

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