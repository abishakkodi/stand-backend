import express from 'express';
import cors from 'cors';
import propertyRouter from './routes/property.js';
import rulesRouter from './routes/rules.js';
import mitigationsRouter from './routes/mitigations.js';
import vulnerabilitiesRouter from './routes/vulnerabilities.js';
import propertyAssessmentsRouter from './routes/property-assessments.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Base route
app.get('/', (req: express.Request, res: express.Response) => {
  res.json({
    name: 'Property Risk Assessment API',
    version: '1.0.0',
    status: 'healthy',
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>',
      description: 'All endpoints require authentication using a valid JWT token',
      example: 'export TOKEN="your_jwt_token_here"'
    },
    error_responses: {
      '400': {
        description: 'Bad Request - Invalid input parameters',
        example: {
          error: 'Bad Request',
          message: 'Invalid property ID format',
          details: ['Property ID must be a valid UUID']
        }
      },
      '401': {
        description: 'Unauthorized - Missing or invalid authentication token',
        example: {
          error: 'Unauthorized',
          message: 'Missing or invalid authentication token'
        }
      },
      '403': {
        description: 'Forbidden - Insufficient permissions',
        example: {
          error: 'Forbidden',
          message: 'User does not have permission to access this resource'
        }
      },
      '404': {
        description: 'Not Found - Resource does not exist',
        example: {
          error: 'Not Found',
          message: 'Property with ID abc-123 not found'
        }
      },
      '500': {
        description: 'Internal Server Error',
        example: {
          error: 'Internal Server Error',
          message: 'An unexpected error occurred'
        }
      }
    },
    apis: {
      '/': {
        description: 'API information and documentation',
        authentication_required: false,
        methods: {
          GET: {
            description: 'Get API documentation',
            curl_example: 'curl http://localhost:3000/',
            response: {
              name: 'string',
              version: 'string',
              status: 'string',
              apis: 'object'
            }
          }
        }
      },
      '/properties': {
        description: 'Property management',
        authentication_required: true,
        methods: {
          GET: {
            description: 'Get a list of properties',
            curl_example: 'curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/properties',
            example_response: {
              properties: [
                {
                  id: '123e4567-e89b-12d3-a456-426614174000',
                  address: '123 Main St, San Francisco, CA 94105',
                  created_at: '2024-03-21T08:00:00Z',
                  updated_at: '2024-03-21T08:00:00Z'
                }
              ]
            }
          },
          POST: {
            description: 'Create a new property',
            curl_example: 'curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d \'{"address": "456 Market St, San Francisco, CA 94105"}\' http://localhost:3000/properties',
            example_response: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              address: '456 Market St, San Francisco, CA 94105',
              created_at: '2024-03-21T08:00:00Z'
            }
          }
        }
      },
      '/rules': {
        description: 'Risk assessment rules',
        authentication_required: true,
        methods: {
          GET: {
            description: 'Get all rules',
            curl_example: 'curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/rules',
            example_response: {
              rules: [
                {
                  id: '0d47d008-2a47-4f3a-a5a3-7b1c5d98f840',
                  name: 'Window Protection Rule',
                  description: 'Detects properties with inadequate window protection',
                  functional_rule: {
                    join_operator: 'AND',
                    conditions: [
                      {
                        observation_type_id: '550e8400-e29b-41d4-a716-446655440000',
                        observation_value_ids: ['7c9e6679-7425-40de-944b-e07fc1f90ae7'],
                        value: 'single_pane',
                        operator: 'EQUALS',
                        value_type: 'ENUM'
                      },
                      {
                        observation_type_id: '662e8400-e29b-41d4-a716-446655440000',
                        value: 10,
                        operator: 'LESS_THAN',
                        value_type: 'NUMBER'
                      }
                    ]
                  }
                }
              ]
            }
          }
        }
      },
      '/mitigations': {
        description: 'Mitigation management',
        authentication_required: true,
        methods: {
          GET: {
            description: 'Get all mitigation types',
            curl_example: 'curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/mitigations',
            example_response: {
              mitigation_types: [
                {
                  id: '8a7b5c3d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
                  name: 'Window Protection',
                  description: 'Methods to protect windows from storm damage',
                  value_type: 'ENUM',
                  multiple: false
                }
              ]
            }
          },
          POST: {
            description: 'Create a new mitigation type',
            curl_example: 'curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d \'{"name": "Storm Shutters", "description": "Protection against high winds", "value_type": "ENUM", "multiple": false}\' http://localhost:3000/mitigations',
            example_response: {
              id: '8a7b5c3d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
              name: 'Storm Shutters',
              description: 'Protection against high winds',
              value_type: 'ENUM',
              multiple: false
            }
          }
        }
      },
      '/vulnerabilities': {
        description: 'Vulnerability tracking',
        authentication_required: true,
        methods: {
          GET: {
            description: 'Get vulnerabilities for a property',
            curl_example: 'curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/vulnerabilities?property_id=123e4567-e89b-12d3-a456-426614174000"',
            example_response: {
              vulnerabilities: [
                {
                  id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
                  rule_id: '0d47d008-2a47-4f3a-a5a3-7b1c5d98f840',
                  status: 'open',
                  created_at: '2024-03-21T08:00:00Z',
                  rule: {
                    name: 'Window Protection Rule',
                    description: 'Single-pane windows within 10 miles of coast require protection',
                    severity: 'high'
                  }
                }
              ]
            }
          }
        }
      },
      '/vulnerabilities/:id/mitigations': {
        description: 'Vulnerability mitigation management',
        authentication_required: true,
        methods: {
          GET: {
            description: 'Get mitigation options for a vulnerability',
            curl_example: 'curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/vulnerabilities/d290f1ee-6c54-4b01-90e6-d701748f0851/mitigations',
            example_response: {
              vulnerability: {
                id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
                rule: {
                  name: 'Window Protection Rule',
                  description: 'Single-pane windows within 10 miles of coast require protection',
                  severity: 'high'
                }
              },
              mitigation_options: [
                {
                  id: '8a7b5c3d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
                  type: {
                    name: 'Window Protection',
                    description: 'Methods to protect windows',
                    value_type: 'enum',
                    multiple: false
                  },
                  values: [
                    {
                      id: 'abc123-value1',
                      description: 'Permanent mounted shutters that roll down automatically',
                      category: 'FULL'
                    },
                    {
                      id: 'abc123-value2',
                      description: 'Temporary plywood protection for windows',
                      category: 'BRIDGE'
                    }
                  ]
                }
              ]
            }
          },
          POST: {
            description: 'Apply a mitigation to a vulnerability',
            curl_example: 'curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d \'{"mitigation_value_id": "abc123-value1", "description": "Installed storm shutters on all windows on March 21, 2024"}\' http://localhost:3000/vulnerabilities/d290f1ee-6c54-4b01-90e6-d701748f0851/mitigations',
            example_response: {
              vulnerability: {
                id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
                status: 'in_review',
                mitigation: {
                  id: 'def456',
                  description: 'Installed storm shutters on all windows on March 21, 2024',
                  applied_at: '2024-03-21T08:00:00Z'
                }
              }
            }
          }
        }
      },
      '/property-assessments': {
        description: 'Property assessment processing',
        authentication_required: true,
        methods: {
          POST: {
            description: 'Process a new property assessment',
            curl_example: 'curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d \'{"property_id": "123e4567-e89b-12d3-a456-426614174000", "observations": [{"observation_type_id": "550e8400-e29b-41d4-a716-446655440000", "observation_value_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "value": "single_pane"}, {"observation_type_id": "662e8400-e29b-41d4-a716-446655440000", "value": 5.2}]}\' http://localhost:3000/property-assessments',
            example_response: {
              assessment: {
                id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                property_id: '123e4567-e89b-12d3-a456-426614174000',
                processed_at: '2024-03-21T08:00:00Z',
                total_observations: 2,
                rules_evaluated: 15,
                summary: {
                  total_vulnerabilities: 2,
                  severity_breakdown: {
                    high: 1,
                    medium: 1,
                    low: 0
                  }
                }
              },
              vulnerabilities: [
                {
                  id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
                  rule_id: '0d47d008-2a47-4f3a-a5a3-7b1c5d98f840',
                  status: 'open',
                  created_at: '2024-03-21T08:00:00Z',
                  rule: {
                    name: 'Window Protection Rule',
                    description: 'Single-pane windows within 10 miles of coast require protection',
                    severity: 'high',
                    triggered_conditions: [
                      {
                        observation_type: 'window_type',
                        observed_value: 'single_pane',
                        threshold: null
                      },
                      {
                        observation_type: 'distance_to_coast',
                        observed_value: 5.2,
                        threshold: '< 10'
                      }
                    ]
                  }
                }
              ]
            }
          }
        }
      }
    }
  });
});

// Routes
app.use('/properties', propertyRouter);
app.use('/rules', rulesRouter);
app.use('/mitigations', mitigationsRouter);
app.use('/vulnerabilities', vulnerabilitiesRouter);
app.use('/property-assessments', propertyAssessmentsRouter);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

export default app; 