# Teacher guide

1. Sign in with the teacher account supplied by your administrator and accept the use policy. The teacher overview summarizes your classrooms, unique students, assignment completion, and students who need a follow-up.
2. Choose **Create class** from the overview or Classes page. Class cards include progress, join codes, and quick actions to open the classroom or assign a lab.
3. Students can use the code during sign-up or join another class from their account.
4. Assign an enabled lab to a class roster. Choose a clear title and reasonable attempt count. Due dates and hard deadlines are enforced by the API.
5. Open a classroom and use its **Overview**, **Students**, **Assignments**, and **Extra practice** tabs. The overview highlights students needing reattempts. Search the roster by name/email, filter its status, and open a student's assignment breakdown. Expand assignment results or download a CSV. The global Assignments page can also filter work by class.

The pass mark is 80%. A submission below that mark is retained and requires remediation; students can keep attempting until they pass. Completion counts passed student-assignment pairs, while submitted counts and total attempts are reported separately. Selected scores follow the assignment's best/latest policy. The average score uses one selected score per student-assignment pair so repeated attempts do not inflate it.

Teachers can view their own class assignments and the **Extra practice** submissions of currently enrolled students. Select **Review answers** to inspect a practice attempt's saved answers and feedback. Practice also stays in the student's personal history and does not count toward assignment completion. Other teachers' assignments and work from unenrolled students are excluded. Classroom data and submitted answers, results, feedback, timestamps, and durations are retained in the local SQLite database. Temporary lab containers and their files are deleted separately. Back up the database to retain records across machines.

All three labs have session variants. The platform grades against each session's observed configuration. The live monitor identifies students, classes, and labs by name and asks for confirmation before ending an assigned session.
