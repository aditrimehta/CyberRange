import { useState } from 'react'
import { Link } from 'react-router-dom'
import { jsx } from 'react/jsx-runtime'
import { SummaryCard, StudentAssignmentCards } from './WorkspaceUI'

export default function StudentClassroom({ data, onStart }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const passed = data.assignments.filter((item) => item.passed).length
  const retry = data.assignments.filter((item) => item.status === 'Needs reattempt').length
  const items = data.assignments.filter((item) => `${item.title} ${item.lab_title}`.toLowerCase().includes(search.toLowerCase()) && (filter !== 'pending' || !item.passed) && (filter !== 'retry' || item.status === 'Needs reattempt') && (filter !== 'passed' || item.passed))
  return <div className="teacher-page student-page">
    {jsx(Link, { to: '/classes', className: 'back-link', children: '← My classes' })}
    <header className="teacher-page-header teacher-class-header"><div><p className="eyebrow">YOUR CLASSROOM</p><h1>{data.name}</h1><p>{data.joined_at && <>Joined in {new Date(data.joined_at).toLocaleDateString('en', { month: 'long' })} · </>}{data.teacher}</p></div><span className="teacher-badge good">Pass mark: {data.pass_mark}%</span></header>
    <div className="teacher-stats student-class-stats">{jsx(SummaryCard, { label: 'Assigned to you', value: data.assignments.length, note: 'Labs in this classroom' })}{jsx(SummaryCard, { label: 'Passed', value: passed, note: 'Scored 80% or above' })}{jsx(SummaryCard, { label: 'Needs reattempt', value: retry, note: 'Review feedback and try again', tone: retry ? 'warm' : '' })}</div>
    <div className="teacher-section-title"><div><h2>Assignments</h2><p>Work assigned by your instructor, with your progress saved along the way.</p></div></div>
    <div className="teacher-toolbar"><label className="teacher-search">Search assignments<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title or lab name…" /></label><label>Progress<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All assignments</option><option value="pending">To do</option><option value="retry">Needs reattempt</option><option value="passed">Passed</option></select></label><span className="teacher-count">{items.length} assignments</span></div>
    {jsx(StudentAssignmentCards, { assignments: items, onStart })}
    {!items.length && <div className="teacher-empty"><span className="teacher-clear-mark">▤</span><h3>{data.assignments.length ? 'No work matches these filters' : 'No assignments yet'}</h3><p>{data.assignments.length ? 'Try another progress filter or search term.' : 'Your instructor’s assignments will appear here when they are assigned to you.'}</p></div>}
  </div>
}
