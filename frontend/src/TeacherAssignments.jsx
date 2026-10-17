import { useState } from 'react'
import { jsx } from 'react/jsx-runtime'
import { useTeachingClasses } from './TeacherOverview'
import { AssignmentCards } from './TeacherClassDashboard'
import { AssignLabDialog } from './TeacherTools'

export default function TeacherAssignments() {
  const { classes, details, data } = useTeachingClasses()
  const [classId, setClassId] = useState('all')
  const [search, setSearch] = useState('')
  const [assign, setAssign] = useState(false)
  const classroom = classes.data?.find((item) => item.id === classId)
  const items = data.filter((item) => classId === 'all' || item.id === classId).flatMap((item) => item.assignments.map((assignment) => ({ ...assignment, className: item.name }))).filter((item) => `${item.title} ${item.lab_title}`.toLowerCase().includes(search.toLowerCase()))
  const loading = classes.isPending || details.some((item) => item.isPending)
  return <div className="teacher-page">
    {assign && classroom && jsx(AssignLabDialog, { classId, className: classroom.name, onClose: () => setAssign(false) })}
    <header className="teacher-page-header"><div><p className="eyebrow">ASSESSMENT</p><h1>Assignments</h1><p>Track results across your classes, then focus on the work that needs attention.</p></div>{classroom && <button className="button primary" onClick={() => setAssign(true)}>+ Assign lab</button>}</header>
    <div className="teacher-toolbar"><label className="teacher-search">Search assignments<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title or lab name…" /></label><label>Class<select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="all">All classes</option>{classes.data?.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><span className="teacher-count">{items.length} assignments</span></div>
    {loading && <p role="status">Loading assignment results…</p>}{(classes.isError || details.some((item) => item.isError)) && <p className="error-banner" role="alert">Some results could not be loaded. Open the classroom to retry.</p>}
    {jsx(AssignmentCards, { assignments: items })}
    {!loading && !items.length && <div className="teacher-empty"><h2>No assignments found</h2><p>{search ? 'Try another title or lab name.' : 'Choose a class above to create an assignment for its students.'}</p></div>}
  </div>
}
