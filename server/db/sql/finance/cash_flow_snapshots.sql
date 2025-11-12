DROP TABLE IF EXISTS cash_flow_snapshots CASCADE;

CREATE TABLE cash_flow_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_token VARCHAR(255) NOT NULL UNIQUE,
    project_token VARCHAR(255),
    snapshot_date DATE NOT NULL,
    snapshot_period VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
    -- Revenue metrics
    total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
    invoiced_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    received_payments DECIMAL(15,2) NOT NULL DEFAULT 0,
    outstanding_receivables DECIMAL(15,2) NOT NULL DEFAULT 0,
    -- Expense metrics
    total_expenses DECIMAL(15,2) NOT NULL DEFAULT 0,
    approved_expenses DECIMAL(15,2) NOT NULL DEFAULT 0,
    pending_expenses DECIMAL(15,2) NOT NULL DEFAULT 0,
    -- Cash flow
    net_cash_flow DECIMAL(15,2) GENERATED ALWAYS AS (received_payments - approved_expenses) STORED,
    -- Profitability
    gross_profit DECIMAL(15,2) GENERATED ALWAYS AS (total_revenue - total_expenses) STORED,
    profit_margin_percent DECIMAL(5,2),
    -- Budget metrics
    budget_allocated DECIMAL(15,2),
    budget_spent DECIMAL(15,2),
    budget_remaining DECIMAL(15,2),
    budget_utilization_percent DECIMAL(5,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_token) REFERENCES projects(projecttoken) ON DELETE CASCADE
);

CREATE INDEX idx_snapshots_project ON cash_flow_snapshots(project_token);
CREATE INDEX idx_snapshots_date ON cash_flow_snapshots(snapshot_date);
CREATE INDEX idx_snapshots_period ON cash_flow_snapshots(snapshot_period);
CREATE UNIQUE INDEX idx_snapshots_unique ON cash_flow_snapshots(project_token, snapshot_date, snapshot_period);