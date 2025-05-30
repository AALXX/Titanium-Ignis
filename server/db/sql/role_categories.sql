CREATE TABLE role_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0, -- Higher priority = more important
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
