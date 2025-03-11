import { supabaseAdmin } from '../config/supabase.js';
import { jest } from '@jest/globals';
import fetch, { Response } from 'node-fetch';

// Mock fetch globally
(global as any).fetch = jest.fn(() => Promise.resolve(new Response()));
(global as any).Response = Response;

export async function setupDatabase() {
  // Create properties table if it doesn't exist
  await supabaseAdmin.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  });

  // Create rules table if it doesn't exist
  await supabaseAdmin.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        functional_rule JSONB NOT NULL,
        effective_from TIMESTAMP WITH TIME ZONE,
        effective_to TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  });

  // Create assessments table if it doesn't exist
  await supabaseAdmin.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS assessments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        property_id INTEGER REFERENCES properties(id),
        observations JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  });

  // Create vulnerabilities table if it doesn't exist
  await supabaseAdmin.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS vulnerabilities (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        rule_id UUID REFERENCES rules(id),
        assessment_id UUID REFERENCES assessments(id),
        property_id INTEGER REFERENCES properties(id),
        mitigation_type_id UUID REFERENCES mitigation_types(id),
        mitigation_value_id UUID REFERENCES mitigation_values(id),
        mitigation_description TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  });

  // Create mitigation_types table if it doesn't exist
  await supabaseAdmin.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS mitigation_types (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        value_type TEXT NOT NULL DEFAULT 'enum',
        multiple BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  });

  // Create mitigation_values table if it doesn't exist
  await supabaseAdmin.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS mitigation_values (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        mitigation_type_id UUID NOT NULL REFERENCES mitigation_types(id) ON DELETE CASCADE,
        value TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL DEFAULT 'FULL',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  });
}

export async function cleanupDatabase() {
  await supabaseAdmin.from('vulnerabilities').delete().neq('id', 0);
  await supabaseAdmin.from('mitigation_values').delete().neq('id', 0);
  await supabaseAdmin.from('mitigation_types').delete().neq('id', 0);
  await supabaseAdmin.from('rules').delete().neq('id', 0);
  await supabaseAdmin.from('assessments').delete().neq('id', 0);
  await supabaseAdmin.from('properties').delete().neq('id', 0);
}

beforeEach(async () => {
  await setupDatabase();
  await cleanupDatabase();
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

export const setupTestData = async () => {
  // Create test observation types
  const { data: windowType } = await supabaseAdmin
    .from('observation_types')
    .insert({
      name: 'Window Type',
      description: 'Type of window installation',
      value_type: 'enum',
      multiple: false
    })
    .select()
    .single();

  const { data: distanceType } = await supabaseAdmin
    .from('observation_types')
    .insert({
      name: 'Distance',
      description: 'Distance measurement in feet',
      value_type: 'number',
      multiple: false
    })
    .select()
    .single();

  // Create test observation values
  const { data: singlePane } = await supabaseAdmin
    .from('observation_values')
    .insert({
      observation_type_id: windowType.id,
      value: 'single-pane',
      description: 'Single pane window'
    })
    .select()
    .single();

  // Create test rule
  const { data: rule } = await supabaseAdmin
    .from('rules')
    .insert({
      name: 'Single Pane Window Distance Check',
      description: 'Check if single pane windows are at a safe distance',
      is_active: true,
      functional_rule: {
        root: {
          join_operator: 'AND',
          conditions: [
            {
              observation_type_id: windowType.id,
              observation_value_ids: [singlePane.id],
              operator: 'EQUALS',
              value: 'single-pane',
              value_type: 'ENUM'
            },
            {
              observation_type_id: distanceType.id,
              operator: 'LESS_THAN',
              value: 90,
              value_type: 'NUMBER'
            }
          ]
        },
        metadata: {
          severity: 'high',
          baseDistance: 30,
          multiplier: 3
        }
      }
    })
    .select()
    .single();

  return {
    windowType,
    distanceType,
    singlePane,
    rule
  };
}; 