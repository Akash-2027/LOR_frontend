import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { fadeUp, tapButton } from '../lib/motionVariants.js';
import useAuth from '../hooks/useAuth.js';
import { getDashboardPath, mapAuthPayload } from '../features/auth/utils/authHelpers.js';
import {
  loginFaculty,
  loginStudent,
  registerFaculty,
  registerStudent
} from '../features/auth/auth.api.js';
import PublicLayout from '../components/site/PublicLayout.jsx';
import vectorImage from '../../assets/vector_image.png';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  enrollment: '',
  mobile: '',
  govtId: '',
  collegeEmail: '',
  department: ''
};

const AuthGateway = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const [role, setRole] = useState('student');
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(emptyForm);

  if (auth.isAuthenticated) {
    return <Navigate to={getDashboardPath(auth.role)} replace />;
  }

  const isRegister = mode === 'register';

  const handleChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const switchRole = (event) => {
    setRole(event.target.value);
    setMode('login');
    setError('');
    setSuccess('');
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (role === 'student' && isRegister) {
        const response = await registerStudent({
          name: form.name,
          email: form.email,
          password: form.password,
          enrollment: form.enrollment,
          mobile: form.mobile,
          govtId: form.govtId
        });

        const payload = mapAuthPayload(response.data.data, 'student');
        auth.login(payload);
        navigate('/student');
        return;
      }

      if (role === 'student' && !isRegister) {
        const response = await loginStudent({
          email: form.email,
          password: form.password
        });

        const payload = mapAuthPayload(response.data.data, 'student');
        auth.login(payload);
        navigate('/student');
        return;
      }

      if (role === 'faculty' && isRegister) {
        await registerFaculty({
          name: form.name,
          email: form.email,
          collegeEmail: form.collegeEmail,
          department: form.department,
          mobile: form.mobile,
          password: form.password
        });

        setSuccess('Faculty registration sent. Wait for admin approval, then login.');
        setMode('login');
        setForm((prev) => ({ ...prev, password: '' }));
        return;
      }

      const response = await loginFaculty({
        email: form.email,
        password: form.password
      });

      const payload = mapAuthPayload(response.data.data, 'faculty');
      auth.login(payload);
      navigate('/faculty');
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || 'Request failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="auth-layout">
        <div className="auth-visual">
          <img src={vectorImage} alt="LOR illustration" />
        </div>
        <motion.section className="auth-card" {...fadeUp}>
          <h2>{isRegister ? 'Register' : 'Login'} ({role})</h2>

          <label className="form-label" htmlFor="role-select">Select Role</label>
          <select id="role-select" className="form-input" value={role} onChange={switchRole}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
          </select>

          <form onSubmit={handleSubmit} className="auth-form">
            {isRegister && (
              <>
                <label className="form-label">Name</label>
                <input className="form-input" value={form.name} onChange={handleChange('name')} required />
              </>
            )}

            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={handleChange('email')} required />

            {role === 'student' && isRegister && (
              <>
                <label className="form-label">Enrollment</label>
                <input className="form-input" value={form.enrollment} onChange={handleChange('enrollment')} required />

                <label className="form-label">Mobile</label>
                <input className="form-input" value={form.mobile} onChange={handleChange('mobile')} required />

                <label className="form-label">Govt ID (Aadhaar / PAN)</label>
                <input
                  className="form-input"
                  value={form.govtId}
                  onChange={handleChange('govtId')}
                  placeholder="12-digit Aadhaar or PAN (e.g. ABCDE1234F)"
                  required
                />
              </>
            )}

            {role === 'faculty' && isRegister && (
              <>
                <label className="form-label">College Email</label>
                <input className="form-input" type="email" value={form.collegeEmail} onChange={handleChange('collegeEmail')} required />

                <label className="form-label">Department</label>
                <input className="form-input" value={form.department} onChange={handleChange('department')} required />

                <label className="form-label">Mobile</label>
                <input className="form-input" value={form.mobile} onChange={handleChange('mobile')} required />
              </>
            )}

            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={form.password} onChange={handleChange('password')} required />

            {error && <p className="form-error">{error}</p>}
            {success && <p className="form-success">{success}</p>}

            <motion.button className="primary-btn" type="submit" disabled={loading} {...tapButton}>
              {loading ? 'Please wait...' : isRegister ? 'Sign Up' : 'Login'}
            </motion.button>
          </form>

          <p className="mode-link-row">
            {isRegister ? 'Already registered?' : 'Not registered?'}{' '}
            <motion.button type="button" className="mode-link-btn" onClick={toggleMode} {...tapButton}>
              {isRegister ? 'Login' : 'Sign Up'}
            </motion.button>
          </p>
        </motion.section>
      </div>
    </PublicLayout>
  );
};

export default AuthGateway;
