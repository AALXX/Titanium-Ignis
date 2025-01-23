DROP TABLE IF EXISTS project_divisions;

CREATE TABLE
    project_divisions (
        id SERIAL PRIMARY KEY,
        ProjectToken VARCHAR(250) NOT NULL,
        DivisionName VARCHAR(250) NOT NULL,
        NumberOfMembers INT NOT NULL DEFAULT 0,
        UNIQUE (ProjectToken, DivisionName)
    );