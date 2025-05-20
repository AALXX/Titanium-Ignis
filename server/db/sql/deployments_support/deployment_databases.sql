DROP TABLE IF EXISTS deployment_databases;

CREATE TABLE deployment_databases (
        id SERIAL PRIMARY KEY,
        Database VARCHAR(50) NOT NULL
);
