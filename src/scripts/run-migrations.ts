import { supabaseAdmin } from '../config/supabase.js';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  try {
    const migrationSQL = fs.readFileSync(
      path.join(process.cwd(), 'migrations', '20240318_create_mitigation_tables.sql'),
      'utf8'
    );

    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: migrationSQL });
    if (error) {
      console.error('Error running migrations:', error);
      process.exit(1);
    }

    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

runMigrations(); 