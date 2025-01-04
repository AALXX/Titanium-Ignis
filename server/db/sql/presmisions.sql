CREATE TABLE
    permissions (
        id SERIAL PRIMARY KEY,
        Name VARCHAR(100) NOT NULL UNIQUE,
        Description TEXT,
        ResourceId INTEGER NOT NULL REFERENCES resources (id),
        ActionId INTEGER NOT NULL REFERENCES actions (id)
    );