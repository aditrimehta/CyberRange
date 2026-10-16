import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { api } from './api';
import LabActions from './LabActions.jsx';
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
    const [dark, setDark] = useState(localStorage.getItem('dark') === 'true');
    useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('dark', String(dark)); }, [dark]);
    const initial = `${user.first_name[0] ?? 'U'}${user.last_name[0] ?? ''}`.toUpperCase();
    return _jsxs("div", { className: "app-shell", children: [_jsxs("aside", { className: "sidebar", children: [_jsxs(Link, { className: "brand", to: "/", children: [_jsx("div", { className: "brand-mark small", children: "CR" }), _jsxs("span", { children: ["cyber", _jsx("span", { className: "brand-light", children: "range" })] })] }), _jsx("p", { className: "nav-label", children: "WORKSPACE" }), _jsxs("nav", { children: [_jsxs(Link, { to: "/", className: "nav-item", children: [_jsx("span", { children: "\u2302" }), "Overview"] }), _jsxs(Link, { to: "/labs", className: "nav-item", children: [_jsx("span", { children: "\u25A6" }), "Lab catalog"] }), user.role === 'student' && _jsxs(Link, { to: "/history", className: "nav-item", children: [_jsx("span", { children: "\u25F7" }), "History"] }), user.role === 'teacher' && _jsxs(_Fragment, { children: [_jsxs(Link, { to: "/classes", className: "nav-item", children: [_jsx("span", { children: "\u25A4" }), "Classes"] }), _jsxs(Link, { to: "/assignments", className: "nav-item", children: [_jsx("span", { children: "\u25A5" }), "Assignments"] }), _jsxs(Link, { to: "/monitor", className: "nav-item", children: [_jsx("span", { children: "\u25C9" }), "Live monitor"] })] }), user.role === 'admin' && _jsx(_Fragment, { children: _jsxs(Link, { to: "/system", className: "nav-item", children: [_jsx("span", { children: "\u2699" }), "Admin"] }) })] }), _jsxs("div", { className: "sidebar-bottom", children: [_jsxs("div", { className: "safety-note", children: [_jsx("span", { className: "status-dot" }), "Local, isolated lab sessions"] }), _jsxs("div", { className: "profile", children: [_jsx("div", { className: "avatar", children: initial }), _jsxs("div", { className: "profile-copy", children: [_jsxs("strong", { children: [user.first_name, " ", user.last_name] }), _jsx("span", { children: user.role })] }), _jsx("button", { "aria-label": "Sign out", className: "icon-button", onClick: onLogout, children: "\u2197" })] })] })] }), _jsxs("main", { className: "main-area", children: [_jsxs("header", { className: "topbar", children: [_jsxs("div", { className: "breadcrumbs", children: [_jsx("span", { children: "Workspace" }), _jsx("span", { className: "crumb-sep", children: "/" }), _jsx("strong", { children: "Cyber Range" })] }), _jsxs("div", { className: "top-actions", children: [_jsx("span", { className: "role-pill", children: user.role }), _jsx("button", { className: "icon-button theme-toggle", "aria-label": "Toggle dark mode", onClick: () => setDark(!dark), children: dark ? '☼' : '◐' }), _jsx("div", { className: "avatar mini", children: initial })] })] }), _jsx("div", { className: "page-content", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Dashboard, { user: user }) }), _jsx(Route, { path: "/labs", element: _jsx(Catalog, {}) }), _jsx(Route, { path: "/workspace/:id", element: _jsx(Workspace, {}) }), _jsx(Route, { path: "/classes", element: _jsx(Classes, {}) }), _jsx(Route, { path: "/assignments", element: _jsx(Assignments, {}) }), _jsx(Route, { path: "/history", element: _jsx(History, { user: user }) }), _jsx(Route, { path: "/monitor", element: _jsx(Monitor, {}) }), _jsx(Route, { path: "/system", element: _jsx(System, {}) }), _jsx(Route, { path: "*", element: _jsx(Dashboard, { user: user }) })] }) })] })] });
}
function Dashboard({ user }) {
    const labs = useQuery({ queryKey: ['labs'], queryFn: () => api('/labs') });
    const classes = useQuery({ queryKey: ['classes'], queryFn: () => api('/classes') });
    const assignments = useQuery({ queryKey: ['assignments'], queryFn: () => api('/assignments') });
    const navigate = useNavigate();
    const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
    const start = async (labId, assignmentId) => { try { const session = await api('/lab-sessions', { method: 'POST', body: JSON.stringify({ lab_id: labId, assignment_id: assignmentId }) }); navigate(`/workspace/${session.id}`); } catch (reason) { window.alert(reason instanceof Error ? reason.message : 'Could not start the lab.'); } };
    const featured = labs.data?.slice(0, 3) ?? [];
    return _jsxs(_Fragment, { children: [_jsxs("div", { className: "welcome-row", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "YOUR LEARNING SPACE" }), _jsxs("h1", { children: [greeting, ", ", user.first_name, " ", _jsx("span", { className: "wave", children: "\u2726" })] }), _jsx("p", { className: "muted", children: "Build practical security skills, one hands-on lab at a time." })] }), _jsxs(Link, { to: "/labs", className: "button primary", children: ["Explore labs ", _jsx("span", { children: "\u2192" })] })] }), _jsxs("div", { className: "stats-grid", children: [_jsx(StatCard, { label: "Available labs", value: labs.data?.length ?? '—', caption: "Ready when you are", icon: "\u2318", tone: "mint" }), _jsx(StatCard, { label: user.role === 'student' ? 'Assigned to you' : 'Your classes', value: user.role === 'student' ? assignments.data?.length ?? '—' : classes.data?.length ?? '—', caption: user.role === 'student' ? 'Keep your momentum' : 'Manage your learners', icon: "\u25A4", tone: "blue" }), _jsx(StatCard, { label: "Learning streak", value: "\u2014", caption: "Your progress starts today", icon: "\u2726", tone: "gold" })] }), user.role === 'student' && _jsx(JoinClass, {}), user.role === 'student' && assignments.data && assignments.data.length > 0 && _jsxs("section", { className: "section-block", children: [_jsx(SectionHeading, { title: "Your assignments", subtitle: "Work assigned by your instructor" }), _jsx("div", { className: "assignment-list", children: assignments.data.map((item) => { const lab = labs.data?.find((x) => x.id === item.lab_id); return _jsxs("div", { className: "assignment-row", children: [_jsx("div", { className: "lab-symbol", children: "\u2301" }), _jsxs("div", { className: "assignment-info", children: [_jsx("strong", { children: item.title }), _jsxs("span", { children: [lab?.title ?? 'Cybersecurity lab', " \u00B7 ", item.max_attempts, " attempts"] })] }), item.due_at && _jsxs("span", { className: "due-label", children: ["Due ", new Date(item.due_at).toLocaleDateString()] }), _jsxs("button", { className: "button secondary", onClick: () => start(item.lab_id, item.id), children: ["Start lab ", _jsx("span", { children: "\u2192" })] })] }, item.id); }) })] }), _jsxs("section", { className: "section-block", children: [_jsx(SectionHeading, { title: "Pick up a new skill", subtitle: "A few good places to start", action: _jsxs(Link, { to: "/labs", className: "link-button", children: ["View all labs ", _jsx("span", { children: "\u2192" })] }) }), _jsxs("div", { className: "lab-grid", children: [featured.map((lab, i) => _jsx(LabCard, { lab: lab, index: i, onStart: () => start(lab.id) }, lab.id)), !labs.isLoading && !labs.data?.length && _jsx(EmptyState, { title: "Labs are being prepared", detail: "Your instructor or administrator can sync the lab catalog." })] })] }), _jsxs("section", { className: "bottom-callout", children: [_jsx("div", { className: "callout-icon", children: "\u25CE" }), _jsxs("div", { children: [_jsx("strong", { children: "Practice safely. Learn confidently." }), _jsx("p", { children: "Every range is temporary and isolated. Your work stays in the learning environment." })] }), _jsx("span", { className: "callout-decoration", children: "\u25CC" })] })] });
}
function JoinClass() { const [error, setError] = useState(''); const [joined, setJoined] = useState(''); const queryClient = useQueryClient(); const submit = async (event) => { event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form)); try {
    const classroom = await api('/classes/join', { method: 'POST', body: JSON.stringify({ code: data.code }) });
    setJoined(classroom.name);
    setError('');
    form.reset();
    await queryClient.invalidateQueries({ queryKey: ['classes'] });
    await queryClient.invalidateQueries({ queryKey: ['assignments'] });
}
catch (reason) {
    setError(reason instanceof Error ? reason.message : 'Could not join the class');
} }; return _jsxs("section", { className: "join-class", children: [_jsxs("div", { children: [_jsx("strong", { children: "Join another class" }), _jsx("p", { children: "Enter the code from your instructor." })] }), _jsxs("form", { onSubmit: submit, children: [_jsx("input", { name: "code", required: true, minLength: 8, maxLength: 8, placeholder: "8-character code", "aria-label": "Class join code" }), " ", _jsxs("button", { className: "button secondary", children: ["Join ", _jsx("span", { children: "\u2192" })] })] }), error && _jsx("span", { role: "alert", className: "join-error", children: error }), joined && _jsxs("span", { className: "join-success", children: ["Joined ", joined] })] }); }
function StatCard({ label, value, caption, icon, tone }) { return _jsxs("article", { className: "stat-card", children: [_jsx("div", { className: `stat-icon ${tone}`, children: icon }), _jsx("p", { children: label }), _jsx("strong", { children: value }), _jsx("span", { children: caption })] }); }
function SectionHeading({ title, subtitle, action }) { return _jsxs("div", { className: "section-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: title }), _jsx("p", { children: subtitle })] }), action] }); }
function LabCard({ lab, index, onStart }) { const symbols = ['⌘', '⌁', '◇']; return _jsxs("article", { className: "lab-card", children: [_jsxs("div", { className: `lab-illustration art-${index % 3}`, children: [_jsxs("span", { className: "art-index", children: ["0", index + 1] }), _jsx("span", { className: "art-symbol", children: symbols[index % 3] }), _jsx("span", { className: "art-orbit" })] }), _jsxs("div", { className: "lab-card-body", children: [_jsxs("div", { className: "tag-row", children: [_jsx("span", { className: "tag", children: lab.category }), _jsx("span", { className: `difficulty ${lab.difficulty}`, children: lab.difficulty })] }), _jsx("h3", { children: lab.title }), _jsx("p", { children: lab.summary }), _jsxs("div", { className: "lab-meta", children: [_jsxs("span", { children: ["\u25F7 ", lab.estimated_minutes, " min"] }), _jsxs("span", { children: ["\u25A4 ", lab.questions?.length ?? 0, " questions"] })] }), _jsxs("button", { className: "card-action", onClick: onStart, children: ["Open lab ", _jsx("span", { children: "\u2192" })] })] })] }); }
function EmptyState({ title, detail }) { return _jsxs("div", { className: "empty-state", children: [_jsx("div", { children: "\u25C7" }), _jsx("strong", { children: title }), _jsx("p", { children: detail })] }); }
function Catalog() {
    const labs = useQuery({ queryKey: ['labs'], queryFn: () => api('/labs') });
    const [filter, setFilter] = useState('all');
    const navigate = useNavigate();
    const items = useMemo(() => (labs.data ?? []).filter((lab) => filter === 'all' || lab.difficulty === filter), [labs.data, filter]);
    const start = async (lab) => { try { const session = await api('/lab-sessions', { method: 'POST', body: JSON.stringify({ lab_id: lab.id }) }); navigate(`/workspace/${session.id}`); } catch (reason) { window.alert(reason instanceof Error ? reason.message : 'Could not start the lab.'); } };
    return _jsxs(_Fragment, { children: [_jsx("div", { className: "page-title-row", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "THE RANGE" }), _jsx("h1", { children: "Lab catalog" }), _jsx("p", { className: "muted", children: "Explore practical challenges designed to grow your security instincts." })] }) }), _jsxs("div", { className: "filter-row", children: [_jsx("div", { className: "filter-tabs", children: ['all', 'beginner', 'intermediate', 'advanced'].map((item) => _jsx("button", { onClick: () => setFilter(item), className: filter === item ? 'selected' : '', children: item === 'all' ? 'All labs' : item }, item)) }), _jsxs("span", { className: "result-count", children: [items.length, " labs"] })] }), _jsx("div", { className: "lab-grid catalog-grid", children: items.map((lab, i) => _jsx(LabCard, { lab: lab, index: i, onStart: () => start(lab) }, lab.id)) }), labs.isLoading && _jsx("div", { className: "loading", children: "Loading lab catalog\u2026" }), labs.isError && _jsx("div", { className: "error-banner", children: labs.error.message })] });
}
function Workspace() {
    const { id = '' } = useParams();
    const queryClient = useQueryClient();
    const session = useQuery({ queryKey: ['session', id], queryFn: () => api(`/lab-sessions/${id}`) });
    const lab = useQuery({ queryKey: ['lab', session.data?.lab_slug], enabled: !!session.data?.lab_slug, queryFn: () => api(`/labs/${session.data?.lab_slug}`) });
    const storedResult = useQuery({ queryKey: ['attempt', session.data?.attempt_id], enabled: !!session.data?.attempt_id, queryFn: () => api(`/attempts/${session.data?.attempt_id}`) });
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    useEffect(() => { if (session.data?.draft_answers)
        setAnswers(session.data.draft_answers); }, [session.data?.draft_answers]);
    useEffect(() => { if (storedResult.data)
        setResult(storedResult.data); }, [storedResult.data]);
    const manifest = lab.data;
    const questions = manifest?.questions ?? [];
    const title = session.data?.lab_title ?? 'Preparing your workspace';
    const stop = async () => { await api(`/lab-sessions/${id}/stop`, { method: 'POST' }); await queryClient.invalidateQueries({ queryKey: ['session', id] }); };
    const submit = async () => { try { const response = await api(`/lab-sessions/${id}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }); if (response) setResult(response); await queryClient.invalidateQueries({ queryKey: ['session', id] }); } catch (reason) { window.alert(reason instanceof Error ? reason.message : 'Could not submit answers.'); } };
    const save = async () => { await api(`/lab-sessions/${id}/answers-draft`, { method: 'POST', body: JSON.stringify({ answers }) }); };
    return _jsxs(_Fragment, { children: [_jsxs("div", { className: "workspace-head", children: [_jsx(Link, { to: "/", className: "back-link", children: "\u2190 Back to overview" }), _jsxs("div", { className: "workspace-title", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "LAB WORKSPACE" }), _jsx("h1", { children: title })] }), _jsxs("div", { className: "workspace-controls", children: [_jsx("span", { className: `session-status ${session.data?.status}`, children: session.data?.status ?? 'loading' }), _jsx("button", { className: "button secondary", onClick: stop, children: "Stop lab" }), !result && _jsxs("button", { className: "button primary", onClick: submit, disabled: !session.data || session.data.status !== 'running', children: ["Submit answers ", _jsx("span", { children: "\u2192" })] })] })] })] }), result ? _jsxs("div", { className: "result-panel", children: [_jsxs("div", { className: "result-score", children: [_jsx("span", { children: "YOUR SCORE" }), _jsxs("strong", { children: [result.score, _jsxs("small", { children: [" / ", result.max_score] })] }), _jsx("p", { children: "Submission received. Review your feedback below." })] }), _jsx("div", { className: "result-list", children: result.per_question_results.map((item) => _jsxs("div", { className: "result-item", children: [_jsx("span", { className: item.correct ? 'correct' : 'incorrect', children: item.correct ? '✓' : '×' }), _jsxs("div", { children: [_jsxs("strong", { children: ["Question ", item.qid] }), _jsx("p", { children: item.explanation })] })] }, item.qid)) }), _jsx(Link, { to: "/", className: "button secondary", children: "Return to overview" })] }) : _jsxs("div", { className: "workspace-grid", children: [_jsxs("section", { className: "workspace-guide", children: [_jsx("p", { className: "eyebrow", children: "LAB GUIDE" }), manifest?.guide_markdown ? _jsx(ReactMarkdown, { rehypePlugins: [rehypeSanitize], children: manifest.guide_markdown }) : _jsx("div", { className: "loading", children: "Loading your guide\u2026" }), _jsx("button", { className: "button secondary", onClick: save, children: "Save answer draft" })] }), ['nmap-network-recon', 'sql-injection', 'traffic-forensics'].includes(session.data?.lab_slug) ? _jsx(LabActions, { id: id, slug: session.data?.lab_slug, expiresAt: session.data?.expires_at }) : _jsx(DesktopFrame, { id: id, expiresAt: session.data?.expires_at }), _jsxs("aside", { className: "question-panel", children: [_jsxs("div", { className: "question-heading", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "CHECK YOUR UNDERSTANDING" }), _jsxs("h2", { children: ["Questions ", _jsx("span", { children: questions.length })] })] }), _jsx("button", { className: "icon-button", "aria-label": "More question options", children: "\u00B7\u00B7\u00B7" })] }), questions.map((question, i) => _jsx(QuestionInput, { question: question, index: i, value: answers[question.id] ?? '', onChange: (value) => setAnswers((previous) => ({ ...previous, [question.id]: value })) }, question.id))] })] })] });
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
function Classes() {
    const queryClient = useQueryClient();
    const classes = useQuery({ queryKey: ['classes'], queryFn: () => api('/classes') });
    const labs = useQuery({ queryKey: ['labs'], queryFn: () => api('/labs') });
    const [error, setError] = useState('');
    const create = async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); try {
        await api('/classes', { method: 'POST', body: JSON.stringify(data) });
        event.currentTarget.reset();
        await queryClient.invalidateQueries({ queryKey: ['classes'] });
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Could not create class');
    } };
    const assignment = async (event, classId) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); const labId = String(data.lab_id); delete data.lab_id; for (const key of ['due_at']) if (!data[key]) delete data[key]; if (data.due_at) data.due_at = new Date(data.due_at).toISOString(); try {
        await api('/assignments', { method: 'POST', body: JSON.stringify({ ...data, lab_id: labId, class_id: classId, max_attempts: Number(data.max_attempts) }) });
        await queryClient.invalidateQueries({ queryKey: ['assignments'] });
        alert('Assignment created for the class roster.');
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Could not assign lab');
    } };
    return _jsxs(_Fragment, { children: [_jsx("div", { className: "page-title-row", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "TEACHING TOOLS" }), _jsx("h1", { children: "Classes" }), _jsx("p", { className: "muted", children: "Create a space for your students and assign hands-on work." })] }) }), error && _jsx("p", { role: "alert", className: "error-banner", children: error }), _jsxs("section", { className: "section-block", children: [_jsx(SectionHeading, { title: "Create a class", subtitle: "Students join with a private eight-character code." }), _jsxs("form", { className: "inline-form", onSubmit: create, children: [_jsxs("label", { children: ["Class name", _jsx("input", { name: "name", required: true, placeholder: "e.g. Network Security 101" })] }), _jsxs("label", { children: ["Term", _jsx("input", { name: "term", placeholder: "Fall 2026" })] }), _jsxs("button", { className: "button primary", children: ["Create class ", _jsx("span", { children: "+" })] })] })] }), _jsxs("section", { className: "section-block", children: [_jsx(SectionHeading, { title: "Your classes", subtitle: "Codes and assignments for your teaching spaces" }), _jsxs("div", { className: "class-grid", children: [classes.data?.map((classroom) => _jsxs("article", { className: "class-card", children: [_jsxs("div", { className: "class-card-head", children: [_jsx("div", { className: "class-icon", children: "\u25A4" }), _jsxs("div", { children: [_jsx("h3", { children: classroom.name }), _jsxs("span", { children: [classroom.term, " \u00B7 ", classroom.member_count ?? 0, " students"] })] })] }), classroom.join_code && _jsxs("div", { className: "join-code", children: [_jsx("span", { children: "STUDENT JOIN CODE" }), _jsx("strong", { children: classroom.join_code }), _jsx("button", { onClick: () => navigator.clipboard.writeText(classroom.join_code ?? ''), children: "Copy" })] }), _jsxs("form", { className: "assign-form", onSubmit: (event) => assignment(event, classroom.id), children: [_jsxs("label", { children: ["Assign a lab", _jsxs("select", { name: "lab_id", required: true, defaultValue: "", children: [_jsx("option", { value: "", disabled: true, children: "Select a lab" }), labs.data?.map((lab) => _jsx("option", { value: lab.id, children: lab.title }, lab.id))] })] }), _jsxs("label", { children: ["Assignment title", _jsx("input", { name: "title", required: true, placeholder: "Week 1: Discovery" })] }), _jsxs("label", { children: ["Attempts", _jsx("input", { name: "max_attempts", type: "number", min: "1", max: "20", defaultValue: "3" })] }), _jsx("label", { children: ["Due date (optional)", _jsx("input", { name: "due_at", type: "datetime-local" })] }), _jsxs("label", { children: ["Score using", _jsxs("select", { name: "scoring_policy", defaultValue: "best", children: [_jsx("option", { value: "best", children: "Best attempt" }), _jsx("option", { value: "latest", children: "Latest attempt" })] })] }), _jsxs("button", { className: "button secondary wide", children: ["Create assignment ", _jsx("span", { children: "\u2192" })] })] })] }, classroom.id)), classes.data?.length === 0 && _jsx(EmptyState, { title: "No classes yet", detail: "Create your first class to get started." })] })] })] });
}
function Monitor() { const sessions = useQuery({ queryKey: ['monitor'], queryFn: () => api('/monitor/sessions'), refetchInterval: 5000 }); const queryClient = useQueryClient(); const terminate = async (id) => { await api(`/monitor/sessions/${id}/terminate`, { method: 'POST' }); await queryClient.invalidateQueries({ queryKey: ['monitor'] }); }; return _jsxs(_Fragment, { children: [_jsxs("div", { className: "page-title-row", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "CLASSROOM ACTIVITY" }), _jsx("h1", { children: "Live monitor" }), _jsx("p", { className: "muted", children: "Active assigned sessions refresh automatically." })] }), _jsxs("span", { className: "live-pill", children: [_jsx("i", { className: "status-dot" }), " LIVE"] })] }), _jsxs("div", { className: "table-wrap", children: [_jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Student" }), _jsx("th", { children: "Lab" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Time remaining" }), _jsx("th", {})] }) }), _jsx("tbody", { children: sessions.data?.map((session) => _jsxs("tr", { children: [_jsxs("td", { children: [_jsx("span", { className: "avatar mini", children: "ST" }), " ", session.student_id.slice(0, 8)] }), _jsx("td", { children: session.lab_id.slice(0, 8) }), _jsx("td", { children: _jsx("span", { className: "session-status running", children: session.status }) }), _jsxs("td", { children: [Math.max(0, Math.round((Date.parse(session.expires_at) - Date.now()) / 60000)), " min"] }), _jsx("td", { children: _jsx("button", { className: "danger-button", onClick: () => terminate(session.id), children: "Terminate" }) })] }, session.id)) })] }), sessions.data?.length === 0 && _jsx(EmptyState, { title: "No active sessions", detail: "Students appear here while they are working in an assigned lab." })] })] }); }
function Assignments() { const assignments = useQuery({ queryKey: ['assignments'], queryFn: () => api('/assignments') }); const results = useQuery({ queryKey: ['assignment-results', assignments.data?.map((a) => a.id)], enabled: !!assignments.data, queryFn: async () => Promise.all((assignments.data ?? []).map(async (item) => ({ assignment: item, students: await api(`/assignments/${item.id}/results`) }))) }); return _jsxs(_Fragment, { children: [_jsx("div", { className: "page-title-row", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "ASSESSMENT" }), _jsx("h1", { children: "Assignments" }), _jsx("p", { className: "muted", children: "Review progress and export a class score sheet." })] }) }), _jsxs("div", { className: "class-grid", children: [results.data?.map(({ assignment, students }) => _jsxs("article", { className: "class-card", children: [_jsxs("div", { className: "class-card-head", children: [_jsx("div", { className: "class-icon", children: "\u25A5" }), _jsxs("div", { children: [_jsx("h3", { children: assignment.title }), _jsxs("span", { children: [students.filter((s) => s.status === 'submitted').length, " of ", students.length, " students submitted"] })] })] }), _jsxs("div", { className: "assignment-progress", children: [_jsxs("div", { children: [_jsx("span", { children: "Completion" }), _jsxs("strong", { children: [students.length ? Math.round(students.filter((s) => s.status === 'submitted').length / students.length * 100) : 0, "%"] })] }), _jsx("div", { className: "progress-track", children: _jsx("i", { style: { width: `${students.length ? students.filter((s) => s.status === 'submitted').length / students.length * 100 : 0}%` } }) })] }), _jsx("div", { className: "mini-results", children: students.slice(0, 4).map((student) => _jsxs("div", { children: [_jsx("span", { children: student.name }), _jsx("span", { children: student.score === null ? 'Not started' : `${student.score} pts · ${student.attempts} attempts` })] }, student.student_id)) }), _jsxs("a", { className: "button secondary wide", href: `/api/assignments/${assignment.id}/export.csv`, children: ["Download results CSV ", _jsx("span", { children: "\u2193" })] })] }, assignment.id)), !assignments.isLoading && assignments.data?.length === 0 && _jsx(EmptyState, { title: "No assignments yet", detail: "Create a class and assign a lab to get started." })] })] }); }
function History({ user }) { const history = useQuery({ queryKey: ['history', user.id], queryFn: () => api(`/students/${user.id}/history`) }); const labs = useQuery({ queryKey: ['labs'], queryFn: () => api('/labs') }); return _jsxs(_Fragment, { children: [_jsx("div", { className: "page-title-row", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "YOUR PROGRESS" }), _jsx("h1", { children: "Attempt history" }), _jsx("p", { className: "muted", children: "A record of your submitted practice and class work." })] }) }), _jsxs("div", { className: "table-wrap", children: [_jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Lab" }), _jsx("th", { children: "Mode" }), _jsx("th", { children: "Score" }), _jsx("th", { children: "Submitted" })] }) }), _jsx("tbody", { children: history.data?.map((item) => _jsxs("tr", { children: [_jsx("td", { children: labs.data?.find((lab) => lab.id === item.lab_id)?.title ?? item.lab_id.slice(0, 8) }), _jsx("td", { children: item.is_practice ? 'Practice' : 'Assigned' }), _jsxs("td", { children: [item.score, " / ", item.max_score] }), _jsx("td", { children: new Date(item.submitted_at).toLocaleString() })] }, item.id)) })] }), history.data?.length === 0 && _jsx(EmptyState, { title: "No submissions yet", detail: "Your completed labs will appear here." })] })] }); }
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
        const body = Object.fromEntries(new FormData(event.currentTarget));
        try {
            await api('/admin/users', { method: 'POST', body: JSON.stringify(body) });
            event.currentTarget.reset();
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
    return _jsxs(_Fragment, { children: [_jsx("div", { className: "page-title-row", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "PLATFORM HEALTH" }), _jsx("h1", { children: "Admin overview" }), _jsx("p", { className: "muted", children: "Manage demo accounts, lessons, and local session capacity." })] }) }), _jsxs("div", { className: "stats-grid", children: [_jsx(StatCard, { label: "Active sessions", value: system.data?.active_sessions ?? '—', caption: `of ${system.data?.capacity ?? '—'} allowed`, icon: "\u25C9", tone: "mint" }), _jsx(StatCard, { label: "Lab runtime", value: system.data?.runtime ?? '—', caption: "Local lab sessions", icon: "\u2318", tone: "blue" }), _jsx(StatCard, { label: "Managed sessions", value: system.data?.sessions.length ?? '—', caption: "Now in progress", icon: "\u25A4", tone: "gold" })] }), error && _jsx("p", { role: "alert", className: "error-banner", children: error }), message && _jsx("p", { role: "status", className: "success-banner", children: message }), _jsxs("section", { className: "section-block", children: [_jsx(SectionHeading, { title: "Create an account", subtitle: "Local demo email appears in the API terminal." }), _jsxs("form", { className: "inline-form", onSubmit: createUser, children: [_jsxs("label", { children: ["First name", _jsx("input", { name: "first_name", required: true })] }), _jsxs("label", { children: ["Last name", _jsx("input", { name: "last_name", required: true })] }), _jsxs("label", { children: ["Email", _jsx("input", { name: "email", type: "email", required: true })] }), _jsxs("label", { children: ["Role", _jsxs("select", { name: "role", defaultValue: "teacher", children: [_jsx("option", { value: "teacher", children: "Teacher" }), _jsx("option", { value: "student", children: "Student" })] })] }), _jsxs("button", { className: "button primary", children: ["Create account ", _jsx("span", { children: "+" })] })] })] }), _jsxs("section", { className: "section-block", children: [_jsx(SectionHeading, { title: "Accounts", subtitle: "Reset a password or deactivate an account." }), _jsx("div", { className: "table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Email" }), _jsx("th", { children: "Role" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: users.data?.map((account) => _jsxs("tr", { children: [_jsxs("td", { children: [account.first_name, " ", account.last_name] }), _jsx("td", { children: account.email }), _jsx("td", { children: account.role }), _jsx("td", { children: account.is_active ? 'Active' : 'Inactive' }), _jsxs("td", { children: [_jsx("button", { className: "text-button", onClick: () => resetPassword(account.id), children: "Reset password" }), _jsx("button", { className: "text-button", onClick: () => setActive(account.id, !account.is_active), children: account.is_active ? 'Deactivate' : 'Activate' })] })] }, account.id)) })] }) })] }), _jsxs("section", { className: "section-block", children: [_jsx(SectionHeading, { title: "Lesson catalog", subtitle: "Enable or hide a lesson in the student catalog." }), _jsx("div", { className: "table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Lesson" }), _jsx("th", { children: "Availability" }), _jsx("th", {})] }) }), _jsx("tbody", { children: labs.data?.map((lab) => _jsxs("tr", { children: [_jsx("td", { children: lab.title }), _jsx("td", { children: lab.enabled ? 'Enabled' : 'Hidden' }), _jsx("td", { children: _jsx("button", { className: "text-button", onClick: () => setEnabled(lab.id, !lab.enabled), children: lab.enabled ? 'Hide lesson' : 'Enable lesson' }) })] }, lab.id)) })] }) })] }), _jsxs("section", { className: "section-block", children: [_jsx(SectionHeading, { title: "Local demo", subtitle: "Selected labs use private Docker targets; other lessons remain guided exercises.", action: _jsx("button", { className: "danger-button", onClick: terminateAll, disabled: !system.data?.active_sessions, children: "Stop all demo sessions" }) }), _jsxs("div", { className: "status-panel", children: [_jsx("span", { className: "status-dot" }), _jsxs("div", { children: [_jsx("strong", { children: "API responding" }), _jsx("p", { children: "Training targets have no published ports and sessions are cleaned up when stopped." })] })] })] })] });
}
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAup, setShowAup] = useState(false);
    useEffect(() => { api('/me').then((value) => { setUser(value); setShowAup(!value.aup_accepted); }).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
    const login = (value) => { setUser(value); setShowAup(value.email_verified !== false && !value.aup_accepted); };
    const logout = async () => { try {
        await api('/auth/logout', { method: 'POST' });
    }
    catch { /* The local view still clears if the server session has expired. */ } setUser(null); };
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
