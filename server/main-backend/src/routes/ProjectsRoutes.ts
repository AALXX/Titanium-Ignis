import express from 'express';
import { body, param } from 'express-validator';
import ProjectServices from '../services/ProjectsServices/ProjectsServices';
import { rbacMiddleware } from '../middlewares/RBAC_Middleware';

const router = express.Router();

router.get('/get-projects/:userSessionToken', param('userSessionToken').not().isEmpty(), ProjectServices.getAllProjects);

router.get('/get-project-data/:projectToken/:userSessionToken', rbacMiddleware('project', 'read'), param('projectToken').not().isEmpty(), ProjectServices.getProjectData);

router.get('/get-project-codebase-data/:projectToken/:userSessionToken', rbacMiddleware('code', 'create'), [param('projectToken').not().isEmpty()], ProjectServices.getProjectCodebaseData);

export = router;
