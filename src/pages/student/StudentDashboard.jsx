import { useEffect, useRef, useState } from 'react';
import api from '../../lib/api.js';
import useAuth from '../../hooks/useAuth.js';

const initialForm = {
  facultyId: '',
  subject: '',
  purpose: '',
  targetUniversity: '',
  program: '',
  dueDate: '',
  achievements: '',
  lorRequirements: '',
  documentType: 'marksheet',
  documentName: '',
  documentData: ''
};

const getErrorMessages = (err) => {
  const data = err?.response?.data;
  const status = err?.response?.status;

  if (status === 401) return ['Session expired. Please login again.'];
  if (status === 403) return ['You are not allowed to access student requests.'];
  if (status === 404) return ['LOR API route not found. Restart backend server and try again.'];
  if (!data) return [`Network error: ${err?.message || 'Request failed'}`];

  const messages = data?.details?.messages;
  if (Array.isArray(messages) && messages.length > 0) {
    return messages.filter((msg) => typeof msg === 'string' && msg.trim().length > 0);
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return [data.message];
  }

  return ['Request failed. Please try again.'];
};

const mergeMessages = (existing, incoming) => [...new Set([...(existing || []), ...(incoming || [])])];

const formatStatusLabel = (status) => {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
};

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const hasLoadedRef = useRef(false);

  const [facultyList, setFacultyList] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');

  const totalRequests = requests.length;

  const loadFacultyList = async () => {
    const facultyRes = await api.get('/lor/faculty-list');
    const facultyData = facultyRes.data.data || [];
    setFacultyList(facultyData);

    if (facultyData.length > 0) {
      setForm((prev) => {
        const nextFacultyId = prev.facultyId || facultyData[0]._id;
        const selected = facultyData.find((faculty) => faculty._id === nextFacultyId) || facultyData[0];
        const nextSubject = selected?.subjects?.[0] || '';
        return { ...prev, facultyId: nextFacultyId, subject: nextSubject };
      });
      return [];
    }

    return ['No approved faculty available yet. Ask admin to approve at least one faculty account.'];
  };

  const loadStudentRequests = async () => {
    const requestRes = await api.get('/lor/student/requests');
    setRequests(requestRes.data.data || []);
  };

  const loadData = async () => {
    setLoading(true);
    setErrors([]);

    try {
      const facultyWarnings = await loadFacultyList();
      if (facultyWarnings.length > 0) {
        setErrors((prev) => mergeMessages(prev, facultyWarnings));
      }
    } catch (err) {
      setErrors((prev) => mergeMessages(prev, getErrorMessages(err)));
    }

    try {
      await loadStudentRequests();
    } catch (err) {
      setErrors((prev) => mergeMessages(prev, getErrorMessages(err)));
    }

    setLoading(false);
  };

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadData();
  }, []);

  const handleChange = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));

    if (key === 'facultyId') {
      const selected = facultyList.find((faculty) => faculty._id === value);
      const nextSubject = selected?.subjects?.[0] || '';
      setForm((prev) => ({ ...prev, facultyId: value, subject: nextSubject }));
    }
  };

  const handleDocument = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setForm((prev) => ({ ...prev, documentName: '', documentData: '' }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({
        ...prev,
        documentName: file.name,
        documentData: String(reader.result || '')
      }));
    };
    reader.readAsDataURL(file);
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setErrors([]);
    setSuccess('');

    if (!form.facultyId) {
      setErrors(['Please select a faculty before submitting your request.']);
      return;
    }

    if (!form.subject) {
      setErrors(['Please select a subject for this faculty.']);
      return;
    }

    if (!form.documentName || !form.documentData) {
      setErrors(['Please upload marksheet or ID card before submitting your request.']);
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/lor/student/requests', form);
      setSuccess('LOR request submitted successfully.');
      setForm((prev) => ({
        ...initialForm,
        facultyId: prev.facultyId || facultyList[0]?._id || '',
        subject: prev.subject || ''
      }));
      await loadStudentRequests();
    } catch (err) {
      setErrors(getErrorMessages(err));
    } finally {
      setSubmitting(false);
    }
  };

  const downloadLetter = async (requestId) => {
    setDownloadingId(requestId);
    setErrors([]);
    setSuccess('');

    try {
      const response = await api.get(`/lor/student/requests/${requestId}/letter`, {
        responseType: 'blob'
      });
      const file = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lor-${requestId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setErrors(getErrorMessages(err));
    } finally {
      setDownloadingId('');
    }
  };

  const selectedFaculty = facultyList.find((faculty) => faculty._id === form.facultyId);
  const subjectsForFaculty = selectedFaculty?.subjects || [];

  return (
    <main className="dashboard-page">
      <section className="simple-card">
        <h2>Student Dashboard</h2>
        <p>Welcome {user?.name || 'Student'}</p>

        <div className="dashboard-info-row">
          <div className="info-box">
            <p className="info-label">Total Requests</p>
            <p className="info-value">{totalRequests}</p>
          </div>
        </div>

        <h3 className="section-title">New LOR Request</h3>

        {errors.length > 0 && (
          <ul className="error-list">
            {errors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        )}

        {success && <p className="form-success">{success}</p>}

        <form className="auth-form" onSubmit={submitRequest}>
          <h4 className="section-title">1. Faculty Selection</h4>
          <label className="form-label">Faculty</label>
          <p className="small-text">Required: Choose one approved faculty.</p>
          <select className="form-input" value={form.facultyId} onChange={handleChange('facultyId')} required>
            <option value="">Select faculty</option>
            {facultyList.map((faculty) => (
              <option key={faculty._id} value={faculty._id}>
                {faculty.name} ({faculty.department})
              </option>
            ))}
          </select>

          <label className="form-label">Subject</label>
          <p className="small-text">Required: Choose a subject taught by this faculty.</p>
          {subjectsForFaculty.length === 0 ? (
            <p className="small-text">No subjects available yet. Ask the faculty to add subjects.</p>
          ) : (
            <select className="form-input" value={form.subject} onChange={handleChange('subject')} required>
              <option value="">Select subject</option>
              {subjectsForFaculty.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          )}

          <h4 className="section-title">2. Academic Target</h4>
          <label className="form-label">Target University</label>
          <p className="small-text">Required</p>
          <input className="form-input" value={form.targetUniversity} onChange={handleChange('targetUniversity')} required />

          <label className="form-label">Program</label>
          <p className="small-text">Required</p>
          <input className="form-input" value={form.program} onChange={handleChange('program')} required />

          <label className="form-label">Due Date</label>
          <p className="small-text">Required</p>
          <input className="form-input" type="date" value={form.dueDate} onChange={handleChange('dueDate')} required />

          <h4 className="section-title">3. Student Profile</h4>
          <label className="form-label">Purpose of Letter</label>
          <p className="small-text">Required: Briefly explain why you need this LOR.</p>
          <input className="form-input" value={form.purpose} onChange={handleChange('purpose')} required />

          <label className="form-label">Your Achievements</label>
          <p className="small-text">Required</p>
          <textarea className="form-input textarea-input" value={form.achievements} onChange={handleChange('achievements')} required />

          <label className="form-label">What should be included in LOR?</label>
          <p className="small-text">Required</p>
          <textarea className="form-input textarea-input" value={form.lorRequirements} onChange={handleChange('lorRequirements')} required />

          <h4 className="section-title">4. Supporting Document</h4>
          <label className="form-label">Document Type</label>
          <p className="small-text">Required: Marksheet or ID Card.</p>
          <select className="form-input" value={form.documentType} onChange={handleChange('documentType')}>
            <option value="marksheet">Marksheet</option>
            <option value="idCard">ID Card</option>
          </select>

          <label className="form-label">Upload Marksheet / ID Card</label>
          <p className="small-text">Required: JPG, PNG, or PDF.</p>
          <input className="form-input" type="file" accept="image/*,.pdf" onChange={handleDocument} required />
          {form.documentName && <p className="small-text">Selected: {form.documentName}</p>}

          <button className="primary-btn" type="submit" disabled={submitting || subjectsForFaculty.length === 0}>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>

        <h3 className="section-title">My Requests</h3>

        {loading ? (
          <p>Loading requests...</p>
        ) : (
          <div className="table-wrap">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Faculty</th>
                  <th>Subject</th>
                  <th>University</th>
                  <th>Program</th>
                  <th>Status</th>
                  <th>Remark</th>
                  <th>Letter</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="7">No requests yet.</td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request._id}>
                      <td>{request.facultyId?.name || '-'}</td>
                      <td>{request.subject || '-'}</td>
                      <td>{request.targetUniversity || '-'}</td>
                      <td>{request.program || '-'}</td>
                      <td>{formatStatusLabel(request.status)}</td>
                      <td>{request.facultyRemark || '-'}</td>
                      <td>
                        {request.status === 'approved' ? (
                          <button
                            className="small-btn"
                            disabled={downloadingId === request._id}
                            onClick={() => downloadLetter(request._id)}
                          >
                            {downloadingId === request._id ? 'Downloading...' : 'Download'}
                          </button>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <button className="primary-btn" onClick={logout}>Logout</button>
      </section>
    </main>
  );
};

export default StudentDashboard;
