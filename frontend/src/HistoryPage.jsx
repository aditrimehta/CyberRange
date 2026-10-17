import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { jsx } from 'react/jsx-runtime'
import { api } from './api'
import { SummaryCard, StudentStatus } from './WorkspaceUI'

export default function HistoryPage({ user }) {
  const history = useQuery({ queryKey: ['history', user.id], queryFn: () => api(`/students/${user.id}/history`) })
  const labs = useQuery({ queryKey: ['labs'], queryFn: () => api('/labs') })
  const [filter, setFilter] = useState('all')
  const [mode, setMode] = useState('all')
  const attempts = history.data || []
  const passed = attempts.filter((item) => item.passed).length
  const items = attempts.filter((item) => (filter !== 'passed' || item.passed) && (filter !== 'retry' || !item.passed) && (mode !== 'practice' || item.is_practice) && (mode !== 'assigned' || !item.is_practice))
  return <div className="teacher-page student-page"><header className="teacher-page-header"><div><p className="eyebrow">YOUR LEARNING RECORD</p><h1>Attempt history</h1><p>Every submission, including the ones you learned from. Open an attempt to review your feedback.</p></div>{jsx(Link, { to: '/labs', className: 'button secondary', children: 'Practice a lab →' })}</header>
    <div className="teacher-stats student-class-stats">{jsx(SummaryCard, { label: 'Submitted attempts', value: history.isPending ? '—' : attempts.length, note: 'Practice and assigned work' })}{jsx(SummaryCard, { label: 'Passing attempts', value: history.isPending ? '—' : passed, note: 'Scored 80% or above' })}{jsx(SummaryCard, { label: 'Below the pass mark', value: history.isPending ? '—' : attempts.length - passed, note: 'Past attempts with feedback to review' })}</div>
    <section className="teacher-section"><div className="teacher-section-title"><div><h2>Your submissions</h2><p>Your results remain saved after the temporary lab environment is removed.</p></div></div><div className="teacher-toolbar"><label>Result<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All results</option><option value="passed">Passed</option><option value="retry">Below 80%</option></select></label><label>Work type<select value={mode} onChange={(event) => setMode(event.target.value)}><option value="all">All work</option><option value="assigned">Assigned work</option><option value="practice">Extra practice</option></select></label><span className="teacher-count">{items.length} attempts</span></div>
      {history.isPending && <p role="status">Loading history…</p>}{history.isError && <p role="alert" className="error-banner">{history.error.message}</p>}
      <div className="teacher-table-scroll"><table><thead><tr><th>Lab</th><th>Work type</th><th>Score</th><th>Result</th><th>Submitted</th><th>Time</th><th>Feedback</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{labs.data?.find((lab) => lab.id === item.lab_id)?.title || 'Lab'}</strong></td><td><span className="teacher-badge">{item.is_practice ? 'Extra practice' : 'Assigned'}</span></td><td>{item.score}/{item.max_score}<small className="teacher-score-percent">{item.percentage}%</small></td><td>{jsx(StudentStatus, { status: item.passed ? 'Passed' : 'Needs reattempt' })}</td><td>{new Date(item.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td><td>{Math.round(item.duration_seconds / 60)} min</td><td>{jsx(Link, { to: `/workspace/${item.session_id}`, className: 'teacher-inline-action', children: 'Review attempt →' })}</td></tr>)}</tbody></table></div>
      {!history.isPending && !history.isError && !items.length && <div className="teacher-empty"><span className="teacher-clear-mark">◷</span><h3>{attempts.length ? 'No matching attempts' : 'Your progress starts with one attempt'}</h3><p>{attempts.length ? 'Try another result or work-type filter.' : 'Complete a class assignment or practice lab to see your feedback here.'}</p></div>}
    </section>
  </div>
}
