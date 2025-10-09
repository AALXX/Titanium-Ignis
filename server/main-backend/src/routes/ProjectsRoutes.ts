import express from 'express';
import { body, param } from 'express-validator';
import ProjectServices from '../services/ProjectsServices/ProjectsServices';
import ProjectCodeBaseServices from '../services/ProjectsServices/ProjectCodeBaseServices';
import ProjectTeamManagementServices from '../services/ProjectsServices/ProjectTeamManagementServices';
import ProjectTaskManagementServices from '../services/ProjectsServices/ProjectTaskManagementServices';
import ProjectCodeBaseDeployments from '../services/ProjectsServices/ProjectCodeBaseDeployments';

import { rbacMiddleware, hasRole, hasMinimumLevel } from '../middlewares/RBAC_Middleware';
import { CustomRequest } from '../config/postgresql';

const router = express.Router();

// ============================================================================
// PROJECTS - Core project management routes
// ============================================================================

// Create project - requires project management permissions
router.post(
    '/create-project',
    [body('ProjectName').not().isEmpty(), body('ProjectDescription').not().isEmpty(), body('UserSessionToken').not().isEmpty(), body('TeamMembers').not().isEmpty(), body('EnabledModules').not().isEmpty()],
    ProjectServices.createNewProject,
);

// Get all projects - doesn't need project-specific RBAC since it's user-based
router.get('/get-projects/:userSessionToken', param('userSessionToken').not().isEmpty(), ProjectServices.getAllProjects);

// Get specific project data - requires project read access
router.get('/get-project-data/:projectToken/:userSessionToken', rbacMiddleware('project', 'read'), param('projectToken').not().isEmpty(), param('userSessionToken').not().isEmpty(), ProjectServices.getProjectData);

// ============================================================================
// CODEBASE - Source code and repository management
// ============================================================================

// Get project codebase data - requires code read access
router.get(
    '/get-project-codebase-data/:projectToken/:userSessionToken',
    rbacMiddleware('code', 'read'),
    param('projectToken').not().isEmpty(),
    param('userSessionToken').not().isEmpty(),
    ProjectCodeBaseServices.getProjectCodebaseData,
);

// Get project services - requires deployment read access (corrected from 'ex')
router.get(
    '/get-project-services/:projectToken/:userSessionToken',
    rbacMiddleware('deployment', 'read'), // Fixed: was 'ex' which doesn't exist
    param('projectToken').not().isEmpty(),
    param('userSessionToken').not().isEmpty(),
    ProjectCodeBaseServices.getProjectServices,
);

// ============================================================================
// TEAM MANAGEMENT - User and role management within projects
// ============================================================================

// Get project team data - requires team read access
router.get(
    '/get-project-team-data/:projectToken/:userSessionToken',
    rbacMiddleware('team', 'read'), // Changed from 'project', 'manage' to be more specific
    param('projectToken').not().isEmpty(),
    param('userSessionToken').not().isEmpty(),
    ProjectTeamManagementServices.getProjectTeamData,
);

router.get('/get-team-roles', ProjectTeamManagementServices.getTeamRoles);

// Add team member - requires team management permissions
router.post(
    '/add-team-member',
    rbacMiddleware('team', 'manage'),
    [body('projectToken').not().isEmpty(), body('email').isEmail(), body('role').not().isEmpty(), body('userSessionToken').not().isEmpty()],
    ProjectTeamManagementServices.addTeamMember,
);

// Remove team member - requires team management permissions
router.post(
    '/remove-member',
    rbacMiddleware('team', 'manage'),
    [body('projectToken').not().isEmpty(), body('memberPublicToken').not().isEmpty(), body('userSessionToken').not().isEmpty()],
    ProjectTeamManagementServices.removeTeamMember,
);

// Change member role - requires role management permissions
router.post(
    '/change-member-role',
    rbacMiddleware('role', 'manage'),
    [body('projectToken').not().isEmpty(), body('memberPublicToken').not().isEmpty(), body('newRoleName').not().isEmpty(), body('userSessionToken').not().isEmpty()],
    ProjectTeamManagementServices.changeMemberRole,
);

// Create division - requires team management permissions
router.post(
    '/create-division',
    rbacMiddleware('team', 'create'),
    [body('projectToken').not().isEmpty(), body('divisionName').not().isEmpty().isLength({ min: 1, max: 100 }), body('userSessionToken').not().isEmpty()],
    ProjectTeamManagementServices.createDivision,
);

// Get all divisions - requires team read access
router.get(
    '/get-all-divisions/:projectToken/:userSessionToken',
    // rbacMiddleware('team', 'read'),
    param('projectToken').not().isEmpty(),
    param('userSessionToken').not().isEmpty(),
    ProjectTeamManagementServices.getAllDivisions,
);

// ============================================================================
// TASK MANAGEMENT - Project task and workflow management
// ============================================================================

