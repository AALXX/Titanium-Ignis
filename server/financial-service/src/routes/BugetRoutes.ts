import express from 'express';
import { body, param } from 'express-validator';
import BugetServices from '../services/BugetServices';
const router = express.Router();

// ============================================================================
// PROJECTS - Core project management routes
// ============================================================================

// Create project - requires project management permissions
router.post('/get -project-budget', [body('ProjectToken').not().isEmpty(), body('UserSessionToken').not().isEmpty()], BugetServices.GetProjectBudget);

export = router;
