DROP TABLE IF EXISTS project_avalible_modules CASCADE;

CREATE TABLE project_avalible_modules (
    id SERIAL PRIMARY KEY,
    ModuleName VARCHAR(250) NOT NULL UNIQUE
);
