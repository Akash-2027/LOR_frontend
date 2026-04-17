import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../lib/api.js';
import useAuth from '../../hooks/useAuth.js';
import { fadeUp, tapButton, staggerContainer, rowItem } from '../../lib/motionVariants.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const ACHIEVEMENTS_MAX = 600;
const LOR_REQ_MAX = 500;
const PURPOSE_CUSTOM_MAX = 150;

const lorRequestSchema = z.object({
  facultyId:       z.string().min(1, 'Please select a faculty'),
  subject:         z.string().min(1, 'Please select a subject'),
  purpose:         z.string().min(3, 'Purpose is required').max(200, 'Purpose too long'),
  targetUniversity:z.string().min(3, 'Target university must be at least 3 characters').max(100, 'University name too long'),
  program:         z.string().min(2, 'Program must be at least 2 characters').max(100, 'Program name too long'),
  dueDate:         z.string().min(1, 'Due date is required'),
  achievements:    z.string().min(10, 'Achievements must be at least 10 characters').max(ACHIEVEMENTS_MAX, `Achievements cannot exceed ${ACHIEVEMENTS_MAX} characters`),
  lorRequirements: z.string().min(10, 'LOR requirements must be at least 10 characters').max(LOR_REQ_MAX, `LOR requirements cannot exceed ${LOR_REQ_MAX} characters`),
  documentName:    z.string().min(1, 'Please upload a document'),
  documentData:    z.string().min(1, 'Please upload a document')
});

