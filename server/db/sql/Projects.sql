DROP TABLE IF EXISTS projects;

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    project_name TEXT NOT NULL,
    project_token TEXT NOT NULL,
    repo_url TEXT NOT NULL,
    checked_out_by TEXT,
    checked_out_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'available',
    type TEXT NOT NULL CHECK(type IN ('git', 'svn')),
    UNIQUE (project_token)
);