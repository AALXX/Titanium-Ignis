INSERT INTO roles (Name, Description, Level, Category) VALUES
    -- Project Management (Levels 90-99)
    ('PROJECT_OWNER', 'Has full control over the project', 99, 'PROJECT_MANAGEMENT'),
    ('PROJECT_MANAGER', 'Manages project timelines and resources', 95, 'PROJECT_MANAGEMENT'),
    ('PRODUCT_MANAGER', 'Manages product vision and roadmap', 93, 'PROJECT_MANAGEMENT'),
    ('PROGRAM_MANAGER', 'Oversees multiple related projects', 94, 'PROJECT_MANAGEMENT'),
    
    -- Technical Leadership (Levels 80-89)
    ('CHIEF_TECHNICAL_OFFICER', 'High-level technical executive', 89, 'TECHNICAL_LEADERSHIP'),
    ('TECHNICAL_ARCHITECT', 'Technical design and architecture', 85, 'TECHNICAL_LEADERSHIP'),
    ('TEAM_LEAD', 'Development team leadership', 83, 'TECHNICAL_LEADERSHIP'),
    ('TECH_LEAD', 'Technical decision maker', 82, 'TECHNICAL_LEADERSHIP'),
    ('SECURITY_ARCHITECT', 'Security design and architecture', 84, 'TECHNICAL_LEADERSHIP'),
    ('SOLUTIONS_ARCHITECT', 'System design and architecture', 86, 'TECHNICAL_LEADERSHIP'),
    
    -- Development Roles (Levels 60-79)
    ('SENIOR_DEVELOPER', 'Senior development and design', 75, 'DEVELOPMENT'),
    ('DEVELOPER', 'General development', 70, 'DEVELOPMENT'),
    ('JUNIOR_DEVELOPER', 'Entry-level development', 65, 'DEVELOPMENT'),
    ('FULL_STACK_DEVELOPER', 'Full-stack development', 73, 'DEVELOPMENT'),
    ('FRONTEND_DEVELOPER', 'Frontend development', 70, 'DEVELOPMENT'),
    ('BACKEND_DEVELOPER', 'Backend development', 70, 'DEVELOPMENT'),
    ('MOBILE_DEVELOPER', 'Mobile app development', 70, 'DEVELOPMENT'),
    ('GAME_DEVELOPER', 'Game development', 70, 'DEVELOPMENT'),
    ('AI_ENGINEER', 'AI/ML development', 75, 'DEVELOPMENT'),
    ('DATA_ENGINEER', 'Data pipeline development', 73, 'DEVELOPMENT'),
    
    -- Quality Assurance (Levels 50-59)
    ('QA_LEAD', 'QA team leadership', 59, 'QUALITY_ASSURANCE'),
    ('QA_ENGINEER', 'Quality assurance testing', 55, 'QUALITY_ASSURANCE'),
    ('QA_AUTOMATION', 'Automated testing', 56, 'QUALITY_ASSURANCE'),
    ('PERFORMANCE_TESTER', 'Performance testing', 55, 'QUALITY_ASSURANCE'),
    ('SECURITY_TESTER', 'Security testing', 57, 'QUALITY_ASSURANCE'),
    
    -- Specialized Roles (Levels 40-49)
    ('UI_DESIGNER', 'UI design', 45, 'DESIGN'),
    ('UX_DESIGNER', 'UX design', 45, 'DESIGN'),
    ('GRAPHIC_DESIGNER', 'Graphic design', 43, 'DESIGN'),
    ('CONTENT_WRITER', 'Content creation', 42, 'SPECIALIZED'),
    ('DEVOPS_ENGINEER', 'DevOps and infrastructure', 48, 'SPECIALIZED'),
    ('DATABASE_ADMIN', 'Database administration', 47, 'SPECIALIZED'),
    ('CLOUD_ENGINEER', 'Cloud infrastructure', 47, 'SPECIALIZED'),
    ('DATA_SCIENTIST', 'Data analysis', 46, 'SPECIALIZED'),
    ('CYBERSECURITY_ANALYST', 'Security analysis', 48, 'SPECIALIZED'),
    ('TECHNICAL_SUPPORT', 'Technical support', 40, 'SUPPORT'),
    
    -- Stakeholder Roles (Levels 10-19)
    ('STAKEHOLDER', 'Project stakeholder', 19, 'STAKEHOLDER'),
    ('GUEST', 'Limited access', 10, 'STAKEHOLDER'),
    ('BUSINESS_ANALYST', 'Business analysis', 45, 'SPECIALIZED');