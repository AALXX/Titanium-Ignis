DROP TABLE IF EXISTS budget_revisions CASCADE;

CREATE TABLE budget_revisions (
    id SERIAL PRIMARY KEY,
    revision_token VARCHAR(255) NOT NULL UNIQUE,
    buget_token VARCHAR(255) NOT NULL,
    project_token VARCHAR(255) NOT NULL,
    previous_amount DECIMAL(15,2) NOT NULL,
    new_amount DECIMAL(15,2) NOT NULL,
    change_amount DECIMAL(15,2) GENERATED ALWAYS AS (new_amount - previous_amount) STORED,
    change_reason TEXT NOT NULL,
    revision_type VARCHAR(50) NOT NULL, -- 'increase', 'decrease', 'reallocation'
    approved_by VARCHAR(250),
    revision_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fiscal_period VARCHAR(50), -- 'Q1-2025', '2025-01', etc.
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buget_token) REFERENCES projects_bugets(buget_token) ON DELETE CASCADE,
    FOREIGN KEY (project_token) REFERENCES projects(projecttoken) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(userprivatetoken) ON DELETE SET NULL
);

CREATE INDEX idx_budget_revisions_buget ON budget_revisions(buget_token);
CREATE INDEX idx_budget_revisions_project ON budget_revisions(project_token);
CREATE INDEX idx_budget_revisions_date ON budget_revisions(revision_date);
CREATE INDEX idx_budget_revisions_period ON budget_revisions(fiscal_period);
