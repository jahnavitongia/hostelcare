import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  AlertCircle,
  ClipboardList,
  DoorOpen,
  LayoutDashboard,
  LogIn,
  PlusCircle,
  Search,
  ShieldCheck,
  Settings,
  Wrench
} from 'lucide-react';
import {
  CREATE_ISSUE_MUTATION,
  ISSUE_QUERY,
  ISSUES_QUERY,
  LOGIN_MUTATION,
  UPDATE_ISSUE_MUTATION
} from './graphql';

const statusOptions = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const statusProgress = {
  OPEN: 20,
  IN_PROGRESS: 55,
  RESOLVED: 85,
  CLOSED: 100
};

const statusColors = {
  OPEN: '#f04438',
  IN_PROGRESS: '#175cd3',
  RESOLVED: '#12b76a',
  CLOSED: '#667085'
};

function readSession() {
  return {
    token: localStorage.getItem('token'),
    username: localStorage.getItem('username'),
    role: localStorage.getItem('role')
  };
}

function statusClass(status) {
  return `status status-${status.toLowerCase().replace('_', '-')}`;
}

function statusLabel(status) {
  return status.replace('_', ' ');
}

function statusColor(status) {
  return statusColors[status] || statusColors.OPEN;
}

function getStatusProgress(status) {
  return statusProgress[status] || 0;
}

function buildSummary(issues) {
  return issues.reduce(
    (summary, issue) => {
      summary.counts[issue.status] += 1;
      summary.total += 1;
      summary.progress += getStatusProgress(issue.status);
      summary.lastUpdated = Math.max(summary.lastUpdated, new Date(issue.updatedAt).getTime());
      return summary;
    },
    {
      counts: statusOptions.reduce((accumulator, status) => {
        accumulator[status] = 0;
        return accumulator;
      }, {}),
      total: 0,
      progress: 0,
      lastUpdated: 0
    }
  );
}

function sortIssues(issues, sortBy) {
  const sorted = [...issues];

  sorted.sort((left, right) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(left.createdAt) - new Date(right.createdAt);
      case 'title':
        return left.title.localeCompare(right.title);
      case 'status':
        return statusOptions.indexOf(left.status) - statusOptions.indexOf(right.status);
      case 'updated':
        return new Date(right.updatedAt) - new Date(left.updatedAt);
      case 'newest':
      default:
        return new Date(right.createdAt) - new Date(left.createdAt);
    }
  });

  return sorted;
}

function formatCount(count) {
  return String(count).padStart(2, '0');
}

function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

