import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from '../../utils/apiResponse.js';
import {
  listAdminFaculties,
  listAdminLorRequests,
  listAdminStudents,
  loginAdmin
} from '../../services/auth/auth.admin.service.js';

export const loginAdminController = asyncHandler(async (req, res) => {
  const result = await loginAdmin(req.validated.body);
  return ok(res, result, 'Admin login success');
});

export const listAdminStudentsController = asyncHandler(async (req, res) => {
  const result = await listAdminStudents();
  return ok(res, result, 'Students fetched');
});

export const listAdminFacultiesController = asyncHandler(async (req, res) => {
  const result = await listAdminFaculties();
  return ok(res, result, 'Faculties fetched');
});

export const listAdminLorRequestsController = asyncHandler(async (req, res) => {
  const result = await listAdminLorRequests();
  return ok(res, result, 'LOR requests fetched');
});
