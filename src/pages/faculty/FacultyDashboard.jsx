import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../lib/api.js';
import useAuth from '../../hooks/useAuth.js';

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

const FacultyDashboard = () => {
  const { user, logout } = useAuth();
  const hasLoadedRef = useRef(false);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');
  const [remarksById, setRemarksById] = useState({});

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

  const setRemark = (requestId, value) => {
    setRemarksById((prev) => ({ ...prev, [requestId]: value }));
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

        {errors.length > 0 && (
          <ul className="error-list">
            {errors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        )}

        {success && <p className="form-success">{success}</p>}

        {loading ? (
          <p>Loading requests...</p>
        ) : (
          <div className="table-wrap">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Details</th>
                  <th>LOR Need</th>
                  <th>Document</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="6">No student requests available.</td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request._id}>
                      <td>
                        <div>{request.studentId?.name || '-'}</div>
                        <div>{request.studentId?.email || '-'}</div>
                        <div>Enroll: {request.studentId?.enrollment || '-'}</div>
                      </td>
                      <td>
                        <div>University: {request.targetUniversity || '-'}</div>
                        <div>Program: {request.program || '-'}</div>
                        <div>Due: {request.dueDate || '-'}</div>
                      </td>
                      <td>
                        <div><strong>Purpose:</strong> {request.purpose || '-'}</div>
                        <div><strong>Achievements:</strong> {request.achievements || '-'}</div>
                        <div><strong>Need in Letter:</strong> {request.lorRequirements || '-'}</div>
                      </td>
                      <td>
                        <div>{request.documentType || '-'}</div>
                        {request.documentData ? (
                          <a href={request.documentData} target="_blank" rel="noreferrer">
                            View {request.documentName || 'document'}
                          </a>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td>
                        <div>{formatStatusLabel(request.status)}</div>
                        <div>{request.facultyRemark || '-'}</div>
                      </td>
                      <td>
                        {request.status === 'pending' ? (
                          <div className="action-buttons">
                            <textarea
                              className="form-input textarea-input"
                              value={remarksById[request._id] || ''}
                              onChange={(event) => setRemark(request._id, event.target.value)}
                              placeholder="Optional remark for student"
                            />
                            <button
                              className="small-btn approve-btn"
                              disabled={updatingId === request._id}
                              onClick={() => changeStatus(request._id, 'approved')}
                            >
                              {updatingId === request._id ? 'Saving...' : 'Approve'}
                            </button>
                            <button
                              className="small-btn reject-btn"
                              disabled={updatingId === request._id}
                              onClick={() => changeStatus(request._id, 'rejected')}
                            >
                              {updatingId === request._id ? 'Saving...' : 'Reject'}
                            </button>
                          </div>
                        ) : (
                          <span>Done</span>
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

export default FacultyDashboard;
