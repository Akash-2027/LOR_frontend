import { Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute.jsx';
import AuthGateway from '../pages/AuthGateway.jsx';
import AdminAuthPage from '../pages/AdminAuthPage.jsx';
import AboutPage from '../pages/public/AboutPage.jsx';
import ContactPage from '../pages/public/ContactPage.jsx';
import HelpPage from '../pages/public/HelpPage.jsx';
import StudentDashboard from '../pages/student/StudentDashboard.jsx';
import FacultyDashboard from '../pages/faculty/FacultyDashboard.jsx';
import AdminDashboard from '../pages/admin/AdminDashboard.jsx';

const routes = [
  { path: '/', element: <AuthGateway /> },
  { path: '/auth', element: <AuthGateway /> },
  { path: '/auth/admin', element: <AdminAuthPage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/contact', element: <ContactPage /> },
  { path: '/help', element: <HelpPage /> },
  {
    path: '/student',
    element: (
      <ProtectedRoute roles={['student']}>
        <StudentDashboard />
      </ProtectedRoute>
    )
  },
  {
    path: '/faculty',
    element: (
      <ProtectedRoute roles={['faculty']}>
        <FacultyDashboard />
      </ProtectedRoute>
    )
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute roles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    )
  },
  { path: '*', element: <Navigate to="/auth" replace /> }
];

export default routes;
