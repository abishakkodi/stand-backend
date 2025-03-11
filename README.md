# Stand Backend

Express backend with Supabase integration for property assessments.

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

### Rules

#### Create Rule

Creates a new rule for property assessment.

- **URL**: `/rules`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "name": "High Risk Property Alert",
    "description": "Identifies properties that require immediate attention",
    "is_active": true,
    "effective_from": "2024-03-21T00:00:00Z",
    "effective_to": "2025-03-21T00:00:00Z",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "functional_rule": {
      "conditions": [
        {
          "observation_type_id": "550e8400-e29b-41d4-a716-446655440000",
          "observation_value_ids": ["550e8400-e29b-41d4-a716-446655440001"],
          "operator": "EQUALS",
          "value": "Critical",
          "value_type": "ENUM"
        },
        {
          "observation_type_id": "660e8400-e29b-41d4-a716-446655440000",
          "operator": "LESS_THAN",
          "value": 40,
          "value_type": "NUMBER"
        }
      ],
      "join_operator": "OR",
      "metadata": {
        "risk_level": "HIGH",
        "requires_notification": true
      }
    }
  }
  ```

- **Success Response**:
  - **Code**: 201
  - **Content**:
    ```json
    {
      "message": "Rule created successfully",
      "rule_id": "uuid-string"
    }
    ```

- **Error Responses**:
  - **Code**: 400
    - **Content**: `{ "error": "Invalid request body", "details": [...] }`
  
  - **Code**: 500
    - **Content**: `{ "error": "Internal server error", "message": "Failed to create rule" }`

#### Get All Rules

Retrieves all rules ordered by priority.

- **URL**: `/rules`
- **Method**: `GET`
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    [
      {
        "id": "uuid-string",
        "name": "string",
        "description": "string",
        "conditions": [...],
        "actions": [...],
        "is_active": boolean,
        "priority": number,
        "created_at": "timestamp",
        "updated_at": "timestamp"
      }
    ]
    ```

#### Get Rule by ID

Retrieves a specific rule by its ID.

- **URL**: `/rules/:id`
- **Method**: `GET`
- **URL Parameters**:
  - `id`: UUID of the rule (required)

- **Success Response**:
  - **Code**: 200
  - **Content**: Same as single rule object from Get All Rules

- **Error Responses**:
  - **Code**: 400
    - **Content**: `{ "error": "Invalid rule ID format" }`
  - **Code**: 404
    - **Content**: `{ "error": "Rule not found" }`
  - **Code**: 500
    - **Content**: `{ "error": "Internal server error", "message": "Failed to fetch rule" }`

#### Update Rule

Updates an existing rule.

- **URL**: `/rules/:id`
- **Method**: `PUT`
- **URL Parameters**:
  - `id`: UUID of the rule (required)
- **Request Body**: Same as Create Rule, all fields optional

- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Rule updated successfully",
      "rule": {
        // Updated rule object
      }
    }
    ```

- **Error Responses**:
  - **Code**: 400
    - **Content**: `{ "error": "Invalid rule ID format" }`
    - **Content**: `{ "error": "Invalid request body", "details": [...] }`
    - **Content**: `{ "error": "No valid fields to update" }`
  - **Code**: 404
    - **Content**: `{ "error": "Rule not found" }`
  - **Code**: 500
    - **Content**: `{ "error": "Internal server error", "message": "Failed to update rule" }`

#### Delete Rule

Deletes a rule.

- **URL**: `/rules/:id`
- **Method**: `DELETE`
- **URL Parameters**:
  - `id`: UUID of the rule (required)

- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Rule deleted successfully",
      "rule_id": "uuid-string"
    }
    ```

- **Error Responses**:
  - **Code**: 400
    - **Content**: `{ "error": "Invalid rule ID format" }`
  - **Code**: 404
    - **Content**: `{ "error": "Rule not found" }`
  - **Code**: 500
    - **Content**: `{ "error": "Internal server error", "message": "Failed to delete rule" }`

