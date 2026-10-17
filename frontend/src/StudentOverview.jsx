import { Link } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { jsx } from 'react/jsx-runtime'
import { api } from './api'
import { SummaryCard, StudentLabCard, StudentStatus } from './WorkspaceUI'
import { useLabLaunch } from './useLabLaunch'
import LabLaunchFeedback from './LabLaunchFeedback'
import { StudentClassLinks } from './StudentClasses'

export default function StudentOverview({ user }) {
  const classes = useQuery({ queryKey: ['classes'], queryFn: () => api('/classes') })
  const labs = useQuery({ queryKey: ['labs'], queryFn: () => api('/labs') })
  const history = useQuery({ queryKey: ['history', user.id], queryFn: () => api(`/students/${user.id}/history`) })
  const details = useQueries({ queries: (classes.data || []).map((item) => ({ queryKey: ['class-workspace', item.id], queryFn: () => api(`/classes/${item.id}/workspace`), staleTime: 15000 })) })
  const launch = useLabLaunch()
  const assignments = details.flatMap((result) => result.data ? result.data.assignments.map((item) => ({ ...item, className: result.data.name })) : [])
  const pending = assignments.filter((item) => !item.passed).sort((left, right) => Number(!!right.active_session_id) - Number(!!left.active_session_id) || Number(right.status === 'Needs reattempt') - Number(left.status === 'Needs reattempt') || (Date.parse(left.due_at || '') || Infinity) - (Date.parse(right.due_at || '') || Infinity))
  const passed = assignments.filter((item) => item.passed).length
  const retries = assignments.filter((item) => item.status === 'Needs reattempt').length
  const independent = new Set((history.data || []).filter((item) => item.is_practice && item.passed).map((item) => item.lab_id)).size
  const loading = classes.isPending || details.some((result) => result.isPending)
  const failed = classes.isError || details.some((result) => result.isError)
  return <div className="teacher-page student-page">
    {jsx(LabLaunchFeedback, { launch })}
    <header className="teacher-page-header"><div><p className="eyebrow">STUDENT WORKSPACE</p><h1>Hello, {user.first_name}.</h1><p>Pick up your class work or explore something new in the practice labs.</p></div>{jsx(Link, { to: '/labs', className: 'button primary', children: 'Explore labs →' })}</header>
    <div className="teacher-stats">
      {jsx(SummaryCard, { label: 'My classes', value: classes.data?.length ?? '—', note: 'Your learning spaces' })}
      {jsx(SummaryCard, { label: 'Assigned work', value: loading ? '—' : assignments.length, note: `${passed} assignment${passed === 1 ? '' : 's'} passed` })}
      {jsx(SummaryCard, { label: 'Needs reattempt', value: loading ? '—' : retries, note: 'Assigned labs below 80%', tone: retries ? 'warm' : '' })}
      {jsx(SummaryCard, { label: 'Practice labs passed', value: history.isPending ? '—' : history.isError ? '—' : independent, note: 'Different labs passed independently' })}
    </div>
    {failed && <p className="error-banner" role="alert">Some class work could not load. Open My classes to try again.</p>}
    <div className="teacher-overview-grid"><section className="teacher-section"><div className="teacher-section-title"><div><h2>Continue learning</h2><p>Active work and reattempts appear first.</p></div>{jsx(Link, { to: '/classes', className: 'link-button', children: 'My classes →' })}</div>
      {loading && <p role="status" className="teacher-empty">Loading your assignments…</p>}
      {pending.slice(0, 4).map((item) => <div className="student-work-row" key={item.id}><span className="teacher-class-icon">▤</span><div><strong>{item.title}</strong><small>{item.className} · {item.due_at ? `Due ${new Date(item.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'No due date'}</small>{jsx(StudentStatus, { status: item.status })}</div><button className="button secondary" onClick={() => launch.start(item.lab_id, item.id)}>{item.active_session_id ? 'Resume' : item.status === 'Needs reattempt' ? 'Reattempt' : 'Start lab'}</button></div>)}
      {!loading && !pending.length && <div className="teacher-empty"><span className="teacher-clear-mark">✓</span><h3>{assignments.length ? 'All assigned work passed' : 'Ready when you are'}</h3><p>{assignments.length ? 'Explore a practice lab while you wait for your next assignment.' : 'Join a class or start a practice lab to build your skills.'}</p></div>}
    </section><section className="teacher-section student-progress-panel"><div className="teacher-section-title"><div><h2>Your progress</h2><p>Every attempt helps you learn.</p></div></div><div className="teacher-progress-summary"><div className="teacher-progress-ring" style={{ '--progress': `${assignments.length ? Math.round(passed / assignments.length * 100) : 0}%` }} role="img" aria-label={`${passed} of ${assignments.length} assignments passed`}><span><strong>{assignments.length ? Math.round(passed / assignments.length * 100) : 0}%</strong><small>assigned work passed</small></span></div><div><strong>{passed} of {assignments.length}</strong><p>assignments passed</p><span className="teacher-badge good">Pass mark: 80%</span></div></div><p className="student-progress-note">Scores below 80% are saved with feedback. Review what you missed, then try again.</p>{jsx(Link, { to: '/history', className: 'teacher-monitor-link', children: 'Review my attempts →' })}</section></div>
    <section className="section-block"><div className="teacher-section-title"><div><h2>My classes</h2><p>Your assignments, due dates, and results in each classroom.</p></div>{jsx(Link, { to: '/classes', className: 'link-button', children: 'View all / join a class →' })}</div>{jsx(StudentClassLinks, {})}</section>
    <section className="section-block"><div className="teacher-section-title"><div><h2>Practice independently</h2><p>Choose a skill and learn by doing. Your attempts are saved.</p></div>{jsx(Link, { to: '/labs', className: 'link-button', children: 'Lab catalog →' })}</div><div className="student-lab-grid">{labs.data?.map((lab, index) => jsx(StudentLabCard, { lab, index, onStart: () => launch.start(lab.id) }, lab.id))}</div>{labs.isPending && <p role="status">Loading practice labs…</p>}{labs.isError && <p className="error-banner" role="alert">{labs.error.message}</p>}</section>
  </div>
}
