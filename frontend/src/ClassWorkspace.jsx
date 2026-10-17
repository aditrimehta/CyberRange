import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import { useLabLaunch } from './useLabLaunch'
import LabLaunchFeedback from './LabLaunchFeedback'
import { jsx } from 'react/jsx-runtime'
import TeacherClassDashboard from './TeacherClassDashboard'
import StudentClassroom from './StudentClassroom'

export default function ClassWorkspace({ user }) {
  const { classId } = useParams()
  const launch = useLabLaunch()
  const classroom = useQuery({ queryKey: ['class-workspace', classId], queryFn: () => api(`/classes/${classId}/workspace`), refetchInterval: 15000 })
  if (classroom.isPending) return <p role="status">Loading classroom…</p>
  if (classroom.isError) return <p role="alert" className="error-banner">{classroom.error.message}</p>
  const data = classroom.data
  if (user.role !== 'student') return jsx(TeacherClassDashboard, { data })
  return <>{jsx(LabLaunchFeedback, { launch })}{jsx(StudentClassroom, { data, onStart: launch.start })}</>
}
