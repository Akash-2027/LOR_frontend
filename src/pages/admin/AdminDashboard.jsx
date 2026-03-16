import { useEffect, useMemo, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth.js';
import {
  approveFaculty,
  listAdminFaculties,
  listAdminLorRequests,
  listAdminStudents
} from '../../features/auth/auth.api.js';

const getErrorMessage = (err) => {
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Request failed';
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const hasLoadedRef = useRef(false);

  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [lorRequests, setLorRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const pendingFacultyCount = useMemo(
    () => faculties.filter((faculty) => faculty.approvalStatus === 'pending').length,
    [faculties]
  );

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');

    try {
      const [studentsRes, facultiesRes, lorRequestsRes] = await Promise.all([
        listAdminStudents(),
        listAdminFaculties(),
        listAdminLorRequests()
      ]);

      setStudents(studentsRes.data.data || []);
      setFaculties(facultiesRes.data.data || []);
      setLorRequests(lorRequestsRes.data.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadDashboardData();
  }, []);

  const onApproveFaculty = async (facultyId) => {
    setApprovingId(facultyId);
    setError('');
    setSuccess('');

    try {
      await approveFaculty(facultyId);
      setSuccess('Faculty approved successfully.');
      await loadDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setApprovingId('');
    }
  };

  return (
    <main className="dashboard-page">
      <section className="simple-card">
        <h2>Admin Dashboard</h2>
        <p>Welcome {user?.name || 'Admin'}</p>

        <div className="dashboard-info-row">
          <div className="info-box">
            <p className="info-label">Students</p>
            <p className="info-value">{students.length}</p>
          </div>
          <div className="info-box">
            <p className="info-label">Faculties</p>
            <p className="info-value">{faculties.length}</p>
          </div>
          <div className="info-box">
            <p className="info-label">Pending Faculty Approval</p>
            <p className="info-value">{pendingFacultyCount}</p>
          </div>
          <div className="info-box">
            <p className="info-label">LOR Requests</p>
            <p className="info-value">{lorRequests.length}</p>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        <h3 className="section-title">Faculty Accounts</h3>
        {loading ? (
          <p>Loading faculties...</p>
        ) : (
          <div className="table-wrap">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>College Email</th>
                  <th>Department</th>
                  <th>Mobile</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Updated At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {faculties.length === 0 ? (
                  <tr>
                    <td colSpan="9">No faculty accounts found.</td>
                  </tr>
                ) : (
                  faculties.map((faculty) => (
                    <tr key={faculty._id}>
                      <td>{faculty.name || '-'}</td>
                      <td>{faculty.email || '-'}</td>
                      <td>{faculty.collegeEmail || '-'}</td>
                      <td>{faculty.department || '-'}</td>
                      <td>{faculty.mobile || '-'}</td>
                      <td>{faculty.approvalStatus || '-'}</td>
                      <td>{formatDateTime(faculty.createdAt)}</td>
                      <td>{formatDateTime(faculty.updatedAt)}</td>
                      <td>
                        {faculty.approvalStatus === 'pending' ? (
                          <button
                            className="small-btn approve-btn"
                            onClick={() => onApproveFaculty(faculty._id)}
                            disabled={approvingId === faculty._id}
                          >
                            {approvingId === faculty._id ? 'Approving...' : 'Approve'}
                          </button>
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

        <h3 className="section-title">Students</h3>
        {loading ? (
          <p>Loading students...</p>
        ) : (
          <div className="table-wrap">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Enrollment</th>
                  <th>Mobile</th>
                  <th>Created At</th>
                  <th>Updated At</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="6">No students found.</td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student._id}>
                      <td>{student.name || '-'}</td>
                      <td>{student.email || '-'}</td>
                      <td>{student.enrollment || '-'}</td>
                      <td>{student.mobile || '-'}</td>
                      <td>{formatDateTime(student.createdAt)}</td>
                      <td>{formatDateTime(student.updatedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="section-title">LOR Requests</h3>
        {loading ? (
          <p>Loading LOR requests...</p>
        ) : (
          <div className="table-wrap">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Faculty</th>
                  <th>University</th>
                  <th>Program</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Remark</th>
                  <th>Created At</th>
                  <th>Updated At</th>
                </tr>
              </thead>
              <tbody>
                {lorRequests.length === 0 ? (
                  <tr>
                    <td colSpan="9">No LOR requests found.</td>
                  </tr>
                ) : (
                  lorRequests.map((request) => (
                    <tr key={request._id}>
                      <td>{request.studentId?.name || '-'}</td>
                      <td>{request.facultyId?.name || '-'}</td>
                      <td>{request.targetUniversity || '-'}</td>
                      <td>{request.program || '-'}</td>
                      <td>{request.dueDate || '-'}</td>
                      <td>{request.status || '-'}</td>
                      <td>{request.facultyRemark || '-'}</td>
                      <td>{formatDateTime(request.createdAt)}</td>
                      <td>{formatDateTime(request.updatedAt)}</td>
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

export default AdminDashboard;
