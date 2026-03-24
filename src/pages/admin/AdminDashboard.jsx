import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import useAuth from '../../hooks/useAuth.js';
import { tapButton, dropDown, rowItem } from '../../lib/motionVariants.js';
import {
  approveFaculty,
  cancelLorRequest,
  deleteFaculty,
  deleteLorRequest,
  listAdminFaculties,
  listAdminLorRequests,
  listAdminStudents,
  reassignLorRequest,
  rejectFaculty,
  toggleFacultyActive
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

const formatPercent = (value) => `${Math.round(value)}%`;

const downloadCsv = (filename, rows) => {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const hasLoadedRef = useRef(false);

  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [lorRequests, setLorRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('overview');

  // Faculty filter + action states
  const [facultyFilter, setFacultyFilter] = useState('all');
  const [approvingId, setApprovingId] = useState('');
  const [rejectingId, setRejectingId] = useState('');
  const [togglingId, setTogglingId] = useState('');
  const [deletingFacultyId, setDeletingFacultyId] = useState('');
  const [confirmDeleteFacultyId, setConfirmDeleteFacultyId] = useState('');
  const [openFacultyMenuId, setOpenFacultyMenuId] = useState('');

  // LOR filter + action states
  const [lorFilter, setLorFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState('');
  const [deletingLorId, setDeletingLorId] = useState('');
  const [confirmDeleteLorId, setConfirmDeleteLorId] = useState('');
  const [reassignState, setReassignState] = useState({ requestId: '', facultyId: '' });
  const [reassigningId, setReassigningId] = useState('');

  const approvedFaculties = useMemo(
    () => faculties.filter((f) => f.approvalStatus === 'approved' && f.isActive !== false),
    [faculties]
  );

  const pendingFacultyCount = useMemo(
    () => faculties.filter((faculty) => faculty.approvalStatus === 'pending').length,
    [faculties]
  );
  const completedLorCount = useMemo(
    () => lorRequests.filter((request) => request.status === 'approved').length,
    [lorRequests]
  );
  const pendingLorCount = useMemo(
    () => lorRequests.filter((request) => request.status === 'pending').length,
    [lorRequests]
  );
  const totalLorCount = lorRequests.length;

  const avgTatDays = useMemo(() => {
    if (lorRequests.length === 0) return 0;
    const finished = lorRequests.filter((request) => request.status === 'approved');
    if (finished.length === 0) return 0;
    const totalMs = finished.reduce((sum, request) => {
      const created = new Date(request.createdAt || '').getTime();
      const updated = new Date(request.updatedAt || '').getTime();
      if (Number.isNaN(created) || Number.isNaN(updated)) return sum;
      return sum + Math.max(0, updated - created);
    }, 0);
    return Math.round(totalMs / finished.length / (1000 * 60 * 60 * 24));
  }, [lorRequests]);

  const urgentRequests = useMemo(() => {
    const now = Date.now();
    const cutoff = now + 48 * 60 * 60 * 1000;
    return lorRequests
      .filter((request) => request.status === 'pending')
      .filter((request) => {
        const due = new Date(request.dueDate || '').getTime();
        return !Number.isNaN(due) && due <= cutoff;
      })
      .slice(0, 5);
  }, [lorRequests]);

  const formatDue = (value) => {
    if (!value) return '-';
    return String(value);
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const needle = searchTerm.toLowerCase();
    return students.filter((student) =>
      [student.name, student.email, student.enrollment, student.mobile]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [students, searchTerm]);

  const filteredFaculties = useMemo(() => {
    let list = facultyFilter === 'all'
      ? faculties
      : faculties.filter((f) => f.approvalStatus === facultyFilter);
    if (!searchTerm.trim()) return list;
    const needle = searchTerm.toLowerCase();
    return list.filter((faculty) =>
      [faculty.name, faculty.email, faculty.collegeEmail, faculty.department, faculty.mobile]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [faculties, searchTerm, facultyFilter]);

  const filteredLorRequests = useMemo(() => {
    let list = lorFilter === 'all'
      ? lorRequests
      : lorRequests.filter((r) => r.status === lorFilter);
    if (!searchTerm.trim()) return list;
    const needle = searchTerm.toLowerCase();
    return list.filter((request) =>
      [
        request.studentId?.name,
        request.facultyId?.name,
        request.targetUniversity,
        request.program,
        request.status
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [lorRequests, searchTerm, lorFilter]);

  const workloadByDepartment = useMemo(() => {
    const map = new Map();
    lorRequests.forEach((request) => {
      const department = request.facultyId?.department || 'Unknown';
      map.set(department, (map.get(department) || 0) + 1);
    });
    const total = lorRequests.length || 1;
    return Array.from(map.entries())
      .map(([department, count]) => ({
        department,
        count,
        percent: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [lorRequests]);

  const recentActivity = useMemo(() => {
    const items = lorRequests
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 6)
      .map((request) => ({
        title: `LOR ${request.status || 'updated'} for ${request.studentId?.name || 'student'}`,
        meta: `${request.facultyId?.name || 'Faculty'} • ${formatDateTime(request.updatedAt || request.createdAt)}`
      }));
    return items;
  }, [lorRequests]);

  const handleExport = () => {
    downloadCsv('lor_admin_report.csv', filteredLorRequests.map((request) => ({
      student: request.studentId?.name || '',
      faculty: request.facultyId?.name || '',
      university: request.targetUniversity || '',
      program: request.program || '',
      dueDate: request.dueDate || '',
      status: request.status || '',
      updatedAt: request.updatedAt || ''
    })));
  };

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

  useEffect(() => {
    const sections = ['overview', 'urgent', 'workload', 'activity', 'faculty', 'students', 'lor'];
    const handleScroll = () => {
      const offsets = sections.map((id) => {
        const el = document.getElementById(id);
        if (!el) return { id, top: Number.POSITIVE_INFINITY };
        return { id, top: el.getBoundingClientRect().top };
      });
      const visible = offsets
        .filter((item) => item.top <= 140)
        .sort((a, b) => b.top - a.top)[0];
      if (visible && visible.id !== activeSection) {
        setActiveSection(visible.id);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeSection]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (!e.target.closest('.faculty-menu')) setOpenFacultyMenuId('');
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const notify = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  // ── Faculty actions ──────────────────────────────────────────────
  const onApproveFaculty = async (facultyId) => {
    setApprovingId(facultyId);
    setError('');
    try {
      await approveFaculty(facultyId);
      notify('Faculty approved.');
      await loadDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setApprovingId('');
    }
  };

  const onRejectFaculty = async (facultyId) => {
    setRejectingId(facultyId);
    setError('');
    try {
      await rejectFaculty(facultyId);
      notify('Faculty rejected.');
      await loadDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRejectingId('');
    }
  };

  const onToggleFacultyActive = async (facultyId) => {
    setTogglingId(facultyId);
    setError('');
    try {
      await toggleFacultyActive(facultyId);
      notify('Faculty status updated.');
      await loadDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTogglingId('');
    }
  };

  const onDeleteFaculty = async (facultyId) => {
    setDeletingFacultyId(facultyId);
    setError('');
    try {
      await deleteFaculty(facultyId);
      notify('Faculty deleted.');
      setConfirmDeleteFacultyId('');
      await loadDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingFacultyId('');
    }
  };

  // ── LOR actions ──────────────────────────────────────────────────
  const onCancelLor = async (requestId) => {
    setCancellingId(requestId);
    setError('');
    try {
      await cancelLorRequest(requestId);
      notify('LOR request cancelled.');
      await loadDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCancellingId('');
    }
  };

  const onReassignLor = async () => {
    const { requestId, facultyId } = reassignState;
    if (!facultyId) return;
    setReassigningId(requestId);
    setError('');
    try {
      await reassignLorRequest(requestId, facultyId);
      notify('LOR request reassigned.');
      setReassignState({ requestId: '', facultyId: '' });
      await loadDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setReassigningId('');
    }
  };

  const onDeleteLor = async (requestId) => {
    setDeletingLorId(requestId);
    setError('');
    try {
      await deleteLorRequest(requestId);
      notify('LOR request deleted.');
      setConfirmDeleteLorId('');
      await loadDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingLorId('');
    }
  };

  return (
    <main className="admin-dashboard">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <h3>The Digital Atelier</h3>
            <p>Academic Year {new Date().getFullYear()}</p>
          </div>
          <nav className="admin-nav">
            <a href="#overview" className={`admin-nav-link ${activeSection === 'overview' ? 'active' : ''}`}>Overview</a>
            <a href="#urgent" className={`admin-nav-link ${activeSection === 'urgent' ? 'active' : ''}`}>Urgent Requests</a>
            <a href="#workload" className={`admin-nav-link ${activeSection === 'workload' ? 'active' : ''}`}>Workload</a>
            <a href="#activity" className={`admin-nav-link ${activeSection === 'activity' ? 'active' : ''}`}>Activity</a>
            <a href="#faculty" className={`admin-nav-link ${activeSection === 'faculty' ? 'active' : ''}`}>
              Faculty
              {pendingFacultyCount > 0 && (
                <span className="nav-badge">{pendingFacultyCount}</span>
              )}
            </a>
            <a href="#students" className={`admin-nav-link ${activeSection === 'students' ? 'active' : ''}`}>Students</a>
            <a href="#lor" className={`admin-nav-link ${activeSection === 'lor' ? 'active' : ''}`}>LOR Requests</a>
          </nav>
        </aside>

        <section className="admin-shell">
          <div className="admin-topbar">
            <div className="admin-topbar-title">
              <h3>Dashboard</h3>
              <p>Admin Operations</p>
            </div>
            <div className="admin-search">
              <span className="admin-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search records..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <header id="overview" className="admin-hero">
            <div>
              <p className="admin-eyebrow">Registrar Office</p>
              <h2>Institutional Overview</h2>
              <p className="admin-subtitle">Welcome {user?.name || 'Admin'} — review approvals, students, and LOR activity in one place.</p>
            </div>
            <div className="admin-hero-actions">
              <motion.button className="primary-btn" onClick={logout} {...tapButton}>Logout</motion.button>
            </div>
          </header>

          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <p className="info-label">Total Requests</p>
              <p className="info-value">{totalLorCount}</p>
            </div>
            <div className="admin-stat-card">
              <p className="info-label">Completed LORs</p>
              <p className="info-value">{completedLorCount}</p>
            </div>
            <div className="admin-stat-card">
              <p className="info-label">Pending LORs</p>
              <p className="info-value">{pendingLorCount}</p>
            </div>
            <div className="admin-stat-card">
              <p className="info-label">Avg. TAT (Days)</p>
              <p className="info-value">{avgTatDays || 0}</p>
            </div>
          </div>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

          <section id="urgent" className="admin-card">
            <div className="admin-section-head">
              <h3 className="section-title">Urgent Requests (Next 48 Hours)</h3>
              <span className="admin-pill">Deadline &lt; 48h</span>
            </div>
            {loading ? (
              <p>Loading urgent requests...</p>
            ) : urgentRequests.length === 0 ? (
              <p className="small-text">No urgent pending requests.</p>
            ) : (
              <div className="table-wrap admin-table-card">
                <table className="simple-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Faculty</th>
                      <th>Deadline</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {urgentRequests.map((request) => (
                      <tr key={request._id}>
                        <td>{request.studentId?.name || '-'}</td>
                        <td>{request.facultyId?.name || '-'}</td>
                        <td>{formatDue(request.dueDate)}</td>
                        <td>
                          <span className={`status-badge status-${request.status}`}>{request.status || '-'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="workload" className="admin-split">
            <div className="admin-card">
              <div className="admin-section-head">
                <h3 className="section-title">Workload Distribution</h3>
                <span className="admin-pill subtle">Live</span>
              </div>
              {workloadByDepartment.length === 0 ? (
                <p className="small-text">No workload data yet.</p>
              ) : (
                <div className="admin-workload-list">
                  {workloadByDepartment.map((item) => (
                    <div key={item.department} className="admin-workload-item">
                      <div className="admin-workload-meta">
                        <span>{item.department}</span>
                        <strong>{formatPercent(item.percent)}</strong>
                      </div>
                      <div className="admin-workload-bar">
                        <div className="admin-workload-fill" style={{ width: `${Math.max(8, item.percent)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div id="activity" className="admin-card admin-insight">
              <div>
                <p className="admin-eyebrow">Atelier Insights</p>
                <h4>Submission cadence is steady.</h4>
                <p className="small-text">
                  Based on current approvals, you are trending {completedLorCount}/{totalLorCount} completions this term.
                </p>
              </div>
              <motion.button className="primary-btn" onClick={handleExport} {...tapButton}>Download Report</motion.button>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-section-head">
              <h3 className="section-title">Recent Activity</h3>
              <span className="admin-pill subtle">Latest Updates</span>
            </div>
            {recentActivity.length === 0 ? (
              <p className="small-text">No recent activity.</p>
            ) : (
              <ul className="admin-activity-list">
                {recentActivity.map((item) => (
                  <li key={item.title} className="admin-activity-item">
                    <span className="admin-activity-dot" />
                    <div>
                      <p>{item.title}</p>
                      <span>{item.meta}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

        {/* ── Faculty Table ───────────────────────────────────── */}
        <h3 id="faculty" className="section-title">Faculty Accounts</h3>
        <div className="filter-row">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <motion.button
              key={f}
              className={`filter-chip ${facultyFilter === f ? 'active' : ''}`}
              onClick={() => setFacultyFilter(f)}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {f}
            </motion.button>
          ))}
        </div>
        {loading ? (
          <p>Loading faculties...</p>
        ) : (
          <div className="table-wrap admin-table-card">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Mobile</th>
                  <th>Status</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculties.length === 0 ? (
                  <tr>
                    <td colSpan="7">No faculty accounts found.</td>
                  </tr>
                ) : (
                  filteredFaculties.map((faculty) => {
                    const isActive = faculty.isActive !== false;
                    const menuOpen = openFacultyMenuId === faculty._id;
                    const busy = togglingId === faculty._id || deletingFacultyId === faculty._id;
                    return (
                      <tr key={faculty._id}>
                        <td>{faculty.name || '-'}</td>
                        <td>
                          <div>{faculty.email || '-'}</div>
                          {faculty.collegeEmail && faculty.collegeEmail !== faculty.email && (
                            <div className="cell-sub">{faculty.collegeEmail}</div>
                          )}
                        </td>
                        <td>{faculty.department || '-'}</td>
                        <td>{faculty.mobile || '-'}</td>
                        <td>
                          <span className={`status-badge status-${faculty.approvalStatus}`}>
                            {faculty.approvalStatus || '-'}
                          </span>
                        </td>
                        <td>
                          <div className="faculty-menu">
                            <motion.button
                              className={`faculty-menu-trigger ${isActive ? 'active-state' : 'inactive-state'}`}
                              onClick={() => setOpenFacultyMenuId(menuOpen ? '' : faculty._id)}
                              disabled={busy}
                              {...tapButton}
                            >
                              {busy ? '…' : isActive ? 'Active ▾' : 'Inactive ▾'}
                            </motion.button>
                            <AnimatePresence>
                            {menuOpen && (
                              <motion.div className="faculty-menu-dropdown" {...dropDown} style={{ transformOrigin: 'top left' }}>
                                <button
                                  className="faculty-menu-item"
                                  onClick={() => { onToggleFacultyActive(faculty._id); setOpenFacultyMenuId(''); }}
                                >
                                  {isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <div className="faculty-menu-divider" />
                                {confirmDeleteFacultyId === faculty._id ? (
                                  <div className="faculty-menu-confirm">
                                    <span>Sure?</span>
                                    <button
                                      className="faculty-menu-item danger"
                                      onClick={() => { onDeleteFaculty(faculty._id); setOpenFacultyMenuId(''); }}
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      className="faculty-menu-item"
                                      onClick={() => setConfirmDeleteFacultyId('')}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className="faculty-menu-item danger"
                                    onClick={() => setConfirmDeleteFacultyId(faculty._id)}
                                  >
                                    Delete
                                  </button>
                                )}
                              </motion.div>
                            )}
                            </AnimatePresence>
                          </div>
                        </td>
                        <td>
                          {faculty.approvalStatus === 'pending' ? (
                            <div className="action-group">
                              <button
                                className="small-btn approve-btn"
                                onClick={() => onApproveFaculty(faculty._id)}
                                disabled={approvingId === faculty._id}
                              >
                                {approvingId === faculty._id ? '…' : 'Approve'}
                              </button>
                              <button
                                className="small-btn danger-btn"
                                onClick={() => onRejectFaculty(faculty._id)}
                                disabled={rejectingId === faculty._id}
                              >
                                {rejectingId === faculty._id ? '…' : 'Reject'}
                              </button>
                            </div>
                          ) : (
                            <span className="muted-dash">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Students Table ──────────────────────────────────── */}
        <h3 id="students" className="section-title">Students</h3>
        {loading ? (
          <p>Loading students...</p>
        ) : (
          <div className="table-wrap admin-table-card">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Enrollment</th>
                  <th>Mobile</th>
                  <th>Govt ID</th>
                  <th>Created At</th>
                  <th>Updated At</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7">No students found.</td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student._id}>
                      <td>{student.name || '-'}</td>
                      <td>{student.email || '-'}</td>
                      <td>{student.enrollment || '-'}</td>
                      <td>{student.mobile || '-'}</td>
                      <td>{student.govtId || <span className="muted-dash">—</span>}</td>
                      <td>{formatDateTime(student.createdAt)}</td>
                      <td>{formatDateTime(student.updatedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── LOR Requests Table ──────────────────────────────── */}
        <h3 id="lor" className="section-title">LOR Requests</h3>
        <div className="filter-row">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <motion.button
              key={f}
              className={`filter-chip ${lorFilter === f ? 'active' : ''}`}
              onClick={() => setLorFilter(f)}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {f}
            </motion.button>
          ))}
        </div>
        {loading ? (
          <p>Loading LOR requests...</p>
        ) : (
          <div className="table-wrap admin-table-card">
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLorRequests.length === 0 ? (
                  <tr>
                    <td colSpan="8">No LOR requests found.</td>
                  </tr>
                ) : (
                  filteredLorRequests.map((request) => (
                    <tr key={request._id}>
                      <td>{request.studentId?.name || '-'}</td>
                      <td>{request.facultyId?.name || '-'}</td>
                      <td>{request.targetUniversity || '-'}</td>
                      <td>{request.program || '-'}</td>
                      <td>{request.dueDate || '-'}</td>
                      <td>
                        <span className={`status-badge status-${request.status}`}>
                          {request.status || '-'}
                        </span>
                      </td>
                      <td>{request.facultyRemark || '-'}</td>
                      <td>
                        <div className="action-group">
                          {request.status === 'pending' && (
                            <>
                              <button
                                className="small-btn danger-btn"
                                onClick={() => onCancelLor(request._id)}
                                disabled={cancellingId === request._id}
                              >
                                {cancellingId === request._id ? '...' : 'Cancel'}
                              </button>

                              {reassignState.requestId === request._id ? (
                                <div className="reassign-group">
                                  <select
                                    className="reassign-select"
                                    value={reassignState.facultyId}
                                    onChange={(e) => setReassignState((prev) => ({ ...prev, facultyId: e.target.value }))}
                                  >
                                    <option value="">Pick faculty…</option>
                                    {approvedFaculties.map((f) => (
                                      <option key={f._id} value={f._id}>{f.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    className="small-btn approve-btn"
                                    onClick={onReassignLor}
                                    disabled={reassigningId === request._id || !reassignState.facultyId}
                                  >
                                    {reassigningId === request._id ? '...' : 'Confirm'}
                                  </button>
                                  <button
                                    className="small-btn"
                                    onClick={() => setReassignState({ requestId: '', facultyId: '' })}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="small-btn secondary-btn"
                                  onClick={() => setReassignState({ requestId: request._id, facultyId: '' })}
                                >
                                  Reassign
                                </button>
                              )}
                            </>
                          )}

                          {confirmDeleteLorId === request._id ? (
                            <>
                              <button
                                className="small-btn danger-btn"
                                onClick={() => onDeleteLor(request._id)}
                                disabled={deletingLorId === request._id}
                              >
                                {deletingLorId === request._id ? '...' : 'Confirm'}
                              </button>
                              <button
                                className="small-btn"
                                onClick={() => setConfirmDeleteLorId('')}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              className="small-btn danger-btn"
                              onClick={() => setConfirmDeleteLorId(request._id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        </section>
      </div>
    </main>
  );
};

export default AdminDashboard;
