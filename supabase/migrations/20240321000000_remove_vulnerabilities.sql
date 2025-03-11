-- Remove vulnerabilities column from properties table
ALTER TABLE properties DROP COLUMN IF EXISTS vulnerabilities; 