const initialForm = {
  facultyId: '',
  subject: '',
  purposeOption: '',
  purposeCustom: '',
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

const CharCounter = ({ value, max }) => {
  const remaining = max - (value?.length || 0);
  const isNear = remaining <= Math.floor(max * 0.15);
  const isOver = remaining < 0;
  return (
    <span className="char-counter" style={{ color: isOver ? 'var(--error, #c0392b)' : isNear ? 'var(--warning, #e67e22)' : 'var(--muted)' }}>
      {remaining < 0 ? `${Math.abs(remaining)} over limit` : `${remaining} chars left`}
    </span>
  );
};

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const hasLoadedRef = useRef(false);

  const [facultyList, setFacultyList] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [lorConfig, setLorConfig] = useState({ purposes: [], programs: [] });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');

  const totalRequests = requests.length;

  // Compute final purpose value: if "Other" is selected, use custom text
  const purposeValue = form.purposeOption === 'Other' ? form.purposeCustom.trim() : form.purposeOption;

  const loadConfig = async () => {
    try {
      const res = await api.get('/lor/config');
      const cfg = res.data.data || {};
      setLorConfig({
        purposes: cfg.purposes || [],
        programs: cfg.programs || []
      });
    } catch {
      // non-fatal — form still works with empty dropdowns
    }
  };

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

    await loadConfig();

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

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

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

    const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!ALLOWED_MIME.includes(file.type)) {
      setErrors(['Only JPG, PNG, or PDF files are allowed.']);
      event.target.value = '';
      return;
    }

    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrors([`File is too large. Maximum allowed size is ${MAX_SIZE_MB} MB.`]);
      event.target.value = '';
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

    const resolvedProgram = form.program === '__custom__' ? (form.programCustom || '').trim() : form.program;
    const payload = { ...form, purpose: purposeValue, program: resolvedProgram };

    if (form.purposeOption === 'Other' && !form.purposeCustom.trim()) {
      setErrors(['Please describe your purpose.']);
      return;
    }

    if (form.program === '__custom__' && !resolvedProgram) {
      setErrors(['Please specify the program name.']);
      return;
    }

    const validation = lorRequestSchema.safeParse(payload);
    if (!validation.success) {
      setErrors(validation.error.errors.map((e) => e.message));
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/lor/student/requests', { ...payload });
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
          <input className="form-input" value={form.targetUniversity} onChange={handleChange('targetUniversity')} maxLength={100} required />

          <label className="form-label">Program</label>
          <p className="small-text">
            Required: Select from common options or type a custom program.
          </p>
          {lorConfig.programs.length > 0 ? (
            <select
              className="form-input"
              value={form.program}
              onChange={handleChange('program')}
              required
            >
              <option value="">Select program</option>
              {lorConfig.programs.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="__custom__">Other (specify below)</option>
            </select>
          ) : (
            <input className="form-input" value={form.program} onChange={handleChange('program')} maxLength={100} required />
          )}
          {form.program === '__custom__' && (
            <>
              <label className="form-label">Specify Program</label>
              <input
                className="form-input"
                placeholder="e.g. M.Sc. Data Science"
                value={form.programCustom || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, programCustom: e.target.value }))}
                maxLength={100}
                required
              />
            </>
          )}

          <label className="form-label">Due Date</label>
          <p className="small-text">Required</p>
          <input className="form-input" type="date" value={form.dueDate} onChange={handleChange('dueDate')} required />

          <h4 className="section-title">3. Student Profile</h4>
          <label className="form-label">Purpose of Letter</label>
          <p className="small-text">Required: Select the primary reason for requesting this LOR.</p>
          {lorConfig.purposes.length > 0 ? (
            <select
              className="form-input"
              value={form.purposeOption}
              onChange={handleChange('purposeOption')}
              required
            >
              <option value="">Select purpose</option>
              {lorConfig.purposes.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          ) : (
            <input className="form-input" value={form.purposeOption} onChange={handleChange('purposeOption')} maxLength={200} required />
          )}
          {form.purposeOption === 'Other' && (
            <>
              <label className="form-label">Describe your purpose</label>
              <div className="input-with-counter">
                <input
                  className="form-input"
                  placeholder="Briefly describe why you need this LOR"
                  value={form.purposeCustom}
                  onChange={handleChange('purposeCustom')}
                  maxLength={PURPOSE_CUSTOM_MAX}
                  required
                />
                <CharCounter value={form.purposeCustom} max={PURPOSE_CUSTOM_MAX} />
              </div>
            </>
          )}

          <label className="form-label">Your Achievements</label>
          <p className="small-text">
            Required: List your academic achievements, projects, or awards relevant to this application.
            Keep it concise — faculty may edit this before approval.
          </p>
          <div className="input-with-counter">
            <textarea
              className="form-input textarea-input"
              value={form.achievements}
              onChange={handleChange('achievements')}
              maxLength={ACHIEVEMENTS_MAX}
              required
            />
            <CharCounter value={form.achievements} max={ACHIEVEMENTS_MAX} />
          </div>

          <label className="form-label">What should be included in LOR?</label>
          <p className="small-text">
            Required: Mention specific qualities or experiences you want highlighted.
            Faculty may refine this content before approval.
          </p>
          <div className="input-with-counter">
            <textarea
              className="form-input textarea-input"
              value={form.lorRequirements}
              onChange={handleChange('lorRequirements')}
              maxLength={LOR_REQ_MAX}
              required
            />
            <CharCounter value={form.lorRequirements} max={LOR_REQ_MAX} />
          </div>

          <h4 className="section-title">4. Supporting Document</h4>
          <label className="form-label">Document Type</label>
          <p className="small-text">Required: Marksheet or ID Card.</p>
          <select className="form-input" value={form.documentType} onChange={handleChange('documentType')}>
            <option value="marksheet">Marksheet</option>
            <option value="idCard">ID Card</option>
          </select>

          <label className="form-label">Upload Marksheet / ID Card</label>
          <p className="small-text">Required: JPG, PNG, or PDF. Max 5 MB.</p>
          <input className="form-input" type="file" accept="image/*,.pdf" onChange={handleDocument} required />
          {form.documentName && <p className="small-text">Selected: {form.documentName}</p>}

          <motion.button className="primary-btn" type="submit" disabled={submitting || subjectsForFaculty.length === 0} {...tapButton}>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </motion.button>
        </form>

        <h3 className="section-title">My Requests</h3>

        {loading ? (
          <LoadingSpinner message="Loading requests..." />
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
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                      You have not submitted any LOR requests yet. Use the form above to get started.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <motion.tr key={request._id} {...rowItem}>
                      <td>{request.facultyId?.name || '-'}</td>
                      <td>{request.subject || '-'}</td>
                      <td>{request.targetUniversity || '-'}</td>
                      <td>{request.program || '-'}</td>
                      <td>
                        <span className={`status-badge status-${request.status}`}>
                          {formatStatusLabel(request.status)}
                        </span>
                      </td>
                      <td>{request.facultyRemark || '-'}</td>
                      <td>
                        {request.status === 'approved' ? (
                          <motion.button
                            className="small-btn"
                            disabled={downloadingId === request._id}
                            onClick={() => downloadLetter(request._id)}
                            {...tapButton}
                          >
                            {downloadingId === request._id ? 'Downloading...' : 'Download'}
                          </motion.button>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <motion.button className="primary-btn" onClick={logout} {...tapButton}>Logout</motion.button>
      </section>
    </main>
  );
};

export default StudentDashboard;
