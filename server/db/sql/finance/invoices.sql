DROP TABLE IF EXISTS invoice_line_items;
DROP TABLE IF EXISTS invoices;

CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_token VARCHAR(255) NOT NULL UNIQUE,
    project_token VARCHAR(255) NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    billing_type VARCHAR(50) NOT NULL DEFAULT 'fixed-price',
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount DECIMAL(15,2) DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount DECIMAL(15,2) DEFAULT 0 CHECK (discount_amount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    issue_date DATE,
    due_date DATE,
    sent_date TIMESTAMP,
    paid_date DATE,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    notes TEXT,
    terms TEXT,
    payment_instructions TEXT,
    created_by VARCHAR(250),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_token) REFERENCES projects(projecttoken) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(userprivatetoken) ON DELETE SET NULL,
    CONSTRAINT chk_invoice_dates CHECK (due_date IS NULL OR issue_date IS NULL OR due_date >= issue_date)
);


CREATE INDEX idx_invoices_project ON invoices(project_token);
CREATE INDEX idx_invoices_client ON invoices(client_name);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Invoice Line Items table
CREATE TABLE invoice_line_items (
    id SERIAL PRIMARY KEY,
    invoice_token VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    tax_rate DECIMAL(5,2) DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
    tax_amount DECIMAL(15,2) DEFAULT 0 CHECK (tax_amount >= 0),
    item_type VARCHAR(50) DEFAULT 'service', -- 'service', 'product', 'expense', 'milestone'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_token) REFERENCES invoices(invoice_token) ON DELETE CASCADE
);

CREATE INDEX idx_line_items_invoice ON invoice_line_items(invoice_token);
