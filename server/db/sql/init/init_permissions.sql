INSERT INTO permissions (Name, Description, ResourceId, ActionId) 
SELECT p.pname, p.pdesc, r.id as ResourceId, a.id as ActionId
FROM (
    -- Project Management Permissions
    SELECT 'PROJECT_MANAGE' as pname, 'Manage project settings and configuration' as pdesc, 'project' as res, 'manage' as act UNION
    SELECT 'PROJECT_VIEW', 'View project details', 'project', 'read' UNION
    SELECT 'PROJECT_CREATE', 'Create new projects', 'project', 'create' UNION
    SELECT 'BUDGET_MANAGE', 'Manage project budget', 'budget', 'manage' UNION
    
    -- Technical Permissions
    SELECT 'ARCHITECTURE_MANAGE', 'Manage system architecture', 'architecture', 'manage' UNION
    SELECT 'CODE_WRITE', 'Write and commit code', 'code', 'create' UNION
    SELECT 'CODE_REVIEW', 'Review and approve code', 'code', 'approve' UNION
    SELECT 'CODE_DEPLOY', 'Deploy code to production', 'deployment', 'execute' UNION
    
    -- Security Permissions
    SELECT 'SECURITY_MANAGE', 'Manage security settings', 'security', 'manage' UNION
    SELECT 'SECURITY_AUDIT', 'Perform security audits', 'security', 'read' UNION
    
    -- Database Permissions
    SELECT 'DATABASE_MANAGE', 'Manage database settings', 'database', 'manage' UNION
    SELECT 'DATABASE_READ', 'Read database data', 'database', 'read' UNION
    
    -- API Permissions
    SELECT 'API_MANAGE', 'Manage API endpoints', 'api', 'manage' UNION
    SELECT 'API_READ', 'Access API endpoints', 'api', 'read' UNION
    
    -- UI Permissions
    SELECT 'UI_MANAGE', 'Manage UI components', 'ui', 'manage' UNION
    SELECT 'UI_DESIGN', 'Design UI components', 'ui', 'create' UNION
    
    -- Testing Permissions
    SELECT 'TEST_MANAGE', 'Manage test suites', 'test', 'manage' UNION
    SELECT 'TEST_EXECUTE', 'Execute tests', 'test', 'execute' UNION
    
    -- Infrastructure Permissions
    SELECT 'INFRASTRUCTURE_MANAGE', 'Manage infrastructure', 'infrastructure', 'manage' UNION
    SELECT 'CLOUD_MANAGE', 'Manage cloud resources', 'infrastructure', 'manage' UNION
    
    -- Documentation Permissions
    SELECT 'DOCUMENTATION_WRITE', 'Write documentation', 'documentation', 'create' UNION
    SELECT 'DOCUMENTATION_READ', 'Read documentation', 'documentation', 'read' UNION
    
    -- User Management Permissions
    SELECT 'USER_MANAGE', 'Manage user accounts', 'user', 'manage' UNION
    SELECT 'ROLE_MANAGE', 'Manage user roles', 'role', 'manage'
) p
JOIN resources r ON r.name = p.res
JOIN actions a ON a.name = p.act;