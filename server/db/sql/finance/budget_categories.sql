-- DROP TABLE IF EXISTS budget_categories;
CREATE TABLE budget_categories (
    id SERIAL PRIMARY KEY,
    ProjectToken VARCHAR(255) NOT NULL,
    category_name VARCHAR(100) NOT NULL, -- 'Labor', 'Materials', 'Equipment', 'Travel', 'Software', 'Other'
    allocated_amount DECIMAL(15,2) NOT NULL CHECK (allocated_amount >= 0),
    spent_amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ProjectToken) REFERENCES projects(ProjectToken) ON DELETE CASCADE,
    UNIQUE(ProjectToken, category_name)
);

CREATE INDEX idx_categories_project ON budget_categories(ProjectToken);
CREATE INDEX idx_categories_active ON budget_categories(is_active);