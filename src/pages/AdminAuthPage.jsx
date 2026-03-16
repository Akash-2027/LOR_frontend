import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import { mapAuthPayload } from '../features/auth/utils/authHelpers.js';
import { loginAdmin } from '../features/auth/auth.api.js';
import PublicLayout from '../components/site/PublicLayout.jsx';
import vectorImage from '../../assets/vector_image.png';

const AdminAuthPage = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (auth.isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await loginAdmin({ email, password });
      const payload = mapAuthPayload(response.data.data, 'admin');
      auth.login(payload);
      navigate('/admin');
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || 'Admin login failed';
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
        <section className="auth-card">
          <h2>Admin Login</h2>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="form-label">Admin Email</label>
            <input className="form-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />

            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />

            {error && <p className="form-error">{error}</p>}

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : 'Login'}
            </button>
          </form>
        </section>
      </div>
    </PublicLayout>
  );
};

export default AdminAuthPage;