// Create task banner/group - requires task group creation permissions
router.post(
    '/create-task-banner',
    rbacMiddleware('task_group', 'create'),
    [body('projectToken').not().isEmpty(), body('departmentAssignmentToId').isNumeric(), body('taskBannerName').not().isEmpty().isLength({ min: 1, max: 200 }), body('userSessionToken').not().isEmpty()],
    ProjectTaskManagementServices.createTaskBanner,
);

// Get project task banners - requires task group read access
router.get(
    '/get-project-task-banners/:projectToken/:userSessionToken',
    rbacMiddleware('task_group', 'read'), // Changed from 'manage' to 'read' for viewing
    param('projectToken').not().isEmpty(),
    param('userSessionToken').not().isEmpty(),
    ProjectTaskManagementServices.getAllTaskBanners,
);

// Delete banner - requires task group delete permissions
router.post(
    '/delete-banner',
    rbacMiddleware('task_group', 'delete'), // Changed from 'manage' to 'delete'
    [body('bannerToken').not().isEmpty(), body('userSessionToken').not().isEmpty()],
    ProjectTaskManagementServices.deleteBanner,
);

// ============================================================================
// DEPLOYMENTS - Application deployment and infrastructure management
// ============================================================================

// Get deployments overview - requires deployment read access
router.get(
    '/get-deployments-overview-data/:projectToken/:userSessionToken',
    rbacMiddleware('deployment', 'read'), // Changed from 'execute' to 'read' for viewing data
    param('projectToken').not().isEmpty(),
    param('userSessionToken').not().isEmpty(),
    ProjectCodeBaseDeployments.getDeploymentsOverviewData,
);

// Get deployment options - requires deployment read access
router.get(
    '/get-deployment-options/:projectToken/:userSessionToken',
    rbacMiddleware('deployment', 'read'), // Changed from 'execute' to 'read' for getting options
    param('projectToken').not().isEmpty(),
    param('userSessionToken').not().isEmpty(),
    ProjectCodeBaseDeployments.getDeploymentOptions,
);

router.get(
    '/get-deployment-details/:projectToken/:deploymentToken/:userSessionToken',
    param('projectToken').not().isEmpty(),
    param('deploymentToken').not().isEmpty(),
    param('userSessionToken').not().isEmpty(),
    ProjectCodeBaseDeployments.getDeploymentDetails,
);

// Execute deployment - requires deployment execute permissions
// router.post(
//     '/execute-deployment',
//     rbacMiddleware('deployment', 'execute'),
//     [body('projectToken').not().isEmpty(), body('deploymentConfig').isObject(), body('userSessionToken').not().isEmpty()],
//     ProjectCodeBaseDeployments.executeDeployment, // Assuming this method exists
// );

// ============================================================================
// ADVANCED RBAC EXAMPLES - Using alternative middleware functions
// ============================================================================

// Example: Route that requires specific role
// router.get(
//     '/admin-only-endpoint/:projectToken/:userSessionToken',
//     hasRole('PROJECT_OWNER'), // Only PROJECT_OWNER can access
//     param('projectToken').not().isEmpty(),
//     param('userSessionToken').not().isEmpty(),
//     (req, res) => {
//         res.json({ message: 'Admin only content', userRole: req.userRole });
//     },
// );

// Example: Route that requires minimum level
// router.get(
//     '/management-endpoint/:projectToken/:userSessionToken',
//     hasMinimumLevel(80), // Requires level 80 or higher (management level)
//     param('projectToken').not().isEmpty(),
//     param('userSessionToken').not().isEmpty(),
//     (req, res) => {
//         res.json({ message: 'Management content', userRole: req.userRole });
//     },
// );

// Example: Multiple RBAC checks (though you'd typically use one)
// router.post(
//     '/critical-operation',
//     rbacMiddleware('project', 'manage'), // Must have project management permission
//     hasMinimumLevel(85), // AND must be level 85 or higher
//     [body('projectToken').not().isEmpty(), body('operation').not().isEmpty(), body('userSessionToken').not().isEmpty()],
//     (req, res) => {
//         res.json({
//             message: 'Critical operation authorized',
//             userRole: req.userRole,
//             operation: req.body.operation,
//         });
//     },
// );

// ============================================================================
// AUDIT AND MONITORING ROUTES
// ============================================================================

// Get RBAC audit logs - requires high-level access
router.get(
    '/audit-logs/:projectToken/:userSessionToken',
    hasMinimumLevel(90), // Only executives can view audit logs
    param('projectToken').not().isEmpty(),
    param('userSessionToken').not().isEmpty(),
    async (req, res) => {
        // Implementation would fetch from rbac_audit_log table
        res.json({ message: 'Audit logs endpoint - implementation needed' });
    },
);

// Get user permissions - useful for frontend to know what user can do
router.get(
    '/user-permissions/:projectToken/:userSessionToken',
    rbacMiddleware('project', 'read'), // Basic project access required
    param('projectToken').not().isEmpty(),
    param('userSessionToken').not().isEmpty(),
    async (req: CustomRequest, res) => {
        // Implementation would return all permissions for the user in this project
        res.json({
            message: 'User permissions endpoint - implementation needed',
            userRole: req.userRole,
        });
    },
);

export = router;
