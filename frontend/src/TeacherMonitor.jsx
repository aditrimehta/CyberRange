import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'

export default function TeacherMonitor() {
  const client = useQueryClient()
  const sessions = useQuery({ queryKey: ['monitor'], queryFn: () => api('/monitor/sessions'), refetchInterval: 5000 })
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function end() {
    setBusy(true); setError('')
    try { await api(`/monitor/sessions/${selected.id}/terminate`, { method: 'POST' }); setSelected(null); await client.invalidateQueries({ queryKey: ['monitor'] }) }
    catch (reason) { setError(reason.message) } finally { setBusy(false) }
  }
  return <div className="teacher-page"><header className="teacher-page-header"><div><p className="eyebrow">CLASSROOM ACTIVITY</p><h1>Live monitor</h1><p>See who is working on an assigned lab. Updates every five seconds.</p></div><span className="teacher-badge good"><i className="status-dot" /> Live · {sessions.data?.length || 0} active</span></header>
    {sessions.isError && <p className="error-banner" role="alert">{sessions.error.message}</p>}{sessions.isPending && <p role="status">Loading sessions…</p>}
    <section className="teacher-section"><div className="teacher-table-scroll"><table><thead><tr><th>Student</th><th>Class</th><th>Lab</th><th>Status</th><th>Time left</th><th>Actions</th></tr></thead><tbody>{sessions.data?.map((item) => <tr key={item.id}><td><strong>{item.student_name}</strong></td><td>{item.class_name}</td><td>{item.lab_title}</td><td><span className={`teacher-badge ${item.status === 'running' ? 'good' : 'warm'}`}>{item.status === 'running' ? 'Working' : 'Starting'}</span></td><td>{Math.max(0, Math.ceil((Date.parse(item.expires_at) - Date.now()) / 60000))} min</td><td><button className="teacher-inline-action" onClick={() => setSelected(item)}>End session</button></td></tr>)}</tbody></table></div>{!sessions.isPending && !sessions.data?.length && <div className="teacher-empty"><span className="teacher-clear-mark">◉</span><h3>No active assigned sessions</h3><p>Students appear here when they start an assignment in your class.</p></div>}</section>
    {selected && <div className="modal-backdrop"><section className="modal teacher-dialog" role="dialog" aria-modal="true" aria-labelledby="end-session-title"><h2 id="end-session-title">End this session?</h2><p>{selected.student_name} is working on {selected.lab_title}. Ending the session removes the temporary lab environment. Previously saved drafts and submissions are retained.</p>{error && <p className="error-banner" role="alert">{error}</p>}<div className="teacher-dialog-actions"><button className="button secondary" disabled={busy} onClick={() => setSelected(null)}>Keep working</button><button className="button primary" disabled={busy} onClick={end}>{busy ? 'Ending…' : 'End session'}</button></div></section></div>}
  </div>
}
