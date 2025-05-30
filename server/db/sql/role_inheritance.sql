CREATE TABLE role_inheritance (
    id SERIAL PRIMARY KEY,
    parent_role_id INTEGER NOT NULL REFERENCES roles(id),
    child_role_id INTEGER NOT NULL REFERENCES roles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_role_id, child_role_id),
    CHECK(parent_role_id != child_role_id)
);