### Properties

#### Create Property

Creates a new property record.

- **URL**: `/property`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "address": "123 Main St",
    "full_address": "123 Main St, San Francisco, CA 94105",
    "last_assessed": "2024-03-21T00:00:00Z",
    "year_built": 1990,
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "underwriter_user_id": "123e4567-e89b-12d3-a456-426614174000",
    "assessed_value": 1500000,
    "assessed_value_currency": "USD"
  }
  ```

- **Success Response**:
  - **Code**: 201
  - **Content**:
    ```json
    {
      "message": "Property created successfully",
      "property_id": "uuid-string"
    }
    ```

- **Error Responses**:
  - **Code**: 400
    - **Content**: `{ "error": "Invalid request body", "details": [...] }`
  
  - **Code**: 500
    - **Content**: `{ "error": "Internal server error", "message": "Failed to create property" }`

- **Example Request**:
  ```bash
  curl -X POST http://localhost:3000/property \
    -H "Content-Type: application/json" \
    -d '{
      "address": "123 Main St",
      "full_address": "123 Main St, San Francisco, CA 94105",
      "full_address": "123 Main St, City, State 12345",
      "year_built": 1990,
      "location": {
        "latitude": 37.7749,
        "longitude": -122.4194
      },
      "assessed_value": 500000,
      "assessed_value_currency": "USD"
    }'
  ```

### Property Assessments

#### Create Property Assessment

Creates a new property assessment with associated observations.

- **URL**: `/property/:id/assessment`
- **Method**: `POST`
- **URL Parameters**:
  - `id`: UUID of the property (required)

- **Request Body**:
  ```typescript
  {
    "assessor_id": string (UUID),
    "observations": [
      {
        "observation_type_id": string (UUID),
        "observation_value_id": string (UUID)
      }
    ],
    "property_id": string (UUID) // Must match the :id in the URL
  }
  ```

- **Success Response**:
  - **Code**: 201
  - **Content**:
    ```json
    {
      "message": "Property assessment created successfully",
      "assessment_id": "uuid-string"
    }
    ```

- **Error Responses**:
  - **Code**: 400
    - **Content**: `{ "error": "Invalid property ID format" }`
    - **Content**: `{ "error": "Invalid request body", "details": [...] }`
    - **Content**: `{ "error": "Property ID in URL does not match the one in request body" }`
  
  - **Code**: 500
    - **Content**: `{ "error": "Internal server error", "message": "Failed to create property assessment" }`

- **Example Request**:
  ```bash
  curl -X POST http://localhost:3000/property/123e4567-e89b-12d3-a456-426614174000/assessment \
    -H "Content-Type: application/json" \
    -d '{
      "assessor_id": "123e4567-e89b-12d3-a456-426614174001",
      "observations": [
        {
          "observation_type_id": "123e4567-e89b-12d3-a456-426614174002",
          "observation_value_id": "123e4567-e89b-12d3-a456-426614174003"
        }
      ],
      "property_id": "123e4567-e89b-12d3-a456-426614174000"
    }'
  ```

### Observations

#### Observation Types

##### Create Observation Type
- **URL**: `/observations/types`
- **Method**: `POST`
- **Request Body**:
  ```typescript
  {
    "name": string,
    "description": string,
    "value_type": string,      // defaults to 'enum'
    "multiple": boolean        // defaults to false
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**:
    ```json
    {
      "message": "Observation type created successfully",
      "type_id": "uuid-string"
    }
    ```
- **Error Response**:
  - **Code**: 400
    - **Content**: `{ "error": "Invalid request body", "details": [...] }`
  - **Code**: 500
    - **Content**: `{ "error": "Internal server error", "message": "Failed to create observation type" }`

##### Get All Observation Types
- **URL**: `/observations/types`
- **Method**: `GET`
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    [
      {
        "id": "uuid-string",
        "name": "string",
        "description": "string",
        "value_type": "string",
        "multiple": boolean,
        "created_at": "timestamp"
      }
    ]
    ```

##### Get Observation Type by ID
- **URL**: `/observations/types/:id`
- **Method**: `GET`
- **URL Parameters**: `id=[uuid]`
- **Success Response**:
  - **Code**: 200
  - **Content**: Same as single type object from Get All Types
- **Error Response**:
  - **Code**: 400
    - **Content**: `{ "error": "Invalid observation type ID format" }`
  - **Code**: 404
    - **Content**: `{ "error": "Observation type not found" }`

##### Update Observation Type
- **URL**: `/observations/types/:id`
- **Method**: `PUT`
- **URL Parameters**: `id=[uuid]`
- **Request Body**: Same as Create Type (all fields optional)
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Observation type updated successfully",
      "type": {
        // Updated type object
      }
    }
    ```
- **Error Response**:
  - **Code**: 400
    - **Content**: `{ "error": "Invalid observation type ID format" }`
    - **Content**: `{ "error": "Invalid request body", "details": [...] }`
  - **Code**: 404
    - **Content**: `{ "error": "Observation type not found" }`

##### Delete Observation Type
- **URL**: `/observations/types/:id`
- **Method**: `DELETE`
- **URL Parameters**: `id=[uuid]`
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Observation type deleted successfully",
      "type_id": "uuid-string"
    }
    ```
- **Error Response**:
  - **Code**: 400
    - **Content**: `{ "error": "Invalid observation type ID format" }`
  - **Code**: 404
    - **Content**: `{ "error": "Observation type not found" }`

#### Observation Values

##### Create Observation Value
- **URL**: `/observations/values`
- **Method**: `POST`
- **Request Body**:
  ```typescript
  {
    "observation_type_id": string,  // UUID
    "value": string,
    "description": string
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**:
    ```json
    {
      "message": "Observation value created successfully",
      "value_id": "uuid-string"
    }
    ```
- **Error Response**:
  - **Code**: 400
    - **Content**: `{ "error": "Invalid request body", "details": [...] }`
  - **Code**: 404
    - **Content**: `{ "error": "Observation type not found" }`
  - **Code**: 500
    - **Content**: `{ "error": "Internal server error", "message": "Failed to create observation value" }`

##### Get Values by Type
- **URL**: `/observations/types/:typeId/values`
- **Method**: `GET`
- **URL Parameters**: `typeId=[uuid]`
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    [
      {
        "id": "uuid-string",
        "observation_type_id": "uuid-string",
        "value": "string",
        "description": "string",
        "created_at": "timestamp"
      }
    ]
    ```

##### Get Value by ID
- **URL**: `/observations/values/:id`
- **Method**: `GET`
- **URL Parameters**: `id=[uuid]`
- **Success Response**:
  - **Code**: 200
  - **Content**: Same as single value object from Get Values by Type
- **Error Response**:
  - **Code**: 400
    - **Content**: `{ "error": "Invalid observation value ID format" }`
  - **Code**: 404
    - **Content**: `{ "error": "Observation value not found" }`

##### Update Value
- **URL**: `/observations/values/:id`
- **Method**: `PUT`
- **URL Parameters**: `id=[uuid]`
- **Request Body**: Same as Create Value (all fields optional)
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Observation value updated successfully",
      "value": {
        // Updated value object
      }
    }
    ```
- **Error Response**:
  - **Code**: 400
    - **Content**: `{ "error": "Invalid observation value ID format" }`
    - **Content**: `{ "error": "Invalid request body", "details": [...] }`
  - **Code**: 404
    - **Content**: `{ "error": "Observation value not found" }`
    - **Content**: `{ "error": "Observation type not found" }`

##### Delete Value
- **URL**: `/observations/values/:id`
- **Method**: `DELETE`
- **URL Parameters**: `id=[uuid]`
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Observation value deleted successfully",
      "value_id": "uuid-string"
    }
    ```
- **Error Response**:
  - **Code**: 400
    - **Content**: `{ "error": "Invalid observation value ID format" }`
  - **Code**: 404
    - **Content**: `{ "error": "Observation value not found" }`

### Database Schema

The application uses the following main tables:

- `properties`: Stores property information
  ```sql
  create table public.properties (
    id serial not null,
    address text not null,
    full_address text not null,
    last_assessed timestamp with time zone null,
    year_built integer null,
    location jsonb null,
    underwriter_user_id uuid null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    assessed_value numeric null,
    assessed_value_currency public.currency_type null default 'USD'::currency_type,
    constraint properties_pkey primary key (id),
    constraint properties_underwriter_user_id_fkey foreign key (underwriter_user_id) references auth.users (id)
  );

  -- Index for underwriter lookup
  create index properties_underwriter_user_id_idx 
    on public.properties using btree (underwriter_user_id) 
    tablespace pg_default;
  ```

- `property_assessments`: Stores property assessment records
  - `id`: UUID (primary key)
  - `property_id`: UUID (foreign key to properties)
  - `assessor_id`: UUID
  - `assessment_date`: timestamp
  - `status`: enum
  - `created_at`: timestamp
  - `updated_at`: timestamp

- `assessment_observations`: Links assessments with observations
  - `id`: UUID (primary key)
  - `assessment_id`: UUID (foreign key to property_assessments)
  - `observation_type_id`: UUID (foreign key to observation_types)
  - `observation_value_id`: UUID (foreign key to observation_values)
  - `created_at`: timestamp
  - `updated_at`: timestamp

- `observation_types`: Defines different types of observations
  - `id`: UUID (primary key)
  - `name`: string
  - `description`: string
  - `value_type`: string
  - `multiple`: boolean
  - `created_at`: timestamp

- `observation_values`: Stores possible values for observation types
  - `id`: UUID (primary key)
  - `observation_type_id`: UUID (foreign key to observation_types)
  - `value`: string
  - `description`: string
  - `created_at`: timestamp

- `rules`: Stores rule definitions
  - `rule_id`: UUID (primary key)
  - `name`: text
  - `description`: text
  - `is_active`: boolean
  - `effective_from`: timestamp with time zone
  - `effective_to`: timestamp with time zone (nullable)
  - `user_id`: UUID (foreign key to auth.users, nullable)
  - `version`: integer
  - `functional_rule`: jsonb
  - `created_at`: timestamp with time zone
  - `updated_at`: timestamp with time zone

#### Observation Types Table
```sql
create table public.observation_types (
  id uuid not null default gen_random_uuid(),
  name text not null,
  description text null,
  created_at timestamp with time zone not null default now(),
  value_type text not null default 'enum'::text,
  multiple boolean not null default false,
  constraint observation_types_pkey primary key (id)
);
```

#### Observation Values Table
```sql
create table public.observation_values (
  id uuid not null default gen_random_uuid(),
  observation_type_id uuid not null,
  value text not null,
  created_at timestamp with time zone not null default now(),
  description text null,
  constraint observation_values_pkey primary key (id),
  constraint observation_values_observation_type_id_value_key unique (observation_type_id, value),
  constraint observation_values_observation_type_id_fkey foreign key (observation_type_id) references observation_types (id)
);
```

## Development

### Available Scripts

- `npm run dev`: Start development server with hot-reload
- `npm run build`: Build the application
- `npm start`: Start production server
- `npm test`: Run tests

### Type Safety

The application uses:
- TypeScript for static type checking
- Zod for runtime request validation
- PostgreSQL with strong typing

## Contributing

1. Create a feature branch
2. Commit your changes
3. Push to the branch
4. Create a Pull Request

## License

This project is licensed under the ISC License.
