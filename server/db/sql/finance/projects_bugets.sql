--  DROP TABLE IF EXISTS projects_bugets;

CREATE TABLE projects_bugets (
    id SERIAL PRIMARY KEY,
    buget_name VARCHAR(1000) NOT NULL,
    buget_token VARCHAR(255) NOT NULL UNIQUE,
    ProjectToken VARCHAR(255) NOT NULL,
    total_buget DECIMAL(15,2) NOT NULL CHECK (total_buget >= 0),
    spent_amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR', -- ISO 4217 currency codes
    buget_period VARCHAR(50), -- 'monthly', 'quarterly', 'project-based'
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ProjectToken) REFERENCES projects(ProjectToken) ON DELETE CASCADE,
    CONSTRAINT chk_spent_not_exceed CHECK (spent_amount <= total_buget * 1.2) -- Allow 20% overspend
);


CREATE INDEX idx_bugets_project ON projects_bugets(ProjectToken);
CREATE INDEX idx_bugets_currency ON projects_bugets(currency);
CREATE INDEX idx_bugets_token ON projects_bugets(buget_token);