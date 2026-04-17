import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="dashboard-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="simple-card" style={{ textAlign: 'center', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 700, color: 'var(--accent)', margin: '0 0 0.5rem' }}>404</h1>
        <h2 style={{ margin: '0 0 1rem', color: 'var(--text)' }}>Page Not Found</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
          The page you are looking for does not exist.
        </p>
        <Link to="/auth" className="primary-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Go to Login
        </Link>
      </div>
    </div>
  );
}
