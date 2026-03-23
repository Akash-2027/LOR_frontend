import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import roleMiddleware from '../middlewares/role.middleware.js';
import { ROLES } from '../config/constants.js';
import { loginAdminSchema } from '../validators/auth/auth.admin.schema.js';
import {
  listAdminFacultiesController,
  listAdminLorRequestsController,
  listAdminStudentsController,
  loginAdminController
} from '../controllers/auth/auth.admin.controller.js';

const router = Router();

router.post('/login', validate(loginAdminSchema), loginAdminController);
router.get('/students', authMiddleware, roleMiddleware(ROLES.ADMIN), listAdminStudentsController);
router.get('/faculties', authMiddleware, roleMiddleware(ROLES.ADMIN), listAdminFacultiesController);
router.get('/lor-requests', authMiddleware, roleMiddleware(ROLES.ADMIN), listAdminLorRequestsController);

export default router;
