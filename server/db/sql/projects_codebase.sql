DROP TABLE IF EXISTS projects_codebase;

CREATE TABLE projects_codebase (
    id SERIAL PRIMARY KEY,

    -- Core project info
    ProjectToken TEXT NOT NULL UNIQUE,
    Mode TEXT NOT NULL CHECK(Mode IN ('create', 'add')),

    -- For creating new repository
    RepositoryName TEXT,
    Description TEXT,
    InitializeWithReadme BOOLEAN,
    GitignoreTemplate TEXT,
    License TEXT,

    -- For adding existing repository
    RepositoryUrl TEXT,
    ProjectType TEXT CHECK(ProjectType IN ('git', 'svn')),
    Branch TEXT,
    AuthMethod TEXT CHECK(AuthMethod IN ('ssh', 'token', 'credentials', 'none')),
    AccessToken TEXT,
    SshKey TEXT,
    Username TEXT,

    -- Sync settings
    AutoSync BOOLEAN DEFAULT FALSE,
    SyncInterval INTEGER CHECK(SyncInterval >= 0),

    -- Audit
    LastUserCommitUserToken TEXT NOT NULL,

    -- Timestamps
    CreatedAt TIMESTAMP DEFAULT NOW(),
    UpdatedAt TIMESTAMP DEFAULT NOW()
);