-- Create health check table
CREATE TABLE IF NOT EXISTS _health (
    id BIGSERIAL PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'healthy',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial health check record
INSERT INTO _health (status, timestamp)
VALUES ('healthy', NOW())
ON CONFLICT DO NOTHING; 