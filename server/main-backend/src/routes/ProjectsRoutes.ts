import express from 'express';
import { body, param } from 'express-validator';
import ProjectServices from '../services/ProjectsServices/ProjectsServices';

const router = express.Router();

router.get('/get-projects/:userPrivateToken', param("userPrivateToken").not().isEmpty(), ProjectServices.getAllProjects);


export = router;
 
