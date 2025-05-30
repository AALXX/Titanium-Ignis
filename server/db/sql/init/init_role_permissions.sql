INSERT INTO
    role_permissions (RoleId, PermissionId)
SELECT
    r.id as RoleId,
    p.id as PermissionId
FROM
    roles r
    CROSS JOIN permissions p
WHERE
    -- PROJECT_OWNER gets all permissions
    (r.name = 'PROJECT_OWNER')
    OR
    -- PROJECT_MANAGER permissions
    (
        r.name = 'PROJECT_MANAGER'
        AND p.name IN (
            'PROJECT_MANAGE',
            'PROJECT_VIEW',
            'PROJECT_CREATE',
            'BUDGET_MANAGE',
            'USER_MANAGE',
            'DOCUMENTATION_CREATE',
            'DOCUMENTATION_READ',
            'TASK_CREATE',
            'TASK_MANAGE'
        )
    )
    OR
    -- PRODUCT_MANAGER permissions
    (
        r.name = 'PRODUCT_MANAGER'
        AND p.name IN (
            'PROJECT_VIEW',
            'PROJECT_CREATE',
            'UI_MANAGE',
            'DOCUMENTATION_CREATE',
            'DOCUMENTATION_READ',
            'TASK_CREATE',
            'TASK_MANAGE'
        )
    )
    OR
    -- CHIEF_TECHNICAL_OFFICER permissions
    (
        r.name = 'CHIEF_TECHNICAL_OFFICER'
        AND p.name IN (
            'ARCHITECTURE_MANAGE',
            'SECURITY_MANAGE',
            'INFRASTRUCTURE_MANAGE',
            'CODE_REVIEW',
            'DATABASE_MANAGE',
            'API_MANAGE',
            'CLOUD_MANAGE',
            'TASK_CREATE',
            'TASK_MANAGE'
        )
    )
    OR
    -- TECHNICAL_ARCHITECT permissions
    (
        r.name = 'TECHNICAL_ARCHITECT'
        AND p.name IN (
            'ARCHITECTURE_MANAGE',
            'CODE_REVIEW',
            'DATABASE_MANAGE',
            'API_MANAGE',
            'INFRASTRUCTURE_MANAGE',
            'TASK_CREATE',
            'TASK_MANAGE'
        )
    )
    OR
    -- SECURITY_ARCHITECT permissions
    (
        r.name = 'SECURITY_ARCHITECT'
        AND p.name IN (
            'TASK_CREATE',
            'TASK_MANAGE',
            'SECURITY_MANAGE',
            'SECURITY_AUDIT',
            'CODE_REVIEW'
        )
    )
    OR
    -- SENIOR_DEVELOPER permissions
    (
        r.name = 'SENIOR_DEVELOPER'
        AND p.name IN (
            'CODE_CREATE',
            'CODE_REVIEW',
            'DATABASE_READ',
            'API_READ',
            'DOCUMENTATION_CREATE'
        )
    )
    OR
    -- DEVELOPER permissions
    (
        r.name = 'DEVELOPER'
        AND p.name IN (
            'CODE_CREATE',
            'DATABASE_READ',
            'API_READ',
            'DOCUMENTATION_READ'
        )
    )
    OR
    -- QA_LEAD permissions
    (
        r.name = 'QA_LEAD'
        AND p.name IN (
            'TEST_MANAGE',
            'TEST_EXECUTE',
            'DOCUMENTATION_CREATE',
            'TASK_CREATE',
            'TASK_MANAGE'
        )
    )
    OR
    -- QA_ENGINEER permissions
    (
        r.name = 'QA_ENGINEER'
        AND p.name IN ('TEST_EXECUTE', 'DOCUMENTATION_READ')
    )
    OR
    -- DEVOPS_ENGINEER permissions
    (
        r.name = 'DEVOPS_ENGINEER'
        AND p.name IN (
            'INFRASTRUCTURE_MANAGE',
            'CODE_DEPLOY',
            'CLOUD_MANAGE'
        )
    )
    OR
    -- UI_DESIGNER permissions
    (
        r.name = 'UI_DESIGNER'
        AND p.name IN ('UI_CREATE', 'UI_MANAGE', 'DOCUMENTATION_READ')
    )
    OR
    -- DATABASE_ADMIN permissions
    (
        r.name = 'DATABASE_ADMIN'
        AND p.name IN ('DATABASE_MANAGE', 'DATABASE_READ')
    )
    OR
    -- STAKEHOLDER permissions
    (
        r.name = 'STAKEHOLDER'
        AND p.name IN ('PROJECT_VIEW', 'DOCUMENTATION_READ')
    )
    OR
    -- GUEST permissions
    (
        r.name = 'GUEST'
        AND p.name IN ('PROJECT_VIEW')
    );
