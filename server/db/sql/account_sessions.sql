DROP TABLE IF EXISTS account_sessions;

CREATE TABLE account_sessions (
    id SERIAL PRIMARY KEY,
    userID INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    userSessionToken VARCHAR(250) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    RegistrationType TEXT NOT NULL CHECK(RegistrationType IN ('google', 'credentials'))
);