import express from 'express';
import { body, param } from 'express-validator';
import ProjectServices from '../services/ProjectsServices/ProjectsServices';
import ProjectCodeBaseServices from '../services/ProjectsServices/ProjectCodeBaseServices';
import ProjectTeamManagementServices from '../services/ProjectsServices/ProjectTeamManagementServices';
import ProjectTaskManagementServices from '../services/ProjectsServices/ProjectTaskManagementServices';
import { rbacMiddleware } from '../middlewares/RBAC_Middleware';

const router = express.Router();

router.get('/get-projects/:userSessionToken', param('userSessionToken').not().isEmpty(), ProjectServices.getAllProjects);

router.get('/get-project-data/:projectToken/:userSessionToken', rbacMiddleware('project', 'read'), [param('projectToken').not().isEmpty()], ProjectServices.getProjectData);

router.get('/get-project-codebase-data/:projectToken/:userSessionToken', rbacMiddleware('code', 'create'), [param('projectToken').not().isEmpty()], ProjectCodeBaseServices.getProjectCodebaseData);

router.get('/get-project-team-data/:projectToken/:userSessionToken', rbacMiddleware('project', 'manage'), [param('projectToken').not().isEmpty()], ProjectTeamManagementServices.getProjectTeamData);

router.post(
    '/add-team-member',
    rbacMiddleware('project', 'manage'),
    [body('projectToken').not().isEmpty(), body('email').not().isEmpty(), body('role').not().isEmpty(), body('userSessionToken').not().isEmpty()],
    ProjectTeamManagementServices.addTeamMember,
);

router.post(
    '/remove-member',
    rbacMiddleware('project', 'manage'),
    [body('projectToken').not().isEmpty(), body('memberPublicToken').not().isEmpty(), body('userSessionToken').not().isEmpty()],
    ProjectTeamManagementServices.removeTeamMember,
);

router.post(
    '/change-member-role',
    rbacMiddleware('project', 'manage'),
    [body('projectToken').not().isEmpty(), body('memberPublicToken').not().isEmpty(), body('newRoleName').not().isEmpty(), body('userSessionToken').not().isEmpty()],
    ProjectTeamManagementServices.changeMemberRole,
);

router.post(
    '/create-division',
    rbacMiddleware('project', 'manage'),
    [body('projectToken').not().isEmpty(), body('divisionName').not().isEmpty(), body('userSessionToken').not().isEmpty()],
    ProjectTeamManagementServices.createDivision,
);

router.get('/get-all-divisions/:projectToken', [param('projectToken').not().isEmpty()], ProjectTeamManagementServices.getAllDivisions);

router.post(
    '/create-task-banner',
    rbacMiddleware('task_banner', 'create'),
    [body('projectToken').not().isEmpty(), body('departmentAssignmentToId').not().isEmpty(), body('taskBannerName').not().isEmpty(), body('userSessionToken').not().isEmpty()],
    ProjectTaskManagementServices.createTaskBanner,
);

router.get('/get-project-task-banners/:projectToken/:userSessionToken', rbacMiddleware('task_banner', 'manage'), [param('projectToken').not().isEmpty()], ProjectTaskManagementServices.getAllTaskBanners);

router.post('/delete-banner', rbacMiddleware('task_banner', 'manage'), [body('bannerToken').not().isEmpty(), body('userSessionToken').not().isEmpty()], ProjectTaskManagementServices.deleteBanner);


export = router;
