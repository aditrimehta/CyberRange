import { useState } from 'react'
import { Link } from 'react-router-dom'
import { jsx } from 'react/jsx-runtime'
import { useTeachingClasses } from './TeacherOverview'
import { CreateClassDialog, AssignLabDialog } from './TeacherTools'

export default function TeacherClasses() {
  const { classes, data } = useTeachingClasses()
  const [search, setSearch] = useState('')
  const [create, setCreate] = useState(false)
  const [assign, setAssign] = useState(null)
  const [copied, setCopied] = useState('')
  const [copyError, setCopyError] = useState('')
  const items = (classes.data || []).filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
  async function copy(item) {
    try { await navigator.clipboard.writeText(item.join_code); setCopied(item.id); setCopyError('') }
    catch { setCopyError('Could not copy. You can select and copy the code shown on the card.') }
  }
  return <div className="teacher-page">
    {create && jsx(CreateClassDialog, { onClose: () => setCreate(false) })}
    {assign && jsx(AssignLabDialog, { classId: assign.id, className: assign.name, onClose: () => setAssign(null) })}
    <header className="teacher-page-header"><div><p className="eyebrow">TEACHING SPACES</p><h1>Your classes</h1><p>Each class brings its students, assignments, and extra practice together.</p></div><button className="button primary" onClick={() => setCreate(true)}>+ Create class</button></header>
    <div className="teacher-toolbar"><label className="teacher-search">Search classes<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a class…" /></label><span className="teacher-count">{classes.data?.length ?? 0} active classes</span></div>
    {classes.isPending && <p role="status">Loading classes…</p>}{classes.isError && <p className="error-banner" role="alert">{classes.error.message}</p>}{copyError && <p role="alert">{copyError}</p>}
    <div className="teacher-class-cards">{items.map((item, index) => {
      const detail = data.find((row) => row.id === item.id)
      const completion = detail ? Math.round(detail.analytics.completion_rate * 100) : 0
      return <article className="teacher-class-card" key={item.id}><div className="teacher-class-card-title"><span className={`teacher-class-icon tone-${index % 3}`}>▤</span><span className="teacher-badge">{item.member_count || 0} students</span></div><h2>{item.name}</h2><p>{detail?.assignments.length ?? '—'} assignments · {detail?.analytics.needs_reattempt_count ?? '—'} need reattempt</p><div className="teacher-card-progress"><span>Assignment completion</span><strong>{detail ? `${completion}%` : '—'}</strong><progress max="100" value={completion} aria-label={`${item.name} assignment completion`} /></div><div className="teacher-code"><span>CLASS JOIN CODE<strong>{item.join_code}</strong></span><button className="button secondary" onClick={() => copy(item)}>{copied === item.id ? 'Copied ✓' : 'Copy code'}</button></div><div className="teacher-card-actions">{jsx(Link, { className: 'button primary', to: `/classes/${item.id}`, children: 'Open classroom →' })}<button className="button secondary" onClick={() => setAssign(item)}>Assign lab</button></div></article>
    })}</div>
    {!classes.isPending && !items.length && <div className="teacher-empty"><h2>{search ? 'No matching classes' : 'Create your first class'}</h2><p>{search ? 'Try a different class name.' : 'You’ll get a private join code to share with your students.'}</p></div>}
  </div>
}
