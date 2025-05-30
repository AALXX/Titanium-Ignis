CREATE TABLE rbac_audit_log (
    id SERIAL PRIMARY KEY,
    projecttoken VARCHAR(250),
    userprivatetoken VARCHAR(250),
    action_type VARCHAR(50) NOT NULL, -- 'role_assigned', 'role_removed', 'permission_granted', etc.
    old_role_id INTEGER REFERENCES roles(id),
    new_role_id INTEGER REFERENCES roles(id),
    permission_id INTEGER REFERENCES permissions(id),
    performed_by VARCHAR(250),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);