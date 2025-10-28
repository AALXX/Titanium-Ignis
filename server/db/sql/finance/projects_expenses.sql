-- DROP TABLE IF EXISTS expenses;

CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    ProjectToken VARCHAR(255) NOT NULL,
    category_id INTEGER NOT NULL,
    user_private_token VARCHAR(250) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    description TEXT NOT NULL,
    receipt_url VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'reimbursed'
    approval_date TIMESTAMP,
    approved_by VARCHAR(250),
    rejection_reason TEXT,
    reimbursement_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ProjectToken) REFERENCES projects(ProjectToken) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_private_token) REFERENCES users(UserPrivateToken) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(UserPrivateToken) ON DELETE SET NULL
);

CREATE INDEX idx_expenses_project ON expenses(ProjectToken);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_user ON expenses(user_private_token);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_date ON expenses(expense_date);