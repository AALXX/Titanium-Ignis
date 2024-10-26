import express from 'express';
import { body, param } from 'express-validator';
import ProjectServices from '../services/ProjectsServices/ProjectsServices';

const router = express.Router();

router.get('/get-projects/:userSessionToken', param('userSessionToken').not().isEmpty(), ProjectServices.getAllProjects);
router.get('/get-project-data/:projectToken', param('projectToken').not().isEmpty(), ProjectServices.getProjectData);

export = router;
