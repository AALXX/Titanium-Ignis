CREATE TABLE request_logs (
    id SERIAL PRIMARY KEY,
    projecttoken VARCHAR(255) NOT NULL,
    deploymenttoken VARCHAR(255) NOT NULL,
    containerid VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    status INTEGER,
    responsetime INTEGER, -- in milliseconds
    requestip VARCHAR(50),
    useragent TEXT,
    referer TEXT,
    headers JSONB,
    queryparams JSONB,
    requestbody TEXT,
    responsebody TEXT,
    errordetails TEXT,
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
    createdat TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for better query performance
CREATE INDEX idx_request_logs_projecttoken ON request_logs(projecttoken);
CREATE INDEX idx_request_logs_deploymenttoken ON request_logs(deploymenttoken);
CREATE INDEX idx_request_logs_timestamp ON request_logs(timestamp DESC);
CREATE INDEX idx_request_logs_status ON request_logs(status);
CREATE INDEX idx_request_logs_method ON request_logs(method);