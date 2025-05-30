CREATE TABLE projects_team_members (
    id SERIAL PRIMARY KEY,
    projecttoken VARCHAR(250) NOT NULL,
    userprivatetoken VARCHAR(250) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    divisionid INTEGER REFERENCES project_divisions(id),
    assigned_by VARCHAR(250), -- Who assigned this role
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(projecttoken, userprivatetoken)
);