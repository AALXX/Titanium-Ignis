DROP TABLE IF EXISTS projects_codebase;

CREATE TABLE projects_codebase (
    id SERIAL PRIMARY KEY,
    ProjectToken TEXT NOT NULL,
    RepositoryUrl TEXT NOT NULL,
    LastUserCommitUserToken TEXT NOT NULL,
    ProjectType TEXT NOT NULL CHECK(ProjectType IN ('git', 'svn')),
    -- LastCommitTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ProjectToken)
);

