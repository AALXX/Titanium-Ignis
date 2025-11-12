DROP TABLE IF EXISTS financial_events CASCADE;

CREATE TABLE financial_events (
    id SERIAL PRIMARY KEY,
    event_token VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(50) NOT NULL, -- 'budget_set', 'expense_added', 'invoice_created', 'payment_received', etc.
    project_token VARCHAR(255) NOT NULL,
    related_entity_type VARCHAR(50), -- 'invoice', 'expense', 'budget', 'payment'
    related_entity_token VARCHAR(255), -- Token of the related record
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    transaction_date DATE NOT NULL, -- Business date of the transaction
    description TEXT NOT NULL,
    metadata JSONB, -- Flexible storage for event-specific data
    created_by VARCHAR(250),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_token) REFERENCES projects(projecttoken) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(userprivatetoken) ON DELETE SET NULL
);

CREATE INDEX idx_financial_events_project ON financial_events(project_token);
CREATE INDEX idx_financial_events_type ON financial_events(event_type);
CREATE INDEX idx_financial_events_date ON financial_events(transaction_date);
CREATE INDEX idx_financial_events_entity ON financial_events(related_entity_type, related_entity_token);
CREATE INDEX idx_financial_events_created ON financial_events(created_at);
-- GIN index for JSONB queries
-- CREATE INDEX idx_financial_events_metadata ON financial_events USING GIN (metadata);