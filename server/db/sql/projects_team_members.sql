CREATE TABLE
    projects_team_members (
        id SERIAL PRIMARY KEY,
        ProjectToken VARCHAR(250) NOT NULL,
        UserPrivateToken VARCHAR(250) NOT NULL REFERENCES users (UserPrivateToken),
        RoleId INTEGER NOT NULL REFERENCES roles (id),
        UNIQUE (ProjectToken, UserPrivateToken)
    );