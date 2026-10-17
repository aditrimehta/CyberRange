import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from './api'

export function useLabLaunch() {
  const navigate = useNavigate()
  const locked = useRef(false)
  const [state, setState] = useState(null)

  async function start(labId, assignmentId, stopId) {
    if (locked.current) return
    locked.current = true
    setState({ pending: true, message: stopId ? 'Stopping your previous lab and preparing the new one…' : 'Preparing your lab…' })
    try {
      if (stopId) await api(`/lab-sessions/${stopId}/stop`, { method: 'POST' })
      const session = await api('/lab-sessions', { method: 'POST', body: JSON.stringify({ lab_id: labId, assignment_id: assignmentId }) })
      navigate(`/workspace/${session.id}`)
      setState(null)
    } catch (error) {
      setState({ error: error.message, active: error.detail?.active_session, labId, assignmentId })
    } finally {
      locked.current = false
    }
  }

  return { start, state, dismiss: () => setState(null), resume: () => { navigate(`/workspace/${state.active.id}`); setState(null) } }
}
