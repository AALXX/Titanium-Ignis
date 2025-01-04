CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    Name VARCHAR(30) NOT NULL UNIQUE,
    Description TEXT
);
