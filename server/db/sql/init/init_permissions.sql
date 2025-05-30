INSERT INTO permissions (Name, Description, ResourceId, ActionId)
SELECT
    p.pname,
    p.pdesc,
    r.id,
    a.id
FROM (
    SELECT 'PROJECT_MANAGE' AS pname, 'Manage project settings and configuration' AS pdesc, 'project' AS res, 'manage' AS act UNION
    SELECT 'PROJECT_VIEW', 'View project details', 'project', 'read' UNION
    SELECT 'PROJECT_CREATE', 'Create new projects', 'project', 'create' UNION
    SELECT 'BUDGET_MANAGE', 'Manage project budget', 'budget', 'manage' UNION

    -- Technical
    SELECT 'ARCHITECTURE_MANAGE', 'Manage system architecture', 'architecture', 'manage' UNION
    SELECT 'CODE_CREATE', 'Write and commit code', 'code', 'create' UNION
    SELECT 'CODE_REVIEW', 'Review and approve code', 'code', 'review' UNION
    SELECT 'CODE_DEPLOY', 'Deploy code to production', 'deployment', 'execute' UNION

    -- Tasks
    SELECT 'TASK_GROUP_CREATE', 'Create task groups', 'task_group', 'create' UNION
    SELECT 'TASK_GROUP_MANAGE', 'Manage task groups', 'task_group', 'manage' UNION
    SELECT 'TASK_CREATE', 'Create tasks', 'task', 'create' UNION
    SELECT 'TASK_MANAGE', 'Manage tasks', 'task', 'manage' UNION

    -- Security
    SELECT 'SECURITY_MANAGE', 'Manage security settings', 'security', 'manage' UNION
    SELECT 'SECURITY_AUDIT', 'Perform security audits', 'security', 'read' UNION

    -- Database
    SELECT 'DATABASE_MANAGE', 'Manage database settings', 'database', 'manage' UNION
    SELECT 'DATABASE_READ', 'Read database data', 'database', 'read' UNION

    -- API
    SELECT 'API_MANAGE', 'Manage API endpoints', 'api', 'manage' UNION
    SELECT 'API_READ', 'Access API endpoints', 'api', 'read' UNION

    -- UI
    SELECT 'UI_MANAGE', 'Manage UI components', 'ui', 'manage' UNION
    SELECT 'UI_CREATE', 'Design UI components', 'ui', 'create' UNION

    -- Testing
    SELECT 'TEST_MANAGE', 'Manage test suites', 'test', 'manage' UNION
    SELECT 'TEST_EXECUTE', 'Execute tests', 'test', 'execute' UNION

    -- Infrastructure
    SELECT 'INFRASTRUCTURE_MANAGE', 'Manage infrastructure', 'infrastructure', 'manage' UNION
    SELECT 'CLOUD_MANAGE', 'Manage cloud resources', 'cloud', 'manage' UNION

    -- Documentation
    SELECT 'DOCUMENTATION_CREATE', 'Write documentation', 'documentation', 'create' UNION
    SELECT 'DOCUMENTATION_READ', 'Read documentation', 'documentation', 'read' UNION

    -- Users
    SELECT 'USER_MANAGE', 'Manage user accounts', 'user', 'manage' UNION
    SELECT 'ROLE_MANAGE', 'Manage user roles', 'role', 'manage'
) p
JOIN resources r ON r.name = p.res
JOIN actions a ON a.name = p.act;
