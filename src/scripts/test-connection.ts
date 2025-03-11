import pg from 'pg';
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config();

const {
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_DB,
  POSTGRES_USER,
  POSTGRES_PASSWORD
} = process.env;

// Validate required environment variables
if (!POSTGRES_HOST || !POSTGRES_PORT || !POSTGRES_DB || !POSTGRES_USER || !POSTGRES_PASSWORD) {
  throw new Error('Missing required PostgreSQL environment variables');
}

function mapPostgresToTypeScript(dataType: string, isNullable: boolean): string {
  const typeMap: Record<string, string> = {
    'integer': 'number',
    'bigint': 'number',
    'numeric': 'number',
    'decimal': 'number',
    'real': 'number',
    'double precision': 'number',
    'smallint': 'number',
    'text': 'string',
    'character varying': 'string',
    'varchar': 'string',
    'char': 'string',
    'boolean': 'boolean',
    'timestamp with time zone': 'Date',
    'timestamp without time zone': 'Date',
    'date': 'Date',
    'time': 'string',
    'json': 'Record<string, any>',
    'jsonb': 'Record<string, any>',
    'uuid': 'string',
  };

  const tsType = typeMap[dataType] || 'any';
  return isNullable ? `${tsType} | null` : tsType;
}

async function generateTypes() {
  const client = new pg.Client({
    host: POSTGRES_HOST as string,
    port: parseInt(POSTGRES_PORT as string, 10),
    database: POSTGRES_DB as string,
    user: POSTGRES_USER as string,
    password: POSTGRES_PASSWORD as string,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    
    console.log('Connection successful! Querying table schemas...');
    
    // Get all tables in public schema
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    let typeDefinitions = '// Generated TypeScript types for database tables\n\n';

    // For each table, get its columns
    for (const { table_name } of tablesResult.rows) {
      const columnsResult = await client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = $1
        ORDER BY ordinal_position
      `, [table_name]);

      // Generate interface for the table
      typeDefinitions += `export interface ${table_name.charAt(0).toUpperCase() + table_name.slice(1)}Insert {\n`;
      
      for (const column of columnsResult.rows) {
        const isNullable = column.is_nullable === 'YES';
        const hasDefault = column.column_default !== null;
        const isGenerated = column.column_default?.includes('nextval');
        
        // Skip auto-generated columns for insert types
        if (!isGenerated) {
          const tsType = mapPostgresToTypeScript(column.data_type, isNullable);
          const optional = isNullable || hasDefault;
          typeDefinitions += `  ${column.column_name}${optional ? '?' : ''}: ${tsType};\n`;
        }
      }
      
      typeDefinitions += '}\n\n';
    }

    // Write types to file
    const typesPath = join(process.cwd(), 'src', 'types', 'database.ts');
    writeFileSync(typesPath, typeDefinitions);
    console.log(`Types have been written to ${typesPath}`);

  } catch (error) {
    console.error('Failed to generate types:', error);
  } finally {
    await client.end();
  }
}

generateTypes(); 