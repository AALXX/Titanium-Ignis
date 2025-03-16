DROP TABLE IF EXISTS projects;

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    ProjectName TEXT NOT NULL,
    ProjectDescription TEXT NOT NULL,
    ProjectToken TEXT NOT NULL,
    ProjectOwnerToken TEXT NOT NULL,
    Status TEXT NOT NULL DEFAULT 'Started', -- 'Started', 'In Progress', 'Deployed', 'On Hold', 'Cancelled
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ProjectToken)
);

