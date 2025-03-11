# Property Risk Assessment Backend

A backend service for assessing property risks using a configurable rules engine. The service allows underwriters to evaluate properties based on observations and provides a flexible system for applied science teams to manage risk assessment rules.

Overview of selected stack
- Using a simple express JS app because of speed and ease of development. Tooling is extensive and well supported. 
- For the persistent storage I am using Supabase because it is free and has a decent schema viewer along with ease to modify tables on the fly. In a true app I would have more permanent storage solutions or have the schema harder to modify without justification. 

Architecture Overview
Highlight how the code is structured and any design patterns used.
- simple route and service based architecture
- CRUD app style with asynchronous code calling

High Level Functionality Overview
List what features you have implemented and give an overview of user flow
- add an observation value/type
- add rules engine
- add tests 
- 

Future Works
- authentication and roles permission 
- in larger scale app, would break up into smaller microservices to asynchronously deal with new rules
- notifications for underwriters based on new rules created by science team
- working dashboard


## Features

- Rule-based vulnerability detection
- Point-in-time assessment evaluation
- Mitigation tracking and recommendations
- Human-readable rule descriptions
- Flexible rule conditions with multiple operators
- Test environment for rule validation

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (via Supabase)
- npm or yarn

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# PostgreSQL Configuration
POSTGRES_HOST=your_postgres_host
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## API Documentation

### Rules Management

Create a new rule:
```typescript
const rule = await rulesEngine.createRule({
  name: "Window Protection Rule",
  description: "Detects properties with inadequate window protection",
  functional_rule: {
    join_operator: "AND",
    conditions: [
      {
        observation_type_id: "window-type-uuid", // UUID from observation_types table
        observation_value_ids: ["single-pane-uuid"], // UUIDs from observation_values table
        value: "single_pane",
        operator: "EQUALS",
        value_type: "ENUM"
      },
      {
        observation_type_id: "distance-to-coast-uuid", // UUID from observation_types table
        value: 10,
        operator: "LESS_THAN",
        value_type: "NUMBER"
      }
    ]
  }
});
```

Update an existing rule:
```typescript
const updatedRule = await rulesEngine.updateRule("rule-uuid", {
  description: "Updated description",
  functional_rule: {
    join_operator: "AND",
    conditions: [/* ... */]
  }
});
```

Delete a rule:
```typescript
await rulesEngine.deleteRule("rule-uuid");
```

Test a rule:
```typescript
const testCases = [{
  observations: [{
    observation_type_id: "window-type-uuid",
    observation_value_id: "single-pane-uuid",
    value: "single_pane"
  }]
}];

const results = await rulesEngine.testRule(rule, testCases);
```

### Assessment Processing

Process current assessment:
```typescript
// Request
const assessment = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  property_id: "987fcdeb-51d3-12d3-a456-426614174000",
  observations: [
    {
      observation_type_id: "550e8400-e29b-41d4-a716-446655440000",
      observation_value_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7"
    },
    {
      observation_type_id: "662e8400-e29b-41d4-a716-446655440000",
      value: 5.2 // For a NUMBER type observation (e.g., distance to coast)
    }
  ]
};

const result = await rulesEngine.processAssessment(assessment);

// Response
{
  "assessment": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "property_id": "987fcdeb-51d3-12d3-a456-426614174000",
    "processed_at": "2024-03-19T08:30:00Z",
    "total_observations": 2,
    "rules_evaluated": 15,
    "summary": {
      "total_vulnerabilities": 2,
      "severity_breakdown": {
        "high": 1,
        "medium": 1,
        "low": 0
      }
    }
  },
  "vulnerabilities": [
    {
      "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "rule_id": "0d47d008-2a47-4f3a-a5a3-7b1c5d98f840",
      "status": "open",
      "created_at": "2024-03-19T08:30:00Z",
      "rule": {
        "name": "Window Protection Rule",
        "description": "Single-pane windows within 10 miles of coast require protection",
        "severity": "high",
        "triggered_conditions": [
          {
            "observation_type": "window_type",
            "observed_value": "single_pane",
            "threshold": null
          },
          {
            "observation_type": "distance_to_coast",
            "observed_value": 5.2,
            "threshold": "< 10"
          }
        ]
      },
      "available_mitigations": [
        {
          "id": "8a7b5c3d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
          "type": "window_protection",
          "name": "Storm Shutters",
          "description": "Install storm shutters on all windows",
          "effectiveness": "high"
        }
      ]
    }
  ]
}
```

