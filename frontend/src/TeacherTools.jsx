import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'

export function CreateClassDialog({ onClose }) {
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function create(event) {
    event.preventDefault()
    const form = event.currentTarget
    setBusy(true); setError('')
    try {
      await api('/classes', { method: 'POST', body: JSON.stringify({ name: new FormData(form).get('name') }) })
      await client.invalidateQueries({ queryKey: ['classes'] })
      onClose()
    } catch (reason) { setError(reason.message) } finally { setBusy(false) }
  }
  return <div className="modal-backdrop"><section className="modal teacher-dialog" role="dialog" aria-modal="true" aria-labelledby="create-class-title"><p className="eyebrow">TEACHING SPACE</p><h2 id="create-class-title">Create a class</h2><p>Students can join using the private code generated for this class.</p><form className="form-stack" onSubmit={create}><label>Class name<input name="name" required maxLength={160} placeholder="e.g. Introduction to Cybersecurity" autoFocus /></label>{error && <p className="error-banner" role="alert">{error}</p>}<div className="teacher-dialog-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Creating…' : 'Create class'}</button></div></form></section></div>
}

export function AssignLabDialog({ classId, className, onClose }) {
  const client = useQueryClient()
  const labs = useQuery({ queryKey: ['labs'], queryFn: () => api('/labs') })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function assign(event) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true); setError('')
    try {
      await api('/assignments', { method: 'POST', body: JSON.stringify({ ...values, class_id: classId, max_attempts: Number(values.max_attempts), due_at: values.due_at ? new Date(values.due_at).toISOString() : null }) })
      await Promise.all([client.invalidateQueries({ queryKey: ['class-workspace', classId] }), client.invalidateQueries({ queryKey: ['assignments'] })])
      onClose()
    } catch (reason) { setError(reason.message) } finally { setBusy(false) }
  }
  return <div className="modal-backdrop"><section className="modal teacher-dialog" role="dialog" aria-modal="true" aria-labelledby="assign-lab-title"><p className="eyebrow">{className}</p><h2 id="assign-lab-title">Assign a lab</h2><p>This assignment will be added for the current class roster.</p><form className="form-stack" onSubmit={assign}>
    <label>Lab<select name="lab_id" defaultValue="" required><option value="" disabled>{labs.isPending ? 'Loading labs…' : 'Choose a lab'}</option>{labs.data?.map((lab) => <option key={lab.id} value={lab.id}>{lab.title}</option>)}</select></label>
    <label>Assignment title<input name="title" required maxLength={180} placeholder="e.g. Week 1 · Discover exposed services" /></label>
    <label>Instructions<textarea name="instructions" rows={3} maxLength={5000} placeholder="What should students focus on?" /></label>
    <div className="teacher-form-pair"><label>Due date (optional)<input type="datetime-local" name="due_at" /></label><label>Normal attempt allowance<input type="number" name="max_attempts" min={1} max={20} defaultValue={3} required /></label></div>
    <label>Score to report<select name="scoring_policy" defaultValue="best"><option value="best">Best attempt</option><option value="latest">Latest attempt</option></select></label>
    <p className="teacher-form-note">Pass mark: 80%. Students below the pass mark can continue remediation after the normal allowance.</p>
    {(error || labs.isError) && <p className="error-banner" role="alert">{error || labs.error.message}</p>}
    <div className="teacher-dialog-actions"><button type="button" className="button secondary" onClick={onClose} disabled={busy}>Cancel</button><button className="button primary" disabled={busy || !labs.data?.length}>{busy ? 'Assigning…' : 'Create assignment'}</button></div>
  </form></section></div>
}
