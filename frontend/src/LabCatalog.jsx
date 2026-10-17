import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { jsx } from 'react/jsx-runtime'
import { api } from './api'
import { StudentLabCard } from './WorkspaceUI'
import { useLabLaunch } from './useLabLaunch'
import LabLaunchFeedback from './LabLaunchFeedback'

export default function LabCatalog() {
  const labs = useQuery({ queryKey: ['labs'], queryFn: () => api('/labs') })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const launch = useLabLaunch()
  const items = (labs.data || []).filter((lab) => (filter === 'all' || lab.difficulty === filter) && `${lab.title} ${lab.category}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="teacher-page student-page">{jsx(LabLaunchFeedback, { launch })}<header className="teacher-page-header"><div><p className="eyebrow">HANDS-ON PRACTICE</p><h1>Lab catalog</h1><p>Three guided exercises, real observations, and a fresh environment for every attempt.</p></div><span className="teacher-badge good">Pass mark: 80%</span></header><div className="teacher-toolbar"><label className="teacher-search">Search labs<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Skill or lab name…" /></label><label>Difficulty<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All difficulties</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label><span className="teacher-count">{items.length} labs</span></div><div className="student-lab-grid">{items.map((lab, index) => jsx(StudentLabCard, { lab, index, onStart: () => launch.start(lab.id) }, lab.id))}</div>{labs.isPending && <p role="status">Loading labs…</p>}{labs.isError && <p className="error-banner" role="alert">{labs.error.message}</p>}{!labs.isPending && !items.length && !labs.isError && <div className="teacher-empty"><h2>No matching labs</h2><p>Try another skill or difficulty.</p></div>}</div>
}
