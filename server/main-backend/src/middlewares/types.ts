// RBAC Types and Interfaces

export interface UserRole {
    name: string;
    displayName: string;
    level: number;
}

export interface Permission {
    id: number;
    name: string;
    displayName: string;
    description: string;
    resourceId: number;
    actionId: number;
    isSystemPermission: boolean;
}

export interface Role {
    id: number;
    name: string;
    displayName: string;
    description: string;
    categoryId: number;
    level: number;
    isSystemRole: boolean;
    isActive: boolean;
}

export interface Resource {
    id: number;
    name: string;
    description: string;
    category: string;
}

export interface Action {
    id: number;
    name: string;
    description: string;
}

export interface RoleCategory {
    id: number;
    name: string;
    description: string;
    priority: number;
}

export interface ProjectTeamMember {
    id: number;
    projecttoken: string;
    userprivatetoken: string;
    roleId: number;
    divisionId?: number;
    assignedBy?: string;
    assignedAt: Date;
    isActive: boolean;
}

export interface RolePermission {
    id: number;
    roleId: number;
    permissionId: number;
    grantedBy?: number;
    grantedAt: Date;
}

export interface RoleInheritance {
    id: number;
    parentRoleId: number;
    childRoleId: number;
    createdAt: Date;
}

export interface RBACRequest extends Request {
    userRole?: UserRole;
    userPermissions?: Permission[];
}

export interface AuditLogEntry {
    id: number;
    projecttoken?: string;
    userprivatetoken?: string;
    actionType: string;
    oldRoleId?: number;
    newRoleId?: number;
    permissionId?: number;
    performedBy?: string;
    reason?: string;
    createdAt: Date;
}

// Enums for better type safety
export enum ResourceType {
    PROJECT = 'project',
    USER = 'user',
    ROLE = 'role',
    TEAM = 'team',
    CODE = 'code',
    ARCHITECTURE = 'architecture',
    DATABASE = 'database',
    API = 'api',
    DEPLOYMENT = 'deployment',
    INFRASTRUCTURE = 'infrastructure',
    SECURITY = 'security',
    TASK = 'task',
    TASK_GROUP = 'task_group',
    BUDGET = 'budget',
    ANALYTICS = 'analytics',
    DOCUMENTATION = 'documentation',
    UI = 'ui',
    CONTENT = 'content',
    TEST = 'test',
    CLOUD = 'cloud'
}

export enum ActionType {
    CREATE = 'create',
    READ = 'read',
    UPDATE = 'update',
    DELETE = 'delete',
    MANAGE = 'manage',
    APPROVE = 'approve',
    EXECUTE = 'execute',
    REVIEW = 'review',
    ASSIGN = 'assign',
    CONFIGURE = 'configure'
}

export enum RoleName {
    PROJECT_OWNER = 'PROJECT_OWNER',
    CTO = 'CTO',
    CEO = 'CEO',
    PROJECT_MANAGER = 'PROJECT_MANAGER',
    PRODUCT_MANAGER = 'PRODUCT_MANAGER',
    TEAM_LEAD = 'TEAM_LEAD',
    TECH_LEAD = 'TECH_LEAD',
    SENIOR_ARCHITECT = 'SENIOR_ARCHITECT',
    SECURITY_ARCHITECT = 'SECURITY_ARCHITECT',
    SENIOR_DEVELOPER = 'SENIOR_DEVELOPER',
    DEVELOPER = 'DEVELOPER',
    JUNIOR_DEVELOPER = 'JUNIOR_DEVELOPER',
    FULL_STACK_DEVELOPER = 'FULL_STACK_DEVELOPER',
    DEVOPS_ENGINEER = 'DEVOPS_ENGINEER',
    CLOUD_ENGINEER = 'CLOUD_ENGINEER',
    QA_LEAD = 'QA_LEAD',
    QA_ENGINEER = 'QA_ENGINEER',
    AUTOMATION_ENGINEER = 'AUTOMATION_ENGINEER',
    UX_DESIGNER = 'UX_DESIGNER',
    UI_DESIGNER = 'UI_DESIGNER',
    GRAPHIC_DESIGNER = 'GRAPHIC_DESIGNER',
    DATA_SCIENTIST = 'DATA_SCIENTIST',
    DATABASE_ADMIN = 'DATABASE_ADMIN',
    SECURITY_ANALYST = 'SECURITY_ANALYST',
    TECHNICAL_WRITER = 'TECHNICAL_WRITER',
    SUPPORT_ENGINEER = 'SUPPORT_ENGINEER',
    BUSINESS_ANALYST = 'BUSINESS_ANALYST',
    STAKEHOLDER = 'STAKEHOLDER',
    GUEST = 'GUEST'
}

export enum RoleCategoryName {
    EXECUTIVE = 'EXECUTIVE',
    MANAGEMENT = 'MANAGEMENT',
    TECHNICAL_LEAD = 'TECHNICAL_LEAD',
    DEVELOPMENT = 'DEVELOPMENT',
    QUALITY = 'QUALITY',
    DESIGN = 'DESIGN',
    OPERATIONS = 'OPERATIONS',
    SPECIALIZED = 'SPECIALIZED',
    SUPPORT = 'SUPPORT',
    STAKEHOLDER = 'STAKEHOLDER'
}

export enum AuditActionType {
    ROLE_ASSIGNED = 'role_assigned',
    ROLE_REMOVED = 'role_removed',
    PERMISSION_GRANTED = 'permission_granted',
    PERMISSION_REVOKED = 'permission_revoked',
    ROLE_UPDATED = 'role_updated',
    PERMISSION_CHECK = 'permission_check',
    ACCESS_DENIED = 'access_denied',
    USER_ADDED = 'user_added',
    USER_REMOVED = 'user_removed'
}

// Helper type for permission checking
export type PermissionString = `${ResourceType}:${ActionType}`;

// Constants for role levels
export const ROLE_LEVELS = {
    GUEST: 10,
    STAKEHOLDER: 15,
    BUSINESS_ANALYST: 25,
    SUPPORT_ENGINEER: 32,
    TECHNICAL_WRITER: 35,
    SECURITY_ANALYST: 43,
    DATABASE_ADMIN: 42,
    DATA_SCIENTIST: 44,
    GRAPHIC_DESIGNER: 45,
    UI_DESIGNER: 47,
    UX_DESIGNER: 48,
    QA_ENGINEER: 52,
    AUTOMATION_ENGINEER: 53,
    QA_LEAD: 54,
    CLOUD_ENGINEER: 56,
    DEVOPS_ENGINEER: 58,
    JUNIOR_DEVELOPER: 62,
    DEVELOPER: 65,
    FULL_STACK_DEVELOPER: 66,
    SENIOR_DEVELOPER: 68,
    SECURITY_ARCHITECT: 74,
    SENIOR_ARCHITECT: 76,
    TECH_LEAD: 78,
    TEAM_LEAD: 81,
    PRODUCT_MANAGER: 83,
    PROJECT_MANAGER: 85,
    CTO: 95,
    CEO: 98,
    PROJECT_OWNER: 99
} as const;
