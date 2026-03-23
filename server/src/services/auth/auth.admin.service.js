import Admin from '../../models/user.admin.model.js';
import Student from '../../models/user.student.model.js';
import Faculty from '../../models/user.faculty.model.js';
import LorRequest from '../../models/lor.request.model.js';
import { hashPassword, comparePassword } from './password.service.js';
import { signToken } from './token.service.js';
import { sanitizeUser } from '../../utils/sanitize.js';

export const ensureAdminAccount = async ({ name, email, password }) => {
  const existing = await Admin.findOne({ email });
  if (existing) {
    return existing;
  }

  const passwordHash = await hashPassword(password);
  const admin = await Admin.create({ name, email, passwordHash });
  return admin;
};

export const loginAdmin = async ({ email, password }) => {
  const admin = await Admin.findOne({ email });
  if (!admin) {
    throw new Error('Invalid credentials');
  }

  const match = await comparePassword(password, admin.passwordHash);
  if (!match) {
    throw new Error('Invalid credentials');
  }

  const token = signToken({ id: admin._id, role: admin.role, email: admin.email });
  return { admin: sanitizeUser(admin), token };
};

export const listAdminStudents = async () => {
  return Student.find({})
    .select('name email enrollment mobile role isActive createdAt updatedAt')
    .sort({ createdAt: -1 });
};

export const listAdminFaculties = async () => {
  return Faculty.find({})
    .populate('approvedBy', 'name email')
    .select('name email collegeEmail department mobile approvalStatus approvedBy role isActive createdAt updatedAt')
    .sort({ createdAt: -1 });
};

export const listAdminLorRequests = async () => {
  return LorRequest.find({})
    .populate('studentId', 'name email enrollment')
    .populate('facultyId', 'name email collegeEmail department')
    .select('studentId facultyId purpose targetUniversity program dueDate status facultyRemark documentType documentName createdAt updatedAt')
    .sort({ createdAt: -1 });
};
