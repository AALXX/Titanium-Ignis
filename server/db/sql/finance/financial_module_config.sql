DROP TABLE IF EXISTS financial_module_config
CREATE TABLE
    financial_module_config (
        id SERIAL PRIMARY KEY,
        project_token TEXT NOT NULL,
        currency TEXT NOT NULL,
        fiscal_year_start DATE NOT NULL,
        FOREIGN KEY (project_token) REFERENCES projects (ProjectToken)
    );