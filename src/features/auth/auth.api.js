import api from '../../lib/api.js';

export const registerStudent = (payload) => api.post('/auth/student/register', payload);
export const loginStudent = (payload) => api.post('/auth/student/login', payload);

export const registerFaculty = (payload) => api.post('/auth/faculty/register', payload);
export const loginFaculty = (payload) => api.post('/auth/faculty/login', payload);
export const approveFaculty = (facultyId) => api.patch(`/auth/faculty/approve/${facultyId}`);

export const loginAdmin = (payload) => api.post('/auth/admin/login', payload);
export const listAdminStudents = () => api.get('/auth/admin/students');
export const listAdminFaculties = () => api.get('/auth/admin/faculties');
export const listAdminLorRequests = () => api.get('/auth/admin/lor-requests');

export const forgotPassword = (payload) => api.post('/auth/password/forgot', payload);
export const resetPassword = (payload) => api.post('/auth/password/reset', payload);

export const rejectFaculty = (facultyId) => api.patch(`/auth/admin/faculties/${facultyId}/reject`);
export const toggleFacultyActive = (facultyId) => api.patch(`/auth/admin/faculties/${facultyId}/toggle-active`);
export const deleteFaculty = (facultyId) => api.delete(`/auth/admin/faculties/${facultyId}`);

export const cancelLorRequest = (requestId) => api.patch(`/lor/admin/${requestId}/cancel`);
export const reassignLorRequest = (requestId, facultyId) => api.patch(`/lor/admin/${requestId}/reassign`, { facultyId });
export const deleteLorRequest = (requestId) => api.delete(`/lor/admin/${requestId}`);
