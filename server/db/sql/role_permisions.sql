CREATE TABLE
    role_permissions (
        RoleId INTEGER NOT NULL REFERENCES roles (id),
        PermissionId INTEGER NOT NULL REFERENCES permissions (id),
        PRIMARY KEY (RoleID, PermissionId)
    );