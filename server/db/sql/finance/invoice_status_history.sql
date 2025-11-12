DROP TABLE IF EXISTS invoice_status_history CASCADE;

CREATE TABLE invoice_status_history (
    id SERIAL PRIMARY KEY,
    history_token VARCHAR(255) NOT NULL UNIQUE,
    invoice_token VARCHAR(255) NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    status_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(250),
    notes TEXT,
    amount_at_status DECIMAL(15,2) NOT NULL, -- Invoice amount at this status
    FOREIGN KEY (invoice_token) REFERENCES invoices(invoice_token) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(userprivatetoken) ON DELETE SET NULL
);

CREATE INDEX idx_invoice_history_invoice ON invoice_status_history(invoice_token);
CREATE INDEX idx_invoice_history_status ON invoice_status_history(new_status);
CREATE INDEX idx_invoice_history_date ON invoice_status_history(status_date);