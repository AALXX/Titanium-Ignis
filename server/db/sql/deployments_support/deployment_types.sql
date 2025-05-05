DROP TABLE IF EXISTS deployment_types;

CREATE TABLE deployment_types (
    id SERIAL PRIMARY KEY,
    Types VARCHAR(50) NOT NULL,
    Name VARCHAR(50) NOT NULL
);
