import { expect, test } from '@playwright/test'

const api = '/api'

async function login(request: import('@playwright/test').APIRequestContext, email: string, password: string) {
  const response = await request.post(`${api}/auth/login`, { data: { email, password } })
  expect(response.ok()).toBeTruthy()
  const csrf = await request.get(`${api}/auth/csrf`)
  expect(csrf.ok()).toBeTruthy()
  return (await csrf.json()).csrf_token as string
}

test('teacher creates a class, student joins, submits an assigned lab, and teacher sees the result', async ({ playwright, page }) => {
  const teacher = await playwright.request.newContext({ baseURL: process.env.BASE_URL ?? 'http://localhost' })
  const student = await playwright.request.newContext({ baseURL: process.env.BASE_URL ?? 'http://localhost' })
  try {
    const teacherCsrf = await login(teacher, 'teacher@cyberrange.local', 'RangeTeacher!2026')
    const studentCsrf = await login(student, 'student1@cyberrange.local', 'RangeStudent1!2026')
    const classResponse = await teacher.post(`${api}/classes`, { headers: { 'X-CSRF-Token': teacherCsrf }, data: { name: 'E2E Range Class', term: 'Automated' } })
    expect(classResponse.ok()).toBeTruthy()
    const classroom = await classResponse.json() as { id: string; join_code: string }
    const joinResponse = await student.post(`${api}/classes/join`, { headers: { 'X-CSRF-Token': studentCsrf }, data: { code: classroom.join_code } })
    expect(joinResponse.ok()).toBeTruthy()
    const labsResponse = await teacher.get(`${api}/labs`)
    const labs = await labsResponse.json() as { id: string; title: string }[]
    expect(labs.length).toBeGreaterThan(0)
    const assignmentResponse = await teacher.post(`${api}/assignments`, { headers: { 'X-CSRF-Token': teacherCsrf }, data: { lab_id: labs[0].id, class_id: classroom.id, title: 'E2E assigned lab' } })
    expect(assignmentResponse.ok()).toBeTruthy()
    const assignment = await assignmentResponse.json() as { id: string; lab_id: string }
    const sessionResponse = await student.post(`${api}/lab-sessions`, { headers: { 'X-CSRF-Token': studentCsrf }, data: { lab_id: assignment.lab_id, assignment_id: assignment.id } })
    expect(sessionResponse.ok()).toBeTruthy()
    const session = await sessionResponse.json() as { id: string }
    const submitResponse = await student.post(`${api}/lab-sessions/${session.id}/submit`, { headers: { 'X-CSRF-Token': studentCsrf }, data: { answers: {} } })
    expect(submitResponse.ok()).toBeTruthy()
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    const resultResponse = await teacher.get(`${api}/assignments/${assignment.id}/results`)
    const results = await resultResponse.json() as { status: string; attempts: number }[]
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ status: 'submitted', attempts: 1 })
  } finally {
    await teacher.dispose()
    await student.dispose()
  }
})
