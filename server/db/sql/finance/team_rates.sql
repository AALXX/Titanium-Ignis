-- DROP TABLE IF EXISTS team_rates;
CREATE TABLE team_rates (
    id SERIAL PRIMARY KEY,
    user_private_token VARCHAR(250) NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL CHECK (hourly_rate >= 0),
    rate_type VARCHAR(50) NOT NULL DEFAULT 'standard', -- 'standard', 'overtime', 'holiday', 'contractor'
    effective_date DATE NOT NULL,
    end_date DATE,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR', -- ISO 4217 currency codes
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_private_token) REFERENCES users(UserPrivateToken) ON DELETE CASCADE,
    CONSTRAINT chk_rate_dates CHECK (end_date IS NULL OR end_date >= effective_date)
);

CREATE INDEX idx_rates_user ON team_rates(user_private_token);
CREATE INDEX idx_rates_effective ON team_rates(effective_date);
CREATE INDEX idx_rates_active ON team_rates(is_active);
