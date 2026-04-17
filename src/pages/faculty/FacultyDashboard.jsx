import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../lib/api.js';
import useAuth from '../../hooks/useAuth.js';
import { updateFacultyProfile } from '../../features/auth/auth.api.js';
import { tapButton, rowItem } from '../../lib/motionVariants.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const getErrorMessages = (err) => {
  const data = err?.response?.data;
  const status = err?.response?.status;

  if (status === 401) return ['Session expired. Please login again.'];
  if (status === 403) return ['You are not allowed to access faculty requests.'];
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

const formatStatusLabel = (status) => {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
};

const normalizeSubjects = (subjects) => {
  if (!Array.isArray(subjects)) return [];
  return subjects
    .map((subject) => (typeof subject === 'string' ? subject.trim() : ''))
    .filter((subject) => subject.length > 0);
};

const FacultyDashboard = () => {
  const { user, logout } = useAuth();
  const hasLoadedRef = useRef(false);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [previewingId, setPreviewingId] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');
  const [remarksById, setRemarksById] = useState({});

  const [editContentById, setEditContentById] = useState({});
  const [savingContentId, setSavingContentId] = useState('');

  const [subjects, setSubjects] = useState(() => normalizeSubjects(user?.subjects));
  const [subjectDraft, setSubjectDraft] = useState('');
  const [savingSubjects, setSavingSubjects] = useState(false);

  // Profile edit state
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
    collegeEmail: user?.collegeEmail || ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'pending').length,
    [requests]
  );

  const loadRequests = async () => {
    setLoading(true);
    setErrors([]);

    try {
      const response = await api.get('/lor/faculty/requests');
      setRequests(response.data.data || []);
    } catch (err) {
      setErrors(getErrorMessages(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadRequests();
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const setRemark = (requestId, value) => {
    setRemarksById((prev) => ({ ...prev, [requestId]: value }));
  };

  const initEditContent = (request) => {
    setEditContentById((prev) => ({
      ...prev,
      [request._id]: {
        achievements: request.achievements || '',
        lorRequirements: request.lorRequirements || '',
        editing: true
      }
    }));
  };

  const setEditField = (requestId, field, value) => {
    setEditContentById((prev) => ({
      ...prev,
      [requestId]: { ...prev[requestId], [field]: value }
    }));
  };

  const cancelEditContent = (requestId) => {
    setEditContentById((prev) => {
      const next = { ...prev };
      delete next[requestId];
      return next;
    });
  };

  const saveEditContent = async (requestId) => {
    const draft = editContentById[requestId];
    if (!draft) return;
    setSavingContentId(requestId);
    setErrors([]);
    setSuccess('');
    try {
      await api.patch(`/lor/faculty/requests/${requestId}/content`, {
        achievements: draft.achievements,
        lorRequirements: draft.lorRequirements
      });
      setSuccess('Content updated. You can now approve the request.');
      cancelEditContent(requestId);
      await loadRequests();
    } catch (err) {
      setErrors(getErrorMessages(err));
    } finally {
      setSavingContentId('');
    }
  };

  const addSubject = () => {
    const next = subjectDraft.trim();
    if (!next) return;
    setSubjects((prev) => {
      const merged = [...prev, next];
      return Array.from(new Set(merged));
    });
    setSubjectDraft('');
  };

  const removeSubject = (subject) => {
    setSubjects((prev) => prev.filter((item) => item !== subject));
  };

  const saveSubjects = async () => {
    setSavingSubjects(true);
    setErrors([]);
    setSuccess('');

    try {
      const response = await api.patch('/auth/faculty/subjects', {
        subjects
      });

      const updated = response.data?.data;
      if (updated?.subjects) {
        const stored = localStorage.getItem('lor_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.subjects = updated.subjects;
          localStorage.setItem('lor_user', JSON.stringify(parsed));
        }
      }

      setSuccess('Subjects updated successfully.');
    } catch (err) {
      setErrors(getErrorMessages(err));
    } finally {
      setSavingSubjects(false);
    }
  };

  const saveProfile = async () => {
    const payload = {};
    if (profileForm.name.trim()   !== (user?.name   || '')) payload.name   = profileForm.name.trim();
    if (profileForm.mobile.trim() !== (user?.mobile || '')) payload.mobile = profileForm.mobile.trim();

    if (Object.keys(payload).length === 0) {
      setProfileEdit(false);
      return;
    }

    setSavingProfile(true);
    setErrors([]);
    setSuccess('');

    try {
      const res = await updateFacultyProfile(payload);
      const updated = res.data?.data;
      if (updated) {
        const stored = localStorage.getItem('lor_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.assign(parsed, { name: updated.name, mobile: updated.mobile });
          localStorage.setItem('lor_user', JSON.stringify(parsed));
        }
        setProfileForm({ name: updated.name || '', mobile: updated.mobile || '', collegeEmail: updated.collegeEmail || user?.collegeEmail || '' });
      }
      setSuccess('Profile updated successfully.');
      setProfileEdit(false);
    } catch (err) {
      setErrors(getErrorMessages(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const changeStatus = async (requestId, status) => {
    setUpdatingId(requestId);
    setErrors([]);
    setSuccess('');

    try {
      await api.patch(`/lor/faculty/requests/${requestId}/status`, {
        status,
        facultyRemark: (remarksById[requestId] || '').trim()
      });

      setSuccess(`Request ${status === 'approved' ? 'approved' : 'rejected'} successfully.`);
      setRemarksById((prev) => ({ ...prev, [requestId]: '' }));
      await loadRequests();
    } catch (err) {
      setErrors(getErrorMessages(err));
    } finally {
      setUpdatingId('');
    }
  };

  const previewLetter = async (requestId) => {
    setPreviewingId(requestId);
    setErrors([]);
    setSuccess('');

    try {
      const response = await api.get(`/lor/faculty/requests/${requestId}/preview`, {
        responseType: 'blob'
      });
      const file = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(file);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setErrors(getErrorMessages(err));
    } finally {
      setPreviewingId('');
    }
  };

  return (
    <main className="dashboard-page">
      <section className="simple-card">
        <h2>Faculty Dashboard</h2>
        <p>Welcome {user?.name || 'Faculty'}</p>

        <div className="dashboard-info-row">
          <div className="info-box">
            <p className="info-label">Total Requests</p>
            <p className="info-value">{requests.length}</p>
          </div>
          <div className="info-box">
            <p className="info-label">Pending Requests</p>
            <p className="info-value">{pendingCount}</p>
          </div>
        </div>

        <h3 className="section-title">My Profile</h3>
        <div className="subjects-card">
          {!profileEdit ? (
            <>
              <div className="req-detail-grid" style={{ marginBottom: '12px' }}>
                <div className="req-detail-group">
                  <p className="req-detail-label">Name</p>
                  <p className="req-detail-value">{profileForm.name || '-'}</p>
                </div>
                <div className="req-detail-group">
                  <p className="req-detail-label">Login Email</p>
                  <p className="req-detail-value" style={{ color: 'var(--muted)', fontSize: '13px' }}>{user?.email || '-'} <span style={{ fontSize: '11px' }}>(admin only)</span></p>
                </div>
                <div className="req-detail-group">
                  <p className="req-detail-label">College Email</p>
                  <p className="req-detail-value">{profileForm.collegeEmail || '-'}</p>
                </div>
                <div className="req-detail-group">
                  <p className="req-detail-label">Mobile</p>
                  <p className="req-detail-value">{profileForm.mobile || '-'}</p>
                </div>
                <div className="req-detail-group">
                  <p className="req-detail-label">Department</p>
                  <p className="req-detail-value" style={{ color: 'var(--muted)', fontSize: '13px' }}>{user?.department || '-'} <span style={{ fontSize: '11px' }}>(admin only)</span></p>
                </div>
              </div>
              <motion.button className="small-btn" type="button" onClick={() => setProfileEdit(true)} {...tapButton}>
                Edit Profile
              </motion.button>
            </>
          ) : (
            <>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">Name</label>
                  <input
                    className="form-input"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Mobile</label>
                  <input
                    className="form-input"
                    value={profileForm.mobile}
                    onChange={(e) => setProfileForm((p) => ({ ...p, mobile: e.target.value }))}
                  />
                </div>
              </div>
              <div className="action-buttons">
                <motion.button className="small-btn approve-btn" type="button" onClick={saveProfile} disabled={savingProfile} {...tapButton}>
                  {savingProfile ? 'Saving...' : 'Save'}
                </motion.button>
                <motion.button className="small-btn" type="button" onClick={() => setProfileEdit(false)} disabled={savingProfile} {...tapButton}>
                  Cancel
                </motion.button>
              </div>
            </>
          )}
        </div>

        <h3 className="section-title">My Subjects</h3>
        <div className="subjects-card">
          <p className="small-text">Add subjects you teach. Students will pick one when requesting an LOR.</p>
          <div className="form-row">
            <input
              className="form-input"
              placeholder="e.g. Data Structures"
              value={subjectDraft}
              onChange={(event) => setSubjectDraft(event.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubject(); } }}
            />
            <button className="add-btn" type="button" onClick={addSubject}>+ Add</button>
          </div>
          {subjects.length === 0 ? (
            <p className="subjects-empty">No subjects yet — add your first one above.</p>
          ) : (
            <div className="chip-row">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  className="chip"
                  type="button"
                  onClick={() => removeSubject(subject)}
                  title="Click to remove"
                >
                  {subject}
                  <span className="chip-x">✕</span>
                </button>
              ))}
            </div>
          )}
          <motion.button className="primary-btn" type="button" onClick={saveSubjects} disabled={savingSubjects} style={{ marginTop: '16px' }} {...tapButton}>
            {savingSubjects ? 'Saving...' : 'Save Subjects'}
          </motion.button>
        </div>

        {errors.length > 0 && (
          <ul className="error-list">
            {errors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        )}

        {success && <p className="form-success">{success}</p>}

        {loading ? (
          <LoadingSpinner message="Loading requests..." />
        ) : (
          <div className="table-wrap">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                      No student requests yet. Students will appear here once they submit an LOR request.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => {
                    const isExpanded = expandedId === request._id;
                    const isPending = request.status === 'pending';
                    return (
                      <>
                        <tr key={request._id} className="req-row">
                          <td>
                            <div className="req-name">{request.studentId?.name || '-'}</div>
                            <div className="req-meta">{request.studentId?.enrollment || '-'}</div>
                          </td>
                          <td>
                            <div className="req-name">{request.targetUniversity || '-'}</div>
                            <div className="req-meta">{request.program || '-'}</div>
                          </td>
                          <td>
                            <span className={`status-badge status-${request.status}`}>
                              {formatStatusLabel(request.status)}
                            </span>
                            <div className="req-meta" style={{ marginTop: '6px' }}>Due: {request.dueDate || '-'}</div>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <motion.button
                                className="small-btn expand-btn"
                                onClick={() => setExpandedId(isExpanded ? '' : request._id)}
                                {...tapButton}
                              >
                                {isExpanded ? 'Hide ▲' : 'Details ▼'}
                              </motion.button>
                              <motion.button
                                className="small-btn"
                                disabled={previewingId === request._id}
                                onClick={() => previewLetter(request._id)}
                                {...tapButton}
                              >
                                {previewingId === request._id ? 'Opening...' : 'Preview'}
                              </motion.button>
                            </div>
                          </td>
                        </tr>
                        <tr key={`${request._id}-expand`} className="req-expand-row">
                          <td colSpan="4" style={{ padding: 0, borderTop: 'none' }}>
                            <AnimatePresence initial={false}>
                            {isExpanded && (
                            <motion.div
                              className="req-expand-panel open"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto', transition: { duration: 0.22, ease: 'easeOut' } }}
                              exit={{ opacity: 0, height: 0, transition: { duration: 0.16, ease: 'easeIn' } }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div className="req-detail-grid">
                                <div className="req-detail-group">
                                  <p className="req-detail-label">Subject</p>
                                  <p className="req-detail-value">{request.subject || '-'}</p>
                                </div>
                                <div className="req-detail-group">
                                  <p className="req-detail-label">Email</p>
                                  <p className="req-detail-value">{request.studentId?.email || '-'}</p>
                                </div>
                                <div className="req-detail-group">
                                  <p className="req-detail-label">Document</p>
                                  <p className="req-detail-value">
                                    {request.documentType || '-'}
                                    {request.documentData && (
                                      <> · <a href={request.documentData} target="_blank" rel="noreferrer">View</a></>
                                    )}
                                  </p>
                                </div>
                                <div className="req-detail-group">
                                  <p className="req-detail-label">Purpose</p>
                                  <p className="req-detail-value">{request.purpose || '-'}</p>
                                </div>
                                {(() => {
                                  const draft = editContentById[request._id];
                                  if (isPending && draft?.editing) {
                                    return (
                                      <>
                                        <div className="req-detail-group req-detail-wide">
                                          <p className="req-detail-label">
                                            Achievements
                                            <span className="edit-badge">Editing</span>
                                          </p>
                                          <textarea
                                            className="form-input textarea-input"
                                            value={draft.achievements}
                                            onChange={(e) => setEditField(request._id, 'achievements', e.target.value)}
                                            maxLength={600}
                                          />
                                          <span className="char-counter" style={{ color: 'var(--muted)' }}>
                                            {600 - (draft.achievements?.length || 0)} chars left
                                          </span>
                                        </div>
                                        <div className="req-detail-group req-detail-wide">
                                          <p className="req-detail-label">
                                            Need in Letter
                                            <span className="edit-badge">Editing</span>
                                          </p>
                                          <textarea
                                            className="form-input textarea-input"
                                            value={draft.lorRequirements}
                                            onChange={(e) => setEditField(request._id, 'lorRequirements', e.target.value)}
                                            maxLength={500}
                                          />
                                          <span className="char-counter" style={{ color: 'var(--muted)' }}>
                                            {500 - (draft.lorRequirements?.length || 0)} chars left
                                          </span>
                                        </div>
                                        <div className="action-buttons" style={{ marginBottom: '12px' }}>
                                          <motion.button
                                            className="small-btn approve-btn"
                                            disabled={savingContentId === request._id}
                                            onClick={() => saveEditContent(request._id)}
                                            {...tapButton}
                                          >
                                            {savingContentId === request._id ? 'Saving...' : 'Save Changes'}
                                          </motion.button>
                                          <motion.button
                                            className="small-btn"
                                            disabled={savingContentId === request._id}
                                            onClick={() => cancelEditContent(request._id)}
                                            {...tapButton}
                                          >
                                            Cancel
                                          </motion.button>
                                        </div>
                                      </>
                                    );
                                  }
                                  return (
                                    <>
                                      <div className="req-detail-group req-detail-wide">
                                        <p className="req-detail-label">
                                          Achievements
                                          {request.facultyEditedAt && <span className="edit-badge edited-badge">Faculty Edited</span>}
                                        </p>
                                        <p className="req-detail-value">{request.achievements || '-'}</p>
                                      </div>
                                      <div className="req-detail-group req-detail-wide">
                                        <p className="req-detail-label">
                                          Need in Letter
                                          {request.facultyEditedAt && <span className="edit-badge edited-badge">Faculty Edited</span>}
                                        </p>
                                        <p className="req-detail-value">{request.lorRequirements || '-'}</p>
                                      </div>
                                    </>
                                  );
                                })()}
                                {!isPending && request.facultyRemark && (
                                  <div className="req-detail-group req-detail-wide">
                                    <p className="req-detail-label">Your Remark</p>
                                    <p className="req-detail-value">{request.facultyRemark}</p>
                                  </div>
                                )}
                              </div>
                              {isPending && !editContentById[request._id]?.editing && (
                                <div className="req-expand-actions">
                                  <div style={{ marginBottom: '10px' }}>
                                    <motion.button
                                      className="small-btn"
                                      onClick={() => initEditContent(request)}
                                      {...tapButton}
                                    >
                                      Edit Content
                                    </motion.button>
                                    <span className="small-text" style={{ marginLeft: '10px', color: 'var(--muted)' }}>
                                      Review and correct student's achievements / LOR details before approving.
                                    </span>
                                  </div>
                                  <textarea
                                    className="form-input textarea-input"
                                    value={remarksById[request._id] || ''}
                                    onChange={(event) => setRemark(request._id, event.target.value)}
                                    placeholder="Optional remark for student (visible after decision)"
                                  />
                                  <div className="action-buttons">
                                    <motion.button
                                      className="small-btn approve-btn"
                                      disabled={updatingId === request._id}
                                      onClick={() => changeStatus(request._id, 'approved')}
                                      {...tapButton}
                                    >
                                      {updatingId === request._id ? 'Saving...' : 'Approve'}
                                    </motion.button>
                                    <motion.button
                                      className="small-btn reject-btn"
                                      disabled={updatingId === request._id}
                                      onClick={() => changeStatus(request._id, 'rejected')}
                                      {...tapButton}
                                    >
                                      {updatingId === request._id ? 'Saving...' : 'Reject'}
                                    </motion.button>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                            )}
                            </AnimatePresence>
                          </td>
                        </tr>
                      </>
                    );
                  })
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

export default FacultyDashboard;
