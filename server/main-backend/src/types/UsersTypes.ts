type Resource = {
    id: number;
    name: string;
    description: string;
};

type Action = {
    id: number;
    name: string;
};

type Permission = {
    id: number;
    name: string;
    description: string;
    resourceId: number;
    actionId: number;
};

type Role = {
    id: number;
    name: string;
    description: string;
    level: number;
    category: RoleCategory;
};

type ProjectUserRole = {
    id: number;
    projectToken: string;
    userPrivateToken: string;
    roleId: number;
};

enum RoleCategory {
    PROJECT_MANAGEMENT = 'PROJECT_MANAGEMENT',
    TECHNICAL_LEADERSHIP = 'TECHNICAL_LEADERSHIP',
    DEVELOPMENT = 'DEVELOPMENT',
    QUALITY_ASSURANCE = 'QUALITY_ASSURANCE',
    SPECIALIZED = 'SPECIALIZED',
    STAKEHOLDER = 'STAKEHOLDER',
    DESIGN = 'DESIGN',
    SUPPORT = 'SUPPORT',
}
