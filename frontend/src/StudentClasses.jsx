import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { jsx } from 'react/jsx-runtime'

export function StudentClassLinks({ search = '' }) {
  const classes = useQuery({ queryKey: ['classes'], queryFn: () => api('/classes') })
  if (classes.isPending) return <p role="status">Loading classes…</p>
  if (classes.isError) return <p role="alert" className="error-banner">{classes.error.message}</p>
  const items = classes.data.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
  return <div className="teacher-class-cards student-class-cards">{items.map((classroom, index) => jsx(Link, { className: 'teacher-class-card student-class-link', to: `/classes/${classroom.id}`, children: <><div className="teacher-class-card-title"><span className={`teacher-class-icon tone-${index % 3}`}>▤</span><span className="teacher-badge">Classroom</span></div><h2>{classroom.name}</h2>{classroom.joined_at && <p>Joined in {new Date(classroom.joined_at).toLocaleDateString('en', { month: 'long' })}</p>}<span className="teacher-monitor-link">View assignments and progress →</span></> }, classroom.id))}{!items.length && <div className="teacher-empty"><h3>{search ? 'No matching classes' : 'Your classrooms will appear here'}</h3><p>{search ? 'Try another class name.' : 'Open My classes and enter the join code from your instructor.'}</p></div>}</div>
}

export default function StudentClasses() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  async function join(event) {
    event.preventDefault()
    const form = event.currentTarget
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await api('/classes/join', { method: 'POST', body: JSON.stringify({ code: new FormData(form).get('code') }) })
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['classes'] }), queryClient.invalidateQueries({ queryKey: ['assignments'] })])
      setSearch(''); setMessage(`Joined ${result.name}`); form.reset()
    } catch (reason) { setError(reason.message) } finally { setBusy(false) }
  }
  return <div className="teacher-page student-page"><header className="teacher-page-header"><div><p className="eyebrow">YOUR LEARNING SPACES</p><h1>My classes</h1><p>Keep track of your assignments, due dates, and results in each classroom.</p></div><a className="button secondary" href="#join-class">+ Join a class</a></header><div className="teacher-toolbar"><label className="teacher-search">Search classes<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a class…" /></label></div>{jsx(StudentClassLinks, { search })}<section className="teacher-section student-join-panel" id="join-class"><div><p className="eyebrow">JOIN ANOTHER CLASS</p><h2>A new place to learn</h2><p>Your instructor will give you a private eight-character join code.</p></div><div><form onSubmit={join}><label>Class join code<input name="code" required minLength={8} maxLength={8} placeholder="e.g. ABCD2345" autoCapitalize="characters" /></label><button className="button primary" disabled={busy}>{busy ? 'Joining…' : 'Join class'}</button></form>{error && <p role="alert" className="error-banner">{error}</p>}{message && <p role="status" className="student-success">{message}</p>}</div></section></div>
}
