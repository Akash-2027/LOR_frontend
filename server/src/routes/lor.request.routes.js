import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import roleMiddleware from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { ROLES } from '../config/constants.js';
import {
  createStudentLorRequestSchema,
  updateFacultyLorRequestStatusSchema
} from '../validators/lor/lor.request.schema.js';
import {
  createStudentLorRequestController,
  downloadStudentLorLetterController,
  getApprovedFacultyController,
  listFacultyLorRequestsController,
  listStudentLorRequestsController,
  previewFacultyLorLetterController,
  updateFacultyLorRequestStatusController
} from '../controllers/lor/lor.request.controller.js';

const router = Router();

router.get('/faculty-list', authMiddleware, getApprovedFacultyController);

router.post(
  '/student/requests',
  authMiddleware,
  roleMiddleware(ROLES.STUDENT),
  validate(createStudentLorRequestSchema),
  createStudentLorRequestController
);

router.get('/student/requests', authMiddleware, roleMiddleware(ROLES.STUDENT), listStudentLorRequestsController);

router.get(
  '/student/requests/:requestId/letter',
  authMiddleware,
  roleMiddleware(ROLES.STUDENT),
  downloadStudentLorLetterController
);

router.get('/faculty/requests', authMiddleware, roleMiddleware(ROLES.FACULTY), listFacultyLorRequestsController);

router.get(
  '/faculty/requests/:requestId/preview',
  authMiddleware,
  roleMiddleware(ROLES.FACULTY),
  previewFacultyLorLetterController
);

router.patch(
  '/faculty/requests/:requestId/status',
  authMiddleware,
  roleMiddleware(ROLES.FACULTY),
  validate(updateFacultyLorRequestStatusSchema),
  updateFacultyLorRequestStatusController
);

export default router;