Process assessment at a specific point in time:
```
```

### Vulnerability Management

Get mitigation options for a vulnerability:
```typescript
// Request
GET /api/vulnerabilities/{vulnerability_id}/mitigations

// Response
{
  "vulnerability": {
    "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "rule": {
      "name": "Window Protection Rule",
      "description": "Single-pane windows within 10 miles of coast require protection",
      "severity": "high"
    }
  },
  "mitigation_options": [
    {
      "id": "8a7b5c3d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
      "type": {
        "name": "Window Protection",
        "description": "Methods to protect windows",
        "value_type": "enum",
        "multiple": false
      },
      "values": [
        {
          "id": "abc123-value1",
          "description": "Permanent mounted shutters that roll down automatically",
          "category": "FULL"
        },
        {
          "id": "abc123-value2",
          "description": "Temporary plywood protection for windows",
          "category": "BRIDGE"
        }
      ]
    }
  ]
}
```

Apply mitigation to vulnerability:
```typescript
// Request
POST /api/vulnerabilities/{vulnerability_id}/mitigations
{
  "mitigation_value_id": "abc123-value1",
  "description": "Installed storm shutters on all windows on March 15, 2024"
}

// Response
{
  "vulnerability": {
    "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "rule_id": "0d47d008-2a47-4f3a-a5a3-7b1c5d98f840",
    "status": "in_review",
    "mitigation_value_id": "abc123-value1",
    "mitigation_description": "Installed storm shutters on all windows on March 15, 2024",
    "updated_at": "2024-03-19T08:30:00Z"
  },
  "mitigation": {
    "id": "abc123-value1",
    "description": "Permanent mounted shutters that roll down automatically",
    "category": "FULL"
  }
}
```

This endpoint allows underwriters to:
1. Apply a selected mitigation to a vulnerability
2. Provide implementation details in the description
3. Automatically changes the vulnerability status to "in_review"
4. Returns both the updated vulnerability and the applied mitigation details

### Mitigation Management

Create a mitigation type:
```typescript
// Request
POST /api/mitigations/types
{
  "name": "Window Protection",
  "description": "Methods to protect windows from storm damage",
  "value_type": "enum",
  "multiple": false
}

// Response
{
  "id": "8a7b5c3d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
  "name": "Window Protection",
  "description": "Methods to protect windows from storm damage",
  "value_type": "enum",
  "multiple": false,
  "created_at": "2024-03-19T08:30:00Z"
}
```

Add mitigation values to a type:
```typescript
// Request
POST /api/mitigations/values
{
  "mitigation_type_id": "8a7b5c3d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
  "description": "Permanent mounted shutters that roll down automatically",
  "category": "FULL"
}

// Response
{
  "id": "abc123-value1",
  "mitigation_type_id": "8a7b5c3d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
  "description": "Permanent mounted shutters that roll down automatically",
  "category": "FULL",
  "created_at": "2024-03-19T08:30:00Z"
}
```

This allows Applied Science teams to:
1. Create new types of mitigations (e.g., "Window Protection", "Flood Control")
2. Specify if multiple mitigations can be applied (multiple: true/false)
3. Add specific mitigation values with their descriptions
4. Categorize mitigations as either FULL or BRIDGE solutions

### Assessment Management

Link observation to vulnerability and mitigation:
```typescript
// Request
PATCH /api/assessments/observations/{observation_id}
{
  "vulnerability_id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "mitigation_id": "8a7b5c3d-9e0f-4a1b-8c2d-3e4f5a6b7c8d"
}

// Response
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "assessment_id": "123e4567-e89b-12d3-a456-426614174000",
  "observation_type_id": "window-type-uuid",
  "observation_value_id": "single-pane-uuid",
  "custom_value": null,
  "vulnerability_id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "mitigation_id": "8a7b5c3d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
  "created_at": "2024-03-19T08:30:00Z",
  "updated_at": "2024-03-19T08:35:00Z"
}
```

This endpoint allows users to:
1. Link an observation to the vulnerability it triggered
2. Associate the mitigation that was applied to address the vulnerability
3. Track which observations led to vulnerabilities and how they were mitigated
4. Maintain a complete audit trail of property assessments and mitigations