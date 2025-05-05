DROP TABLE IF EXISTS projects_deployments;

CREATE TABLE
    projects_deployments (
        id SERIAL PRIMARY KEY,
        ProjectToken TEXT NOT NULL,
        DeploymentToken uuid NOT NULL,
        ServiceID INTEGER,
        Name VARCHAR(100) NOT NULL,
        Type VARCHAR(50) NOT NULL,         -- Type can be 'app', 'database', 'linux', etc.
        Domain VARCHAR(100),
        IpV4 VARCHAR(45) NOT NULL,
        IpV6 VARCHAR(45),
        LocalIp VARCHAR(45) NOT NULL,
        Ports JSONB,                     
        DataCenterLocation VARCHAR(100) NOT NULL,
        OS VARCHAR(50) NOT NULL,
        CreatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        DeployedAt TIMESTAMP WITH TIME ZONE,
        UpdatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        Status VARCHAR(50) NOT NULL,
        Environment VARCHAR(50) DEFAULT 'production',
        IsActive BOOLEAN DEFAULT TRUE,
        AdditionalInfo JSONB,
        
        ResourceAllocation JSONB,        -- CPU/RAM/Storage allocated
        DeploymentMethod VARCHAR(50),    -- How it was deployed (CI/CD, manual, etc.)
        DeploymentDuration INTEGER,      -- How long the deployment took in seconds
        DeployedBy VARCHAR(100),         -- User or system that initiated the deployment
        LastHealthCheckAt TIMESTAMP WITH TIME ZONE,
        HealthStatus VARCHAR(50),
        RollbackReference INTEGER,       -- Reference to a previous deployment if this is a rollback
        Tags TEXT[],                     -- Array of tags for better categorization
        
        UNIQUE (ProjectToken, ServiceID, DeploymentToken)
    );

CREATE INDEX idx_deployments_project_status ON projects_deployments(ProjectToken, Status);
CREATE INDEX idx_deployments_type ON projects_deployments(Type);
CREATE INDEX idx_deployments_environment ON projects_deployments(Environment);
CREATE INDEX idx_deployments_deploymenttoken ON projects_deployments(DeploymentToken);