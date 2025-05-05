DROP TABLE IF EXISTS deployment_os;

CREATE TABLE deployment_os (
    id SERIAL PRIMARY KEY,
    OS VARCHAR(50) NOT NULL
);
