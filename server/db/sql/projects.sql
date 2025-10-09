DROP TABLE IF EXISTS projects CASCADE;

CREATE TABLE c (
    id SERIAL PRIMARY KEY,
    ProjectName TEXT NOT NULL,
    ProjectDescription TEXT NOT NULL,
    ProjectToken TEXT NOT NULL UNIQUE,
    ProjectOwnerToken TEXT NOT NULL,
    Status TEXT NOT NULL DEFAULT 'Started', -- 'Started', 'In Progress', etc.
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
