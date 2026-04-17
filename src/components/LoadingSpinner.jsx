export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem' }}>
      <div className="spinner" />
      <p style={{ color: 'var(--muted)', margin: 0 }}>{message}</p>
    </div>
  );
}
