import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { api } from './api';
import LabActions from './LabActions.jsx';
import { useLabLaunch } from './useLabLaunch';
import LabLaunchFeedback from './LabLaunchFeedback';
import StudentClasses from './StudentClasses';
import ClassWorkspace from './ClassWorkspace';
import ProfileMenu from './ProfileMenu';
import TeacherOverview from './TeacherOverview';
import TeacherClasses from './TeacherClasses';
import TeacherAssignments from './TeacherAssignments';
import TeacherMonitor from './TeacherMonitor';
import StudentOverview from './StudentOverview';
import LabCatalog from './LabCatalog';
import HistoryPage from './HistoryPage';
function Auth({ onLogin }) {
    const [error, setError] = useState('');
    const [register, setRegister] = useState(false);
    const submit = async (event) => {
        event.preventDefault();
        setError('');
        const data = Object.fromEntries(new FormData(event.currentTarget));
        try {
            const user = await api(register ? '/auth/register-student' : '/auth/login', { method: 'POST', body: JSON.stringify(data) });
            onLogin(user);
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to sign in');
        }
    };
    return _jsxs("main", { className: "auth-shell", children: [_jsxs("div", { className: "auth-brand", children: [_jsx("div", { className: "brand-mark", children: "CR" }), _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "CYBER RANGE" }), _jsxs("h1", { children: ["Learn security", _jsx("br", {}), "by doing."] }), _jsx("p", { className: "muted", children: "Purpose-built practice labs. Safe by design." })] }), _jsxs("div", { className: "auth-art", children: [_jsx("span", { children: "01" }), _jsx("span", { children: "10" }), _jsx("span", { children: "01" }), _jsx("span", { children: "11" }), _jsx("i", { children: "\u2301" })] })] }), _jsxs("section", { className: "auth-card", children: [_jsx("p", { className: "eyebrow", children: "STUDENT & FACULTY PORTAL" }), _jsx("h2", { children: register ? 'Join your class' : 'Welcome back' }), _jsx("p", { className: "muted", children: "Sign in to continue to your learning space." }), _jsxs("form", { onSubmit: submit, className: "form-stack", children: [register && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["First name", _jsx("input", { required: true, name: "first_name", autoComplete: "given-name" })] }), _jsxs("label", { children: ["Last name", _jsx("input", { required: true, name: "last_name", autoComplete: "family-name" })] }), _jsxs("label", { children: ["Class join code", _jsx("input", { required: true, name: "join_code", minLength: 8, maxLength: 8, autoCapitalize: "characters" })] })] }), _jsxs("label", { children: ["Email address", _jsx("input", { required: true, name: "email", type: "email", autoComplete: "email" })] }), _jsxs("label", { children: ["Password", _jsx("input", { required: true, name: "password", type: "password", minLength: 12, autoComplete: register ? 'new-password' : 'current-password' })] }), error && _jsx("p", { role: "alert", className: "error-banner", children: error }), _jsxs("button", { className: "button primary wide", children: [register ? 'Create student account' : 'Sign in', _jsx("span", { children: "\u2192" })] })] }), _jsx("button", { className: "text-button", onClick: () => setRegister(!register), children: register ? 'Already have an account? Sign in' : 'New student? Join with a class code' }), _jsx("p", { className: "fineprint", children: "Use of this platform is limited to authorized educational activity." })] })] });
}
function Aup({ onAccept }) {
    return _jsx("div", { className: "modal-backdrop", children: _jsxs("section", { className: "modal", "aria-labelledby": "aup-title", children: [_jsx("div", { className: "icon-box", children: "\u25C7" }), _jsx("p", { className: "eyebrow", children: "BEFORE YOU START" }), _jsx("h2", { id: "aup-title", children: "Acceptable Use Policy" }), _jsx("p", { children: "This college prototype presents simulated cybersecurity lessons and does not connect to target systems. Use it for authorized education only. Do not use lesson examples against real systems, people, or networks." }), _jsxs("button", { className: "button primary wide", onClick: onAccept, children: ["I understand and agree ", _jsx("span", { children: "\u2192" })] })] }) });
}
function Shell({ user, onLogout }) {
    const queryClient = useQueryClient();
    const { pathname } = useLocation();
    useEffect(() => { document.documentElement.scrollTop = 0; document.body.scrollTop = 0; }, [pathname]);
    const signOut = async () => { await onLogout(); queryClient.clear(); };
    const [dark, setDark] = useState(localStorage.getItem('dark') === 'true');
    useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('dark', String(dark)); }, [dark]);

    return _jsxs("div", { className: "app-shell", children: [_jsxs("aside", { className: "sidebar", children: [_jsxs(Link, { className: "brand", to: "/", children: [_jsx("div", { className: "brand-mark small", children: "CR" }), _jsxs("span", { children: ["cyber", _jsx("span", { className: "brand-light", children: "range" })] })] }), _jsx("p", { className: "nav-label", children: "WORKSPACE" }), _jsxs("nav", { children: [user.role !== "admin" && _jsxs(NavLink, { to: "/", end: true, className: ({ isActive }) => isActive ? "nav-item active" : "nav-item", children: [_jsx("span", { children: "\u2302" }), "Overview"] }), user.role !== "admin" && _jsxs(NavLink, { to: "/labs", end: false, className: ({ isActive }) => isActive ? "nav-item active" : "nav-item", children: [_jsx("span", { children: "\u25A6" }), "Lab catalog"] }), user.role === 'student' && _jsxs(NavLink, { to: "/classes", end: false, className: ({ isActive }) => isActive ? "nav-item active" : "nav-item", children: [_jsx("span", { children: "▤" }), "My classes"] }), user.role === 'student' && _jsxs(NavLink, { to: "/history", end: false, className: ({ isActive }) => isActive ? "nav-item active" : "nav-item", children: [_jsx("span", { children: "\u25F7" }), "History"] }), user.role === 'teacher' && _jsxs(_Fragment, { children: [_jsxs(NavLink, { to: "/classes", end: false, className: ({ isActive }) => isActive ? "nav-item active" : "nav-item", children: [_jsx("span", { children: "\u25A4" }), "Classes"] }), _jsxs(NavLink, { to: "/assignments", end: false, className: ({ isActive }) => isActive ? "nav-item active" : "nav-item", children: [_jsx("span", { children: "\u25A5" }), "Assignments"] }), _jsxs(NavLink, { to: "/monitor", end: false, className: ({ isActive }) => isActive ? "nav-item active" : "nav-item", children: [_jsx("span", { children: "\u25C9" }), "Live monitor"] })] }), user.role === 'admin' && _jsx(_Fragment, { children: _jsxs(NavLink, { to: "/system", end: false, className: ({ isActive }) => isActive ? "nav-item active" : "nav-item", children: [_jsx("span", { children: "\u2699" }), "Administration"] }) })] }), _jsxs("div", { className: "sidebar-bottom", children: [_jsxs("div", { className: "safety-note", children: [_jsx("span", { className: "status-dot" }), "Local, isolated lab sessions"] }), _jsx(ProfileMenu, { user, onLogout: signOut })] })] }), _jsxs("main", { className: "main-area", children: [_jsxs("header", { className: "topbar", children: [_jsxs("div", { className: "breadcrumbs", children: [_jsx("span", { children: "Workspace" }), _jsx("span", { className: "crumb-sep", children: "/" }), _jsx("strong", { children: "Cyber Range" })] }), _jsxs("div", { className: "top-actions", children: [_jsx("span", { className: "role-pill", children: user.role }), _jsx("button", { className: "icon-button theme-toggle", "aria-label": "Toggle dark mode", onClick: () => setDark(!dark), children: dark ? '☼' : '◐' }), _jsx(ProfileMenu, { user, onLogout: signOut, compact: true })] })] }), _jsx("div", { className: "page-content", children: _jsxs(Routes, { children: user.role === "admin" ? [_jsx(Route, { path: "/system", element: _jsx(System, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/system", replace: true }) })] : [_jsx(Route, { path: "/", element: user.role === "teacher" ? _jsx(TeacherOverview, { user }) : _jsx(StudentOverview, { user }) }), _jsx(Route, { path: "/labs", element: _jsx(Catalog, {}) }), _jsx(Route, { path: "/workspace/:id", element: _jsx(Workspace, {}) }), _jsx(Route, { path: "/classes", element: user.role === "student" ? _jsx(StudentClasses, {}) : _jsx(Classes, {}) }), _jsx(Route, { path: "/classes/:classId", element: _jsx(ClassWorkspace, { user }) }), _jsx(Route, { path: "/assignments", element: _jsx(Assignments, {}) }), _jsx(Route, { path: "/history", element: _jsx(History, { user: user }) }), _jsx(Route, { path: "/monitor", element: _jsx(Monitor, {}) }), _jsx(Route, { path: "/system", element: _jsx(System, {}) }), _jsx(Route, { path: "*", element: user.role === "teacher" ? _jsx(TeacherOverview, { user }) : _jsx(StudentOverview, { user }) })] }) })] })] });
}
function StatCard({ label, value, caption, icon, tone }) { return _jsxs("article", { className: "stat-card", children: [_jsx("div", { className: `stat-icon ${tone}`, children: icon }), _jsx("p", { children: label }), _jsx("strong", { children: value }), _jsx("span", { children: caption })] }); }
function SectionHeading({ title, subtitle, action }) { return _jsxs("div", { className: "section-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: title }), _jsx("p", { children: subtitle })] }), action] }); }
function Catalog() { return _jsx(LabCatalog, {}); }
export function Workspace() {
    const { id = '' } = useParams();
    const retryLaunch = useLabLaunch();
    const queryClient = useQueryClient();
    const session = useQuery({ queryKey: ['session', id], queryFn: () => api(`/lab-sessions/${id}`), refetchInterval: (query) => query.state.data?.status === 'starting' ? 1500 : false });
    const lab = useQuery({ queryKey: ['lab', session.data?.lab_slug], enabled: !!session.data?.lab_slug, queryFn: () => api(`/labs/${session.data?.lab_slug}`) });
    const storedResult = useQuery({ queryKey: ['attempt', session.data?.attempt_id], enabled: !!session.data?.attempt_id, queryFn: () => api(`/attempts/${session.data?.attempt_id}`) });
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [pendingAction, setPendingAction] = useState('');
    const [actionError, setActionError] = useState('');
    useEffect(() => { setAnswers({}); setResult(null); setPendingAction(''); setActionError(''); }, [id]);
    useEffect(() => { if (session.data?.draft_answers)
        setAnswers(session.data.draft_answers); }, [session.data?.draft_answers]);
    useEffect(() => { if (storedResult.data)
        setResult(storedResult.data); }, [storedResult.data]);
    const manifest = lab.data;
    const questions = manifest?.questions ?? [];
    const title = session.data?.lab_title ?? 'Preparing your workspace';
    const perform = async (label, task) => { if (pendingAction) return; setPendingAction(label); setActionError(''); try { await task(); } catch (reason) { setActionError(reason.message || 'The request failed. Please try again.'); } finally { setPendingAction(''); } };
    const stop = () => perform('Stopping lab…', async () => { await api(`/lab-sessions/${id}/stop`, { method: 'POST' }); await queryClient.invalidateQueries({ queryKey: ['session', id] }); });
    const submit = () => perform('Submitting answers…', async () => { const response = await api(`/lab-sessions/${id}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }); if (response) setResult(response); await Promise.all([queryClient.invalidateQueries({ queryKey: ['session', id] }), queryClient.invalidateQueries({ queryKey: ['history'] }), queryClient.invalidateQueries({ queryKey: ['class-workspace'] }), queryClient.invalidateQueries({ queryKey: ['assignments'] })]); });
    const save = () => perform('Saving answers…', async () => { await api(`/lab-sessions/${id}/answers-draft`, { method: 'POST', body: JSON.stringify({ answers }) }); });
    if (session.isPending || session.data?.status === 'starting') return _jsxs('section', { className: 'loading', role: 'status', children: [_jsx('div', { className: 'loading-spinner', 'aria-hidden': true }), _jsx('h1', { children: 'Preparing your lab…' }), _jsx('p', { children: 'The environment is starting. This page will update automatically.' })] });
    if (session.isError) return _jsxs('section', { children: [_jsx('p', { className: 'error-banner', role: 'alert', children: session.error.message }), _jsx(Link, { to: '/labs', children: 'Back to labs' })] });
    if (session.data?.status !== 'running' && !session.data?.attempt_id && !result) return _jsxs('section', { children: [_jsx('h1', { children: 'This lab session has ended' }), _jsx('p', { children: 'Open a lab from the catalog to start a fresh environment.' }), _jsx(Link, { to: '/labs', className: 'button primary', children: 'Back to labs' })] });
    return _jsxs("div", { className: "teacher-page student-page student-lab-workspace", children: [_jsx(LabLaunchFeedback, { launch: retryLaunch }), pendingAction && _jsx(LabLaunchFeedback, { launch: { state: { pending: true, message: pendingAction } } }), actionError && _jsx("p", { role: "alert", className: "error-banner", children: actionError }), _jsxs("div", { className: "workspace-head", children: [_jsx(Link, { to: "/", className: "back-link", children: "\u2190 Back to overview" }), _jsxs("div", { className: "workspace-title", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "LAB WORKSPACE" }), _jsx("h1", { children: title })] }), _jsxs("div", { className: "workspace-controls", children: [_jsx("span", { className: `session-status ${session.data?.status}`, children: session.data?.status ?? 'loading' }), _jsx("button", { className: "button secondary", onClick: stop, disabled: !!pendingAction || session.data?.status !== 'running', children: "Stop lab" })] })] })] }), result ? _jsxs("div", { className: "result-panel", children: [_jsxs("div", { className: "result-score", children: [_jsx("span", { children: "YOUR SCORE" }), _jsxs("strong", { children: [result.score, _jsxs("small", { children: [" / ", result.max_score] })] }), _jsx("p", { children: result.passed ? "Passed — 80% or above. Review your feedback below." : "Needs reattempt — reach 80% to pass. Your attempt has been saved." })] }), _jsx("div", { className: "result-list", children: result.per_question_results.map((item) => _jsxs("div", { className: "result-item", children: [_jsx("span", { className: item.correct ? 'correct' : 'incorrect', children: item.correct ? '✓' : '×' }), _jsxs("div", { children: [_jsxs("strong", { children: ["Question ", item.qid] }), _jsx("p", { children: item.explanation })] })] }, item.qid)) }), _jsx("button", { className: "button primary wide", onClick: () => retryLaunch.start(session.data.lab_id, result.passed ? undefined : session.data.assignment_id), children: result.passed ? "Practice this lab again" : "Reattempt lab" }), _jsx(Link, { to: "/classes", className: "button secondary", children: "View my classes" })] }) : _jsxs("div", { className: "workspace-grid", children: [_jsxs("section", { className: "workspace-guide", children: [_jsx("p", { className: "eyebrow", children: "LAB GUIDE" }), manifest?.guide_markdown ? _jsx(ReactMarkdown, { rehypePlugins: [rehypeSanitize], children: manifest.guide_markdown }) : _jsx("div", { className: "loading", children: "Loading your guide\u2026" }), _jsx("button", { className: "button secondary", onClick: save, disabled: !!pendingAction || session.data?.status !== 'running', children: "Save answer draft" })] }), ['nmap-network-recon', 'sql-injection', 'traffic-forensics'].includes(session.data?.lab_slug) ? _jsx(LabActions, { id: id, slug: session.data?.lab_slug, expiresAt: session.data?.expires_at, initialEvidence: session.data?.lab_evidence, briefing: session.data?.briefing }, id) : _jsx(DesktopFrame, { id: id, expiresAt: session.data?.expires_at }), _jsxs("aside", { className: "question-panel", children: [_jsxs("div", { className: "question-heading", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "CHECK YOUR UNDERSTANDING" }), _jsxs("h2", { children: ["Questions ", _jsx("span", { children: questions.length })] })] }), _jsx("button", { className: "icon-button", "aria-label": "More question options", children: "\u00B7\u00B7\u00B7" })] }), questions.map((question, i) => _jsx(QuestionInput, { question: question, index: i, value: answers[question.id] ?? '', onChange: (value) => setAnswers((previous) => ({ ...previous, [question.id]: value })) }, question.id)), _jsxs("div", { className: "answer-submit", children: [_jsx("p", { children: "Pass mark: 80%. Lower scores require another attempt." }), _jsx("button", { className: "button primary wide", onClick: submit, disabled: !!pendingAction || session.data?.status !== 'running' || !questions.length, children: pendingAction || 'Submit answers' })] })] })] })] });
}
function DesktopFrame({ id, expiresAt }) {
    const [state, setState] = useState('idle');
    const [error, setError] = useState('');
    const [evidence, setEvidence] = useState([]);
    const connect = async () => {
        setState('connecting');
        setError('');
        try {
            const result = await api(`/lab-sessions/${id}/connect`);
            setEvidence(result.evidence);
            setState('ready');
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : 'The desktop could not be connected.');
            setState('error');
        }
    };
    return _jsxs("section", { className: "desktop-panel", children: [_jsxs("div", { className: "desktop-top", children: [_jsxs("span", { children: [_jsx("i", { className: "status-dot" }), " Simulated lab workspace"] }), _jsx("span", { className: "desktop-dots", children: "\u2022\u2022\u2022" })] }), _jsx("div", { className: "desktop-screen", children: _jsxs("div", { className: "terminal-window", children: [_jsxs("div", { className: "terminal-title", children: [_jsx("span", {}), " ", _jsx("span", {}), " ", _jsx("span", {}), " ", _jsx("b", { children: "cyberrange: demo" })] }), _jsxs("div", { className: "terminal-content", children: [_jsx("p", { children: "College prototype workspace" }), _jsx("p", { className: "terminal-dim", children: state === 'ready' ? 'Demo session is ready. Complete the guide and submit your answers to see feedback.' : state === 'connecting' ? 'Preparing your demo session…' : 'This prototype simulates the lab desktop. It does not run security tools or connect to a target.' }), evidence.map((item) => _jsx("p", { className: "terminal-dim", children: item }, item)), error && _jsx("p", { role: "alert", className: "desktop-error", children: error }), _jsxs("button", { className: "desktop-connect", onClick: connect, disabled: state === 'connecting', children: [state === 'ready' ? 'Refresh demo session' : state === 'connecting' ? 'Preparing…' : 'Start demo session', " ", _jsx("span", { children: "\u2192" })] })] })] }) }), _jsxs("div", { className: "desktop-footer", children: [_jsx("span", { children: "Simulated session" }), _jsxs("span", { children: ["Expires ", expiresAt ? new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'] })] })] });
}
function QuestionInput({ question, index, value, onChange }) {
    return _jsxs("div", { className: "question-item", children: [_jsxs("div", { className: "question-meta", children: [_jsxs("span", { children: ["QUESTION ", String(index + 1).padStart(2, '0')] }), _jsxs("span", { children: [question.points, " pts"] })] }), _jsx("p", { children: question.prompt }), question.type === 'mcq' && Array.isArray(question.options) ? _jsx("div", { className: "option-list", children: question.options.map((option) => _jsxs("label", { className: `option ${value === String(option) ? 'chosen' : ''}`, children: [_jsx("input", { type: "radio", name: question.id, value: String(option), checked: value === String(option), onChange: (event) => onChange(event.target.value) }), String(option)] }, String(option))) }) : _jsx("input", { "aria-label": `Answer question ${index + 1}`, value: value, onChange: (event) => onChange(event.target.value), placeholder: question.type === 'flag' ? 'Paste your flag…' : 'Type your answer…' }), question.hints?.length ? _jsxs("details", { className: "hint", children: [_jsx("summary", { children: "Need a hint?" }), _jsx("p", { children: question.hints[0] })] }) : null] });
}
function Classes() { return _jsx(TeacherClasses, {}); }
function Monitor() { return _jsx(TeacherMonitor, {}); }
function Assignments() { return _jsx(TeacherAssignments, {}); }
function History({ user }) { return _jsx(HistoryPage, { user }); }
function System() {
    const queryClient = useQueryClient();
    const system = useQuery({ queryKey: ['system'], queryFn: () => api('/admin/system') });
    const users = useQuery({ queryKey: ['admin-users'], queryFn: () => api('/admin/users') });
    const labs = useQuery({ queryKey: ['admin-labs'], queryFn: () => api('/admin/labs') });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const createUser = async (event) => {
        event.preventDefault();
        setError('');
        setMessage('');
        const form = event.currentTarget;
        const body = Object.fromEntries(new FormData(form));
        try {
            await api('/admin/users', { method: 'POST', body: JSON.stringify(body) });
            form.reset();
            setMessage('Account created. Check the API terminal for its temporary sign-in details.');
            await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Could not create account');
        }
    };
    const setActive = async (id, active) => {
        setError('');
        setMessage('');
        try {
            await api(`/admin/users/${id}?is_active=${active}`, { method: 'PATCH' });
            await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Could not update account');
        }
    };
    const resetPassword = async (id) => {
        setError('');
        setMessage('');
        try {
            await api(`/admin/users/${id}/reset-password`, { method: 'POST' });
            setMessage('Temporary password printed in the API terminal.');
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Could not reset password');
        }
    };
    const setEnabled = async (id, enabled) => {
        setError('');
        try {
            await api(`/admin/labs/${id}?enabled=${enabled}`, { method: 'PATCH' });
            await queryClient.invalidateQueries({ queryKey: ['admin-labs'] });
            await queryClient.invalidateQueries({ queryKey: ['labs'] });
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Could not update lab');
        }
    };
    const terminateAll = async () => {
        setError('');
        setMessage('');
        try {
            await api('/admin/system/terminate-all', { method: 'POST' });
            setMessage('All active demo sessions were stopped.');
            await queryClient.invalidateQueries({ queryKey: ['system'] });
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Could not stop sessions');
        }
    };
    return _jsxs(_Fragment, { children: [_jsx("div", { className: "page-title-row", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "PLATFORM HEALTH" }), _jsx("h1", { children: "Administration" }), _jsx("p", { className: "muted", children: "Manage demo accounts, lessons, and local session capacity." })] }) }), _jsxs("div", { className: "stats-grid", children: [_jsx(StatCard, { label: "Active sessions", value: system.data?.active_sessions ?? '—', caption: `of ${system.data?.capacity ?? '—'} allowed`, icon: "\u25C9", tone: "mint" }), _jsx(StatCard, { label: "Lab runtime", value: system.data?.runtime ?? '—', caption: "Local lab sessions", icon: "\u2318", tone: "blue" }), _jsx(StatCard, { label: "Managed sessions", value: system.data?.sessions.length ?? '—', caption: "Now in progress", icon: "\u25A4", tone: "gold" })] }), error && _jsx("p", { role: "alert", className: "error-banner", children: error }), message && _jsx("p", { role: "status", className: "success-banner", children: message }), _jsxs("section", { className: "section-block", children: [_jsx(SectionHeading, { title: "Create an account", subtitle: "Local demo email appears in the API terminal." }), _jsxs("form", { className: "inline-form", onSubmit: createUser, children: [_jsxs("label", { children: ["First name", _jsx("input", { name: "first_name", required: true })] }), _jsxs("label", { children: ["Last name", _jsx("input", { name: "last_name", required: true })] }), _jsxs("label", { children: ["Email", _jsx("input", { name: "email", type: "email", required: true })] }), _jsxs("label", { children: ["Role", _jsxs("select", { name: "role", defaultValue: "teacher", children: [_jsx("option", { value: "teacher", children: "Teacher" }), _jsx("option", { value: "student", children: "Student" })] })] }), _jsxs("button", { className: "button primary", children: ["Create account ", _jsx("span", { children: "+" })] })] })] }), _jsxs("section", { className: "section-block", children: [_jsx(SectionHeading, { title: "Accounts", subtitle: "Reset a password or deactivate an account." }), _jsx("div", { className: "table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Email" }), _jsx("th", { children: "Role" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: users.data?.map((account) => _jsxs("tr", { children: [_jsxs("td", { children: [account.first_name, " ", account.last_name] }), _jsx("td", { children: account.email }), _jsx("td", { children: account.role }), _jsx("td", { children: account.is_active ? 'Active' : 'Inactive' }), _jsxs("td", { children: [_jsx("button", { className: "text-button", onClick: () => resetPassword(account.id), children: "Reset password" }), _jsx("button", { className: "text-button", onClick: () => setActive(account.id, !account.is_active), children: account.is_active ? 'Deactivate' : 'Activate' })] })] }, account.id)) })] }) })] }), _jsxs("section", { className: "section-block", children: [_jsx(SectionHeading, { title: "Lesson catalog", subtitle: "Enable or hide a lesson in the student catalog." }), _jsx("div", { className: "table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Lesson" }), _jsx("th", { children: "Availability" }), _jsx("th", {})] }) }), _jsx("tbody", { children: labs.data?.map((lab) => _jsxs("tr", { children: [_jsx("td", { children: lab.title }), _jsx("td", { children: lab.enabled ? 'Enabled' : 'Hidden' }), _jsx("td", { children: _jsx("button", { className: "text-button", onClick: () => setEnabled(lab.id, !lab.enabled), children: lab.enabled ? 'Hide lesson' : 'Enable lesson' }) })] }, lab.id)) })] }) })] }), _jsxs("section", { className: "section-block", children: [_jsx(SectionHeading, { title: "Local demo", subtitle: "Manage all three lab environments and their availability.", action: _jsx("button", { className: "danger-button", onClick: terminateAll, disabled: !system.data?.active_sessions, children: "Stop all demo sessions" }) }), _jsxs("div", { className: "status-panel", children: [_jsx("span", { className: "status-dot" }), _jsxs("div", { children: [_jsx("strong", { children: "API responding" }), _jsx("p", { children: "Training targets have no published ports and sessions are cleaned up when stopped." })] })] })] })] });
}
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAup, setShowAup] = useState(false);
    useEffect(() => { api('/me').then((value) => { setUser(value); setShowAup(!value.aup_accepted); }).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
    const login = (value) => { setUser(value); setShowAup(value.email_verified !== false && !value.aup_accepted); };
    const logout = async () => { try { await api('/auth/logout', { method: 'POST' }); }
    catch (reason) { if (reason.status !== 401) throw reason; } setUser(null); };
    const accept = async () => { await api('/auth/accept-aup', { method: 'POST' }); if (user)
        setUser({ ...user, aup_accepted: true }); setShowAup(false); };
    if (loading)
        return _jsxs("div", { className: "loading-screen", children: [_jsx("div", { className: "brand-mark", children: "CR" }), _jsx("span", { children: "Preparing your range\u2026" })] });
    if (!user)
        return _jsx(Auth, { onLogin: login });
    if (user.email_verified === false)
        return _jsx(EmailVerificationPending, {});
    if (user.must_change_password)
        return _jsx(PasswordChange, { onDone: (next) => { setUser(next); }, user: user });
    return _jsxs(_Fragment, { children: [_jsx(Shell, { user: user, onLogout: logout }), showAup && _jsx(Aup, { onAccept: accept })] });
}
function EmailVerificationPending() { return _jsx("main", { className: "auth-shell", children: _jsxs("section", { className: "auth-card centered", children: [_jsx("div", { className: "icon-box", children: "\u2709" }), _jsx("p", { className: "eyebrow", children: "CHECK YOUR EMAIL" }), _jsx("h2", { children: "Verify your address" }), _jsx("p", { className: "muted", children: "Open the verification link sent to your school email. Once verified, refresh this page to continue." }), _jsxs("a", { className: "button secondary wide", href: "/", children: ["I verified my email ", _jsx("span", { children: "\u2192" })] })] }) }); }
function PasswordChange({ user, onDone }) { const [error, setError] = useState(''); const submit = async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); try {
    await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ password: data.password }) });
    onDone({ ...user, must_change_password: false });
}
catch (e) {
    setError(e instanceof Error ? e.message : 'Password could not be changed');
} }; return _jsx("main", { className: "auth-shell", children: _jsxs("section", { className: "auth-card centered", children: [_jsx("div", { className: "icon-box", children: "\u2311" }), _jsx("p", { className: "eyebrow", children: "ACCOUNT SECURITY" }), _jsx("h2", { children: "Choose a new password" }), _jsx("p", { className: "muted", children: "Your temporary password must be replaced before continuing." }), _jsxs("form", { className: "form-stack", onSubmit: submit, children: [_jsxs("label", { children: ["New password", _jsx("input", { name: "password", type: "password", minLength: 12, required: true, autoComplete: "new-password" })] }), error && _jsx("p", { className: "error-banner", children: error }), _jsxs("button", { className: "button primary wide", children: ["Update password ", _jsx("span", { children: "\u2192" })] })] })] }) }); }