function IssueChart({ summary, activeStatus, onSelectStatus }) {
  const chartData = statusOptions.map((status) => ({
    status,
    name: statusLabel(status),
    value: summary.counts[status],
    color: statusColor(status)
  }));
  const activeLabel = activeStatus === 'ALL' ? 'All issues' : statusLabel(activeStatus);
  const activeCount = activeStatus === 'ALL' ? summary.total : summary.counts[activeStatus];

  function handleSliceClick(entry) {
    if (!entry?.status) {
      return;
    }

    onSelectStatus(activeStatus === entry.status ? 'ALL' : entry.status);
  }

  return (
    <article className="panel analytics-panel">
      <div className="analytics-copy">
        <p className="eyebrow">Live snapshot</p>
        <h2>Issue distribution</h2>
        <p>Tap a slice or legend item to focus the queue. The chart reflects all demo issues loaded in memory.</p>
      </div>
      <div className="chart-shell">
        <div className="chart-stage">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Tooltip
                cursor={{ fill: 'rgba(31, 94, 255, 0.06)' }}
                contentStyle={{
                  border: '1px solid #d9dee7',
                  borderRadius: '12px',
                  boxShadow: '0 16px 40px rgba(16, 24, 40, 0.12)'
                }}
                formatter={(value, name, props) => [`${value} issues`, props.payload.name]}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={72}
                outerRadius={108}
                paddingAngle={4}
                stroke="transparent"
                onClick={handleSliceClick}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={entry.color} opacity={entry.status === activeStatus || activeStatus === 'ALL' ? 1 : 0.45} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-center" aria-hidden="true">
            <strong>{formatCount(activeCount)}</strong>
            <span>{activeLabel}</span>
            <small>{activeStatus === 'ALL' ? 'Showing the full queue' : 'Tap a slice to focus'}</small>
          </div>
        </div>
        <button className="chart-focus" type="button" onClick={() => onSelectStatus('ALL')}>
          <strong>{activeStatus === 'ALL' ? 'All issues' : statusLabel(activeStatus)}</strong>
          <span>{activeStatus === 'ALL' ? 'Viewing the full queue' : 'Tap to clear the focus'}</span>
        </button>
      </div>
      <div className="legend-stack">
        {statusOptions.map((status) => (
          <button
            key={status}
            type="button"
            className={`legend-item ${activeStatus === status ? 'is-active' : ''}`}
            onClick={() => onSelectStatus(activeStatus === status ? 'ALL' : status)}
          >
            <span className="legend-swatch" style={{ background: statusColor(status) }} />
            <strong>{statusLabel(status)}</strong>
            <span>{formatCount(summary.counts[status])}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

function filterIssues(issues, searchTerm) {
  const query = searchTerm.trim().toLowerCase();

  if (!query) {
    return issues;
  }

  return issues.filter((issue) => {
    return [
      issue.title,
      issue.description,
      issue.status.replace('_', ' '),
      issue.reporter,
      issue.id
    ].some((value) => value.toLowerCase().includes(query));
  });
}

function Shell({ searchTerm, session, onLogout, onSearchChange }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-mark"><Wrench size={20} /></span>
          <span>HostelCare</span>
        </Link>

        <nav>
          <NavLink to="/issues"><LayoutDashboard size={17} /> Workspace</NavLink>
          <NavLink to="/report"><PlusCircle size={17} /> New issue</NavLink>
          <NavLink to="/admin"><ShieldCheck size={17} /> Administration</NavLink>
        </nav>

        <div className="session-card">
          <small>Signed in as</small>
          <span>{session.username || 'Guest user'}</span>
          <strong>{session.role || 'Unauthenticated'}</strong>
          {session.token ? (
            <button className="ghost-button" onClick={onLogout}>
              <DoorOpen size={16} /> Logout
            </button>
          ) : (
            <Link className="ghost-button" to="/login">
              <LogIn size={16} /> Login
            </Link>
          )}
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <label className="search-box" aria-label="Search issues">
            <Search size={16} />
            <input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search issues, rooms, or reporters"
            />
          </label>
          <Link className="icon-button" title="Settings" aria-label="Settings" to="/settings">
            <Settings size={17} />
          </Link>
        </header>

        <div className="workspace">
          <Routes>
            <Route path="/" element={<Navigate to="/issues" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/report" element={<Protected session={session}><ReportIssue /></Protected>} />
            <Route path="/issues" element={<IssueList searchTerm={searchTerm} />} />
            <Route path="/issues/:id" element={<IssueDetail />} />
            <Route path="/admin" element={<Protected session={session}><AdminDashboard searchTerm={searchTerm} session={session} /></Protected>} />
            <Route path="/settings" element={<SettingsPage session={session} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function Protected({ session, children }) {
  if (!session.token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('ria');
  const [password, setPassword] = useState('password');
  const [login, { loading, error }] = useMutation(LOGIN_MUTATION);

  async function handleSubmit(event) {
    event.preventDefault();
    const { data } = await login({ variables: { username, password } });
    localStorage.setItem('token', data.login.token);
    localStorage.setItem('username', data.login.username);
    localStorage.setItem('role', data.login.role);
    window.dispatchEvent(new Event('storage'));
    navigate('/issues');
  }

  return (
    <section className="page-grid login-view">
      <div className="login-copy">
        <div className="login-brand">
          <span className="brand-mark large"><Wrench size={28} /></span>
          <span>
            <strong>HostelCare</strong>
            <small>Issue desk</small>
          </span>
        </div>
        <p className="eyebrow">Resident and staff access</p>
        <h1>Operational issue tracking for hostel facilities.</h1>
        <p className="lede">Use any username and password. Prefix the username with admin to unlock status controls.</p>
      </div>
      <form className="panel form-panel" onSubmit={handleSubmit}>
        <div className="form-heading">
          <h2>Sign in</h2>
          <p>Access the issue workspace.</p>
        </div>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className="error"><AlertCircle size={16} /> {error.message}</p>}
        <button className="primary-button" disabled={loading}>
          <LogIn size={18} /> {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </section>
  );
}

function ReportIssue() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [createIssue, { loading, error }] = useMutation(CREATE_ISSUE_MUTATION, {
    refetchQueries: [{ query: ISSUES_QUERY }]
  });

  async function handleSubmit(event) {
    event.preventDefault();
    const { data } = await createIssue({ variables: { title, description } });
    setTitle('');
    setDescription('');
    navigate(`/issues/${data.createIssue.id}`);
  }

  return (
    <section>
      <header className="page-header">
        <p className="eyebrow">New report</p>
        <h1>Submit a hostel facility issue.</h1>
        <p>Capture the location, context, and urgency so the administration team can route the work quickly.</p>
      </header>
      <form className="panel form-panel wide" onSubmit={handleSubmit}>
        <label>
          Issue title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Leaky faucet in room 301" />
        </label>
        <label>
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows="6" placeholder="Add location, timing, and anything urgent." />
        </label>
        {error && <p className="error"><AlertCircle size={16} /> {error.message}</p>}
        <button className="primary-button" disabled={loading}>
          <PlusCircle size={18} /> {loading ? 'Submitting...' : 'Submit issue'}
        </button>
      </form>
    </section>
  );
}

function IssueList({ searchTerm }) {
  const { data, loading, error } = useQuery(ISSUES_QUERY, { pollInterval: 8000 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('updated');

  const summary = useMemo(() => buildSummary(data?.issues || []), [data?.issues]);
  const filteredIssues = useMemo(() => {
    const searched = filterIssues(data?.issues || [], searchTerm);
    const scoped = statusFilter === 'ALL' ? searched : searched.filter((issue) => issue.status === statusFilter);
    return sortIssues(scoped, sortBy);
  }, [data?.issues, searchTerm, sortBy, statusFilter]);
  const spotlightIssue = filteredIssues[0];
  const resolvedRate = summary.total ? Math.round(((summary.counts.RESOLVED + summary.counts.CLOSED) / summary.total) * 100) : 0;
  const averageProgress = summary.total ? Math.round(summary.progress / summary.total) : 0;

  if (loading) return <p className="muted">Loading issues...</p>;
  if (error) return <p className="error"><AlertCircle size={16} /> {error.message}</p>;

  return (
    <section>
      <header className="page-header">
        <p className="eyebrow">Workspace</p>
        <div className="header-row">
          <div>
            <h1>Issue queue</h1>
            <p>
              {searchTerm.trim()
                ? `Showing matches for "${searchTerm.trim()}".`
                : 'Track resident reports and current maintenance progress.'}
            </p>
          </div>
          <Link className="primary-button compact" to="/report">
            <PlusCircle size={17} /> New issue
          </Link>
        </div>
      </header>
      <div className="dashboard-grid">
        <IssueChart summary={summary} activeStatus={statusFilter} onSelectStatus={setStatusFilter} />
        <div className="insights-grid">
          <div className="stat accent">
            <span>Total issues</span>
            <strong>{formatCount(summary.total)}</strong>
            <small>Live demo queue</small>
          </div>
          <div className="stat accent">
            <span>Open queue</span>
            <strong>{formatCount(summary.counts.OPEN + summary.counts.IN_PROGRESS)}</strong>
            <small>Needs attention</small>
          </div>
          <div className="stat accent">
            <span>Resolution rate</span>
            <strong>{formatCount(resolvedRate)}%</strong>
            <small>Resolved or closed</small>
          </div>
          <div className="stat accent">
            <span>Avg progress</span>
            <strong>{formatCount(averageProgress)}%</strong>
            <small>All statuses blended</small>
          </div>
        </div>
      </div>
      <div className="list-toolbar">
        <div className="chip-group" role="tablist" aria-label="Issue status filters">
          <button type="button" className={`chip ${statusFilter === 'ALL' ? 'is-active' : ''}`} onClick={() => setStatusFilter('ALL')}>
            All
          </button>
          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              className={`chip ${statusFilter === status ? 'is-active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {statusLabel(status)}
            </button>
          ))}
        </div>
        <label className="sort-control">
          <span>Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="updated">Recently updated</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title</option>
            <option value="status">Status</option>
          </select>
        </label>
      </div>
      {spotlightIssue && (
        <article className="panel spotlight-card">
          <div>
            <p className="eyebrow">Featured issue</p>
            <h2>{spotlightIssue.title}</h2>
            <p>{spotlightIssue.description}</p>
          </div>
          <div className="spotlight-meta">
            <span className={statusClass(spotlightIssue.status)}>{statusLabel(spotlightIssue.status)}</span>
            <strong>{spotlightIssue.reporter}</strong>
            <small>{formatDateTime(spotlightIssue.updatedAt)}</small>
          </div>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${getStatusProgress(spotlightIssue.status)}%`, background: statusColor(spotlightIssue.status) }} />
          </div>
          <Link className="inline-link" to={`/issues/${spotlightIssue.id}`}>Open issue detail</Link>
        </article>
      )}
      <div className="issue-list">
        {filteredIssues.map((issue) => (
          <Link to={`/issues/${issue.id}`} className="issue-row" key={issue.id}>
            <div className="issue-main">
              <ClipboardList size={18} />
              <div>
                <h2>{issue.title}</h2>
                <p>{issue.description}</p>
              </div>
            </div>
            <span>{issue.reporter}</span>
            <span className={statusClass(issue.status)}>{statusLabel(issue.status)}</span>
          </Link>
        ))}
        {filteredIssues.length === 0 && (
          <div className="empty-state">
            <Search size={22} />
            <strong>No issues found</strong>
            <span>Try another title, room, reporter, or status filter.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function IssueDetail() {
  const { id } = useParams();
  const { data, loading, error } = useQuery(ISSUE_QUERY, { variables: { id } });

  if (loading) return <p className="muted">Loading issue...</p>;
  if (error) return <p className="error"><AlertCircle size={16} /> {error.message}</p>;
  if (!data.issue) return <p className="muted">Issue not found.</p>;

  const issue = data.issue;

  return (
    <article className="panel detail-panel">
      <span className={statusClass(issue.status)}>{statusLabel(issue.status)}</span>
      <h1>{issue.title}</h1>
      <p>{issue.description}</p>
      <dl>
        <div><dt>Reporter</dt><dd>{issue.reporter}</dd></div>
        <div><dt>Created</dt><dd>{formatDateTime(issue.createdAt)}</dd></div>
        <div><dt>Updated</dt><dd>{formatDateTime(issue.updatedAt)}</dd></div>
      </dl>
      <Link className="ghost-button inline-link" to="/issues">Back to issues</Link>
    </article>
  );
}

function AdminDashboard({ searchTerm, session }) {
  const { data, loading, error } = useQuery(ISSUES_QUERY);
  const filteredIssues = filterIssues(data?.issues || [], searchTerm);
  const [updateIssue, updateState] = useMutation(UPDATE_ISSUE_MUTATION, {
    refetchQueries: [{ query: ISSUES_QUERY }]
  });
  const isAdmin = session.role === 'ADMIN';

  if (loading) return <p className="muted">Loading admin queue...</p>;
  if (error) return <p className="error"><AlertCircle size={16} /> {error.message}</p>;

  return (
    <section>
      <header className="page-header">
        <p className="eyebrow">Admin dashboard</p>
        <h1>Maintenance operations</h1>
        <p>
          {searchTerm.trim()
            ? `Showing admin rows matching "${searchTerm.trim()}".`
            : 'Review intake and move issues through the operational workflow.'}
        </p>
      </header>
      {!isAdmin && <p className="notice">Login with a username like admin-warden to update statuses.</p>}
      <div className="table-panel">
        {filteredIssues.map((issue) => (
          <div className="table-row" key={issue.id}>
            <div>
              <strong>{issue.title}</strong>
              <span>Reported by {issue.reporter}</span>
            </div>
            <select
              value={issue.status}
              disabled={!isAdmin || updateState.loading}
              onChange={(event) => updateIssue({ variables: { id: issue.id, status: event.target.value } })}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </div>
        ))}
        {filteredIssues.length === 0 && (
          <div className="empty-state">
            <Search size={22} />
            <strong>No admin rows found</strong>
            <span>Try another title, reporter, issue id, or status.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function SettingsPage({ session }) {
  return (
    <section>
      <header className="page-header">
        <p className="eyebrow">Settings</p>
        <h1>Workspace settings</h1>
        <p>Manage the current demo workspace preferences and account context.</p>
      </header>

      <div className="settings-grid">
        <div className="panel settings-panel">
          <div>
            <h2>Account</h2>
            <p>Current session details from the local JWT login flow.</p>
          </div>
          <dl className="settings-list">
            <div><dt>User</dt><dd>{session.username || 'Guest user'}</dd></div>
            <div><dt>Role</dt><dd>{session.role || 'Unauthenticated'}</dd></div>
            <div><dt>Access</dt><dd>{session.token ? 'Active session' : 'Login required'}</dd></div>
          </dl>
        </div>

        <div className="panel settings-panel">
          <div>
            <h2>Issue workflow</h2>
            <p>Status values used by the GraphQL API and admin dashboard.</p>
          </div>
          <div className="status-stack">
            {statusOptions.map((status) => (
              <span className={statusClass(status)} key={status}>{status.replace('_', ' ')}</span>
            ))}
          </div>
        </div>

        <div className="panel settings-panel">
          <div>
            <h2>Notifications</h2>
            <p>New issues and status updates emit Node.js EventEmitter notifications on the backend.</p>
          </div>
          <p className="muted">This micro-project logs notifications to the API process for easy local inspection.</p>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [session, setSession] = useState(readSession);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    function syncSession() {
      setSession(readSession());
    }

    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setSession(readSession());
  }

  return (
    <BrowserRouter>
      <Shell
        searchTerm={searchTerm}
        session={session}
        onLogout={handleLogout}
        onSearchChange={setSearchTerm}
      />
    </BrowserRouter>
  );
}

export default App;
