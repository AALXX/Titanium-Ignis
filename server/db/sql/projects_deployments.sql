DROP TABLE IF EXISTS projects_deployments;

CREATE TABLE
    projects_deployments (
        id SERIAL PRIMARY KEY,
        ProjectToken TEXT NOT NULL,
        DeploymentID INTEGER NOT NULL,
        Name VARCHAR(50) NOT NULL,
        Type VARCHAR(50) NOT NULL,
        Branch VARCHAR(50) NOT NULL,
        Version VARCHAR(50) NOT NULL,
        DeploymentUrl TEXT,
        Server VARCHAR(50) NOT NULL,
        AdditinalData JSONB,
        DeployedAt TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            Status VARCHAR(50) NOT NULL,
            UNIQUE (id)
    );