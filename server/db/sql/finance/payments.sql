-- DROP TABLE IF EXISTS payments;  

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    invoice_token VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'bank_transfer', 'credit_card', 'paypal', 'check', 'cash', 'other'
    transaction_id VARCHAR(255),
    reference_number VARCHAR(100),
    notes TEXT,
    recorded_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_token) REFERENCES invoices(invoice_token) ON DELETE RESTRICT,
    FOREIGN KEY (recorded_by) REFERENCES users(userprivatetoken) ON DELETE SET NULL
);

CREATE INDEX idx_payments_invoice ON payments(invoice_token);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_method ON payments(payment_method);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);