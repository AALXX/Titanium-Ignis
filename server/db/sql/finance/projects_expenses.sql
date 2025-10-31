-- DROP TABLE IF EXISTS project_expenses;

CREATE TABLE project_expenses (
    id SERIAL PRIMARY KEY,
    expenses_title VARCHAR(50) NOT NULL,
    ProjectToken VARCHAR(255) NOT NULL,
    expense_token VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    buget_token VARCHAR(255) NOT NULL,
    user_private_token VARCHAR(250) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    description TEXT,
    receipt_url VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'reimbursed'
    approval_date TIMESTAMP,
    approved_by VARCHAR(250),
    rejection_reason TEXT,
    reimbursement_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ProjectToken) REFERENCES projects(ProjectToken) ON DELETE CASCADE,
    FOREIGN KEY (user_private_token) REFERENCES users(UserPrivateToken) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(UserPrivateToken) ON DELETE SET NULL,
    FOREIGN KEY (buget_token) REFERENCES projects_bugets(buget_token) ON DELETE SET NULL
);

CREATE INDEX idx_expenses_project ON project_expenses(ProjectToken);
CREATE INDEX idx_expenses_user ON project_expenses(user_private_token);
CREATE INDEX idx_expenses_status ON project_expenses(status);
CREATE INDEX idx_expenses_date ON project_expenses(expense_date);