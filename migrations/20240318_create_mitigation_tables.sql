-- Create mitigation_types table
CREATE TABLE IF NOT EXISTS mitigation_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  value_type TEXT NOT NULL DEFAULT 'enum',
  multiple BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create mitigation_values table
CREATE TABLE IF NOT EXISTS mitigation_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mitigation_type_id UUID NOT NULL REFERENCES mitigation_types(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'FULL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add mitigation fields to vulnerabilities table
ALTER TABLE IF EXISTS vulnerabilities
  ADD COLUMN IF NOT EXISTS mitigation_type_id UUID REFERENCES mitigation_types(id),
  ADD COLUMN IF NOT EXISTS mitigation_value_id UUID REFERENCES mitigation_values(id),
  ADD COLUMN IF NOT EXISTS mitigation_description TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP; 