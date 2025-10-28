INSERT INTO role_categories (name, description, priority) VALUES
    ('EXECUTIVE', 'Executive and leadership roles', 100),
    ('MANAGEMENT', 'Project and team management roles', 90),
    ('TECHNICAL_LEAD', 'Technical leadership and architecture', 80),
    ('DEVELOPMENT', 'Software development roles', 70),
    ('QUALITY', 'Quality assurance and testing', 60),
    ('DESIGN', 'UI/UX and design roles', 50),
    ('OPERATIONS', 'DevOps and infrastructure', 55),
    ('SPECIALIZED', 'Specialized technical roles', 45),
    ('SUPPORT', 'Support and documentation', 30),
    ('STAKEHOLDER', 'External stakeholders and viewers', 10);

-- Insert Actions
INSERT INTO actions (name, description) VALUES
    ('create', 'Create new resources'),
    ('read', 'View and read resources'),
    ('update', 'Modify existing resources'),
    ('delete', 'Remove resources'),
    ('manage', 'Full management access'),
    ('approve', 'Approve changes or requests'),
    ('execute', 'Execute operations or deployments'),
    ('review', 'Review and audit'),
    ('assign', 'Assign tasks or roles'),
    ('configure', 'Configure settings');

-- Insert Resources with categories
INSERT INTO resources (name, description, category) VALUES
    -- Core Resources
    ('project', 'Project management and settings', 'core'),
    ('user', 'User account management', 'core'),
    ('role', 'Role and permission management', 'core'),
    ('team', 'Team management', 'core'),
    
    -- Technical Resources
    ('code', 'Source code and repositories', 'technical'),
    ('architecture', 'System architecture and design', 'technical'),
    ('database', 'Database access and management', 'technical'),
    ('api', 'API endpoints and services', 'technical'),
    ('deployment', 'Code deployment and releases', 'technical'),
    ('infrastructure', 'Infrastructure and servers', 'technical'),
    ('security', 'Security settings and audits', 'technical'),
    
    -- Business Resources
    ('task', 'Task management', 'business'),
    ('task_group', 'Task group management', 'business'),
    ('budget', 'Budget and financial data', 'business'),
    ('analytics', 'Analytics and reporting', 'business'),
    ('documentation', 'Documentation and knowledge base', 'business'),
    
    -- Design Resources
    ('ui', 'User interface design', 'design'),
    ('content', 'Content and media', 'design'),
    
    -- Testing Resources
    ('test', 'Testing and quality assurance', 'testing'),
    
    -- Cloud Resources
    ('cloud', 'Cloud services and resources', 'cloud');

    -- Financial Resources
    ('financial', 'Financial and accounting data', 'financial');

-- Insert Roles with proper categorization
INSERT INTO roles (name, display_name, description, category_id, level, is_system_role) 
SELECT 
    r.name,
    r.display_name,
    r.description,
    rc.id,
    r.level,
    r.is_system_role
FROM (
    -- Executive Level (90-99)
    SELECT 'PROJECT_OWNER' as name, 'Project Owner' as display_name, 'Complete project ownership and control' as description, 'EXECUTIVE' as category, 99 as level, true as is_system_role UNION
    SELECT 'CTO', 'Chief Technology Officer', 'Technical executive leadership', 'EXECUTIVE', 95, false UNION
    SELECT 'CEO', 'Chief Executive Officer', 'Executive leadership', 'EXECUTIVE', 98, false UNION
    
    -- Management Level (80-89)
    SELECT 'PROJECT_MANAGER', 'Project Manager', 'Project planning and resource management', 'MANAGEMENT', 85, false UNION
    SELECT 'PRODUCT_MANAGER', 'Product Manager', 'Product strategy and roadmap', 'MANAGEMENT', 83, false UNION
    SELECT 'TEAM_LEAD', 'Team Lead', 'Team leadership and coordination', 'MANAGEMENT', 81, false UNION
    
    -- Technical Leadership (70-79)
    SELECT 'TECH_LEAD', 'Technical Lead', 'Technical decision making and architecture', 'TECHNICAL_LEAD', 78, false UNION
    SELECT 'SENIOR_ARCHITECT', 'Senior Architect', 'System architecture and design', 'TECHNICAL_LEAD', 76, false UNION
    SELECT 'SECURITY_ARCHITECT', 'Security Architect', 'Security architecture and compliance', 'TECHNICAL_LEAD', 74, false UNION
    
    -- Development (60-69)
    SELECT 'SENIOR_DEVELOPER', 'Senior Developer', 'Advanced development and mentoring', 'DEVELOPMENT', 68, false UNION
    SELECT 'DEVELOPER', 'Developer', 'Software development', 'DEVELOPMENT', 65, false UNION
    SELECT 'JUNIOR_DEVELOPER', 'Junior Developer', 'Entry-level development', 'DEVELOPMENT', 62, false UNION
    SELECT 'FULL_STACK_DEVELOPER', 'Full Stack Developer', 'Frontend and backend development', 'DEVELOPMENT', 66, false UNION
    
    -- Operations (55-59)
    SELECT 'DEVOPS_ENGINEER', 'DevOps Engineer', 'Infrastructure and deployment automation', 'OPERATIONS', 58, false UNION
    SELECT 'CLOUD_ENGINEER', 'Cloud Engineer', 'Cloud infrastructure management', 'OPERATIONS', 56, false UNION
    
    -- Quality Assurance (50-54)
    SELECT 'QA_LEAD', 'QA Lead', 'Quality assurance leadership', 'QUALITY', 54, false UNION
    SELECT 'QA_ENGINEER', 'QA Engineer', 'Testing and quality assurance', 'QUALITY', 52, false UNION
    SELECT 'AUTOMATION_ENGINEER', 'Automation Engineer', 'Test automation development', 'QUALITY', 53, false UNION
    
    -- Design (45-49)
    SELECT 'UX_DESIGNER', 'UX Designer', 'User experience design', 'DESIGN', 48, false UNION
    SELECT 'UI_DESIGNER', 'UI Designer', 'User interface design', 'DESIGN', 47, false UNION
    SELECT 'GRAPHIC_DESIGNER', 'Graphic Designer', 'Visual and graphic design', 'DESIGN', 45, false UNION
    
    -- Specialized (40-44)
    SELECT 'DATA_SCIENTIST', 'Data Scientist', 'Data analysis and machine learning', 'SPECIALIZED', 44, false UNION
    SELECT 'DATABASE_ADMIN', 'Database Administrator', 'Database management and optimization', 'SPECIALIZED', 42, false UNION
    SELECT 'SECURITY_ANALYST', 'Security Analyst', 'Security monitoring and analysis', 'SPECIALIZED', 43, false UNION
    
    -- Support (30-39)
    SELECT 'TECHNICAL_WRITER', 'Technical Writer', 'Documentation and technical writing', 'SUPPORT', 35, false UNION
    SELECT 'SUPPORT_ENGINEER', 'Support Engineer', 'Technical support and troubleshooting', 'SUPPORT', 32, false UNION
    
    -- Stakeholders (10-29)
    SELECT 'BUSINESS_ANALYST', 'Business Analyst', 'Business requirements and analysis', 'STAKEHOLDER', 25, false UNION
    SELECT 'STAKEHOLDER', 'Stakeholder', 'Project stakeholder with limited access', 'STAKEHOLDER', 15, false UNION
    SELECT 'GUEST', 'Guest', 'Read-only guest access', 'STAKEHOLDER', 10, true
) r
JOIN role_categories rc ON rc.name = r.category;

-- Create permissions using standardized naming (resource:action)
INSERT INTO permissions (name, display_name, description, resource_id, action_id)
SELECT 
    CONCAT(r.name, ':', a.name) as name,
    CONCAT(INITCAP(r.name), ' ', INITCAP(a.name)) as display_name,
    CONCAT(a.description, ' for ', r.description) as description,
    r.id as resource_id,
    a.id as action_id
FROM resources r
CROSS JOIN actions a
WHERE 
    -- Define which actions are valid for each resource category
    (r.category = 'core' AND a.name IN ('create', 'read', 'update', 'delete', 'manage', 'assign')) OR
    (r.category = 'technical' AND a.name IN ('create', 'read', 'update', 'delete', 'manage', 'execute', 'review', 'configure')) OR
    (r.category = 'business' AND a.name IN ('create', 'read', 'update', 'delete', 'manage', 'approve', 'assign')) OR
    (r.category = 'design' AND a.name IN ('create', 'read', 'update', 'delete', 'manage', 'review')) OR
    (r.category = 'testing' AND a.name IN ('create', 'read', 'update', 'execute', 'manage', 'review')) OR
    (r.category = 'cloud' AND a.name IN ('create', 'read', 'update', 'delete', 'manage', 'execute', 'configure'));

-- Create role inheritance relationships
INSERT INTO role_inheritance (parent_role_id, child_role_id)
SELECT p.id, c.id
FROM roles p, roles c
WHERE 
    (p.name = 'PROJECT_OWNER' AND c.name IN ('PROJECT_MANAGER', 'CTO')) OR
    (p.name = 'PROJECT_MANAGER' AND c.name IN ('TEAM_LEAD', 'PRODUCT_MANAGER')) OR
    (p.name = 'TECH_LEAD' AND c.name IN ('SENIOR_DEVELOPER', 'SENIOR_ARCHITECT')) OR
    (p.name = 'SENIOR_DEVELOPER' AND c.name IN ('DEVELOPER', 'FULL_STACK_DEVELOPER')) OR
    (p.name = 'QA_LEAD' AND c.name IN ('QA_ENGINEER', 'AUTOMATION_ENGINEER'));

-- Indexes for performance
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_projects_team_members_project ON projects_team_members(projecttoken);
CREATE INDEX idx_projects_team_members_user ON projects_team_members(userprivatetoken);
CREATE INDEX idx_projects_team_members_active ON projects_team_members(is_active) WHERE is_active = true;
CREATE INDEX idx_permissions_resource_action ON permissions(resource_id, action_id);
CREATE INDEX idx_rbac_audit_log_project_user ON rbac_audit_log(projecttoken, userprivatetoken);
CREATE INDEX idx_rbac_audit_log_created_at ON rbac_audit_log(created_at);
