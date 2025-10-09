INSERT INTO roles (name, display_name, description, category_id, level)
VALUES
-- Project Management (Levels 90-99)
('PROJECT_OWNER', 'Project Owner', 'Has full control over the project', 1, 99),
('PROJECT_MANAGER', 'Project Manager', 'Manages project timelines and resources', 1, 95),
('PRODUCT_MANAGER', 'Product Manager', 'Manages product vision and roadmap', 1, 93),
('PROGRAM_MANAGER', 'Program Manager', 'Oversees multiple related projects', 1, 94),

-- Technical Leadership (Levels 80-89)
('CHIEF_TECHNICAL_OFFICER', 'Chief Technical Officer', 'High-level technical executive', 2, 89),
('TECHNICAL_ARCHITECT', 'Technical Architect', 'Technical design and architecture', 2, 85),
('TEAM_LEAD', 'Team Lead', 'Development team leadership', 2, 83),
('TECH_LEAD', 'Tech Lead', 'Technical decision maker', 2, 82),
('SECURITY_ARCHITECT', 'Security Architect', 'Security design and architecture', 2, 84),
('SOLUTIONS_ARCHITECT', 'Solutions Architect', 'System design and architecture', 2, 86),

-- Development Roles (Levels 60-79)
('SENIOR_DEVELOPER', 'Senior Developer', 'Senior development and design', 3, 75),
('DEVELOPER', 'Developer', 'General development', 3, 70),
('JUNIOR_DEVELOPER', 'Junior Developer', 'Entry-level development', 3, 65),
('FULL_STACK_DEVELOPER', 'Full Stack Developer', 'Full-stack development', 3, 73),
('FRONTEND_DEVELOPER', 'Frontend Developer', 'Frontend development', 3, 70),
('BACKEND_DEVELOPER', 'Backend Developer', 'Backend development', 3, 70),
('MOBILE_DEVELOPER', 'Mobile Developer', 'Mobile app development', 3, 70),
('GAME_DEVELOPER', 'Game Developer', 'Game development', 3, 70),
('AI_ENGINEER', 'AI Engineer', 'AI/ML development', 3, 75),
('DATA_ENGINEER', 'Data Engineer', 'Data pipeline development', 3, 73),

-- Quality Assurance (Levels 50-59)
('QA_LEAD', 'QA Lead', 'QA team leadership', 4, 59),
('QA_ENGINEER', 'QA Engineer', 'Quality assurance testing', 4, 55),
('QA_AUTOMATION', 'QA Automation', 'Automated testing', 4, 56),
('PERFORMANCE_TESTER', 'Performance Tester', 'Performance testing', 4, 55),
('SECURITY_TESTER', 'Security Tester', 'Security testing', 4, 57),

-- Specialized Roles (Levels 40-49)
('UI_DESIGNER', 'UI Designer', 'UI design', 5, 45),
('UX_DESIGNER', 'UX Designer', 'UX design', 5, 45),
('GRAPHIC_DESIGNER', 'Graphic Designer', 'Graphic design', 5, 43),
('CONTENT_WRITER', 'Content Writer', 'Content creation', 6, 42),
('DEVOPS_ENGINEER', 'DevOps Engineer', 'DevOps and infrastructure', 6, 48),
('DATABASE_ADMIN', 'Database Admin', 'Database administration', 6, 47),
('CLOUD_ENGINEER', 'Cloud Engineer', 'Cloud infrastructure', 6, 47),
('DATA_SCIENTIST', 'Data Scientist', 'Data analysis', 6, 46),
('CYBERSECURITY_ANALYST', 'Cybersecurity Analyst', 'Security analysis', 6, 48),
('TECHNICAL_SUPPORT', 'Technical Support', 'Technical support', 7, 40),

-- Stakeholder Roles (Levels 10-19)
('STAKEHOLDER', 'Stakeholder', 'Project stakeholder', 8, 19),
('GUEST', 'Guest', 'Limited access', 8, 10),
('BUSINESS_ANALYST', 'Business Analyst', 'Business analysis', 6, 45);
