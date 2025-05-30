CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'project:read', 'code:write'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    resource_id INTEGER NOT NULL REFERENCES resources(id),
    action_id INTEGER NOT NULL REFERENCES actions(id),
    is_system_permission BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_id, action_id)
);