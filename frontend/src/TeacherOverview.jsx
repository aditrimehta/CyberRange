import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { jsx } from 'react/jsx-runtime'
import { api } from './api'
import { CreateClassDialog } from './TeacherTools'

export function useTeachingClasses() {
  const classes = useQuery({ queryKey: ['classes'], queryFn: () => api('/classes') })
  const details = useQueries({ queries: (classes.data || []).map((item) => ({ queryKey: ['class-workspace', item.id], queryFn: () => api(`/classes/${item.id}/workspace`), staleTime: 15000 })) })
  return { classes, details, data: details.flatMap((result) => result.data ? [result.data] : []) }
}

export function TeacherStat({ label, value, note, tone = '' }) {
  return <div className={`teacher-stat ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
}

export default function TeacherOverview({ user }) {
  const { classes, details, data } = useTeachingClasses()
  const [create, setCreate] = useState(false)
  const students = new Set(data.flatMap((item) => item.students.map((student) => student.id))).size
  const attention = data.flatMap((item) => item.students.filter((student) => student.needs_reattempt > 0).map((student) => ({ ...student, classId: item.id, className: item.name })))
  const passed = data.reduce((sum, item) => sum + item.analytics.passed_count, 0)
  const targets = data.reduce((sum, item) => sum + item.analytics.target_count, 0)
  const loading = classes.isPending || details.some((item) => item.isPending)
  const failed = classes.isError || details.some((item) => item.isError)
  return <div className="teacher-page">
    {create && jsx(CreateClassDialog, { onClose: () => setCreate(false) })}
    <header className="teacher-page-header"><div><p className="eyebrow">TEACHER WORKSPACE</p><h1>Hello, {user.first_name}.</h1><p>See how your classes are doing and where a little guidance can help.</p></div><button className="button primary" onClick={() => setCreate(true)}>+ Create class</button></header>
    {failed && <p className="error-banner" role="alert">Some classroom data could not load. Open the class to retry.</p>}
    <div className="teacher-stats">
      {jsx(TeacherStat, { label: 'Your classes', value: classes.data?.length ?? '—', note: 'Active teaching spaces' })}
      {jsx(TeacherStat, { label: 'Students', value: loading ? '—' : students, note: 'Unique students across your classes' })}
      {jsx(TeacherStat, { label: 'Need a follow-up', value: loading ? '—' : new Set(attention.map((item) => item.id)).size, note: 'Students with assigned work below 80%', tone: 'warm' })}
      {jsx(TeacherStat, { label: 'Assignment completion', value: loading ? '—' : `${targets ? Math.round(passed / targets * 100) : 0}%`, note: `${passed} of ${targets} student assignments passed` })}
    </div>
    <div className="teacher-overview-grid"><section className="teacher-section"><div className="teacher-section-title"><div><h2>Your classes</h2><p>Open a classroom to review work or assign the next lab.</p></div>{jsx(Link, { to: '/classes', className: 'link-button', children: 'View all →' })}</div>
      {loading && !data.length && <p className="teacher-empty" role="status">Loading your classrooms…</p>}
      <div className="teacher-class-list">{(classes.data || []).map((item, index) => {
        const detail = data.find((row) => row.id === item.id)
        return jsx(Link, { to: `/classes/${item.id}`, className: 'teacher-class-row', children: <><span className={`teacher-class-icon tone-${index % 3}`}>▤</span><span><strong>{item.name}</strong><small>{item.member_count || 0} students · {detail?.assignments.length ?? '—'} assignments</small></span><span className="teacher-row-progress">{detail ? `${Math.round(detail.analytics.completion_rate * 100)}%` : '—'}<small>passed</small></span><span aria-hidden="true">→</span></> }, item.id)
      })}</div>
      {!classes.isPending && !classes.data?.length && <div className="teacher-empty"><h3>Your first classroom starts here</h3><p>Create a class, share its join code, and assign a guided lab.</p><button className="button primary" onClick={() => setCreate(true)}>Create a class</button></div>}
    </section><section className="teacher-section"><div className="teacher-section-title"><div><h2>Needs attention</h2><p>A focused view of students who need another attempt.</p></div><span className="teacher-badge warm">{attention.length}</span></div>
      {attention.slice(0, 6).map((student) => <div className="teacher-attention-row" key={`${student.classId}-${student.id}`}><span className="avatar">{student.first_name[0]}{student.last_name[0]}</span><div><strong>{student.first_name} {student.last_name}</strong><small>{student.className} · {student.needs_reattempt} to reattempt</small></div>{jsx(Link, { className: 'link-button', to: `/classes/${student.classId}?tab=students&filter=retry`, children: 'Review →' })}</div>)}
      {!loading && !attention.length && <div className="teacher-empty"><span className="teacher-clear-mark">✓</span><h3>No reattempts waiting</h3><p>Students who score below 80% will appear here.</p></div>}
      {jsx(Link, { to: '/monitor', className: 'teacher-monitor-link', children: '◉ Open live session monitor →' })}
    </section></div>
  </div>
}
