DROP TABLE IF EXISTS expense_audit_log CASCADE;

CREATE TABLE expense_audit_log (
    id SERIAL PRIMARY KEY,
    audit_token VARCHAR(255) NOT NULL UNIQUE,
    expense_token VARCHAR(255) NOT NULL,
    project_token VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'approved', 'rejected', 'deleted', 'reimbursed'
    field_changed VARCHAR(100), -- 'amount', 'status', 'category', etc.
    old_value TEXT,
    new_value TEXT,
    amount_impact DECIMAL(15,2) DEFAULT 0, -- How this change affects budget (+ or -)
    changed_by VARCHAR(250) NOT NULL,
    change_reason TEXT,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_token) REFERENCES project_expenses(expense_token) ON DELETE CASCADE,
    FOREIGN KEY (project_token) REFERENCES projects(projecttoken) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(userprivatetoken) ON DELETE SET NULL
);

CREATE INDEX idx_expense_audit_expense ON expense_audit_log(expense_token);
CREATE INDEX idx_expense_audit_project ON expense_audit_log(project_token);
CREATE INDEX idx_expense_audit_date ON expense_audit_log(changed_at);
CREATE INDEX idx_expense_audit_action ON expense_audit_log(action_type);