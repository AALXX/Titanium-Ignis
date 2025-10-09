DROP TABLE IF EXISTS project_module_links;

CREATE TABLE project_module_links (
    id SERIAL PRIMARY KEY,
    ProjectToken TEXT NOT NULL,
    ModuleID INT NOT NULL,
    FOREIGN KEY (ProjectToken) REFERENCES projects(ProjectToken) ON DELETE CASCADE,
    FOREIGN KEY (ModuleID) REFERENCES project_avalible_modules(id) ON DELETE CASCADE,
    UNIQUE (ProjectToken, ModuleID)
);
