CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50), -- e.g., 'core', 'technical', 'business'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
