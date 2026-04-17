import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import PublicLayout from '../../components/site/PublicLayout.jsx';

const rawBase = import.meta.env.VITE_API_BASE
  ? import.meta.env.VITE_API_BASE.replace(/\/+$/, '')
  : import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://lor-backendend.vercel.app';

const publicApiBase = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`;

const formatDate = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const DetailRow = ({ label, value }) => (
  <div style={{ padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
    <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
      {label}
    </p>
    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#111827', fontWeight: 600 }}>
      {value || '-'}
    </p>
  </div>
);

const VerifyPage = () => {
  const { token } = useParams();
  const [state, setState] = useState('loading'); // 'loading' | 'valid' | 'invalid' | 'gone'
  const [details, setDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setState('invalid');
      setErrorMsg('No verification token provided.');
      return;
    }

    axios
      .get(`${publicApiBase}/lor/verify/${token}`, { timeout: 12000 })
      .then((res) => {
        setDetails(res.data.data);
        setState('valid');
      })
      .catch((err) => {
        const status = err.response?.status;
        if (status === 410) {
          setState('gone');
          setErrorMsg('This certificate is no longer valid. The LOR request may have been cancelled.');
        } else if (status === 404) {
          setState('invalid');
          setErrorMsg('Certificate not found. The verification token may be incorrect or expired.');
        } else {
          setState('invalid');
          setErrorMsg('Unable to verify the certificate. Please try again later.');
        }
      });
  }, [token]);

  return (
    <PublicLayout>
      <section className="simple-card" style={{ maxWidth: 560, margin: '0 auto' }}>

        {state === 'loading' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: 40, height: 40, border: '3px solid #e5e7eb',
              borderTopColor: '#003366', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
            }} />
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Verifying certificate…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {state === 'valid' && details && (
          <>
            {/* Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: '#dcfce7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#15803d' }}>Certificate Verified</h2>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                  This is a genuine Letter of Recommendation from GEC Modasa
                </p>
              </div>
            </div>

            {/* Details */}
            <div style={{ borderTop: '1px solid #e5e7eb' }}>
              <DetailRow label="Student Name"      value={details.studentName} />
              <DetailRow label="Enrollment No."    value={details.enrollment} />
              <DetailRow label="Faculty"           value={details.facultyName} />
              <DetailRow label="Department"        value={details.facultyDepartment} />
              <DetailRow label="Program"           value={details.program} />
              <DetailRow label="Target University" value={details.targetUniversity} />
              <DetailRow label="Purpose"           value={details.purpose} />
              <DetailRow label="Approval Date"     value={formatDate(details.approvalDate)} />
              <DetailRow label="Certificate Issued" value={formatDate(details.issuedAt)} />
            </div>

            <p style={{ marginTop: 20, fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
              Issued by Government Engineering College, Modasa LOR Portal
            </p>
          </>
        )}

        {(state === 'invalid' || state === 'gone') && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: state === 'gone' ? '#fef9c3' : '#fee2e2',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke={state === 'gone' ? '#ca8a04' : '#dc2626'}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {state === 'gone'
                  ? <><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/><circle cx="12" cy="12" r="10"/></>
                  : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                }
              </svg>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '18px', color: state === 'gone' ? '#a16207' : '#dc2626' }}>
              {state === 'gone' ? 'Certificate No Longer Valid' : 'Certificate Not Found'}
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', maxWidth: 360, marginInline: 'auto' }}>
              {errorMsg}
            </p>
          </div>
        )}

      </section>
    </PublicLayout>
  );
};

export default VerifyPage;
