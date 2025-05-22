DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    UserName VARCHAR(30) NOT NULL,
    UserEmail VARCHAR(50) NOT NULL,
    UserPwd VARCHAR(80) NOT NULL,
    UserPrivateToken VARCHAR(250) NOT NULL,
    UserPublicToken VARCHAR(250) NOT NULL,
    UserSessionToken VARCHAR(250) NOT NULL,
    RegistrationType TEXT NOT NULL CHECK(RegistrationType IN ('google', 'credentials')),
    UNIQUE (UserPrivateToken),
    UNIQUE (UserPublicToken),
    UNIQUE (UserSessionToken)
);

CREATE INDEX idx_users_email_trgm ON users
USING gin (UserEmail gin_trgm_ops);

CREATE INDEX idx_users_user_private_token_trgm ON users
USING gin (UserPrivateToken gin_trgm_ops);