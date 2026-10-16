# Local college demo

## Scope

This is a presentation prototype for one computer. It uses a local SQLite file and the `FakeRuntime`. Lab guides, accounts, class assignments, submissions, and grading are available; the desktop is a placeholder and does not run security tools. No online account or paid service is needed.

## Demo flow

1. Start the API, seed demo records, and start the website using the commands in the root README.
2. Sign in as the teacher using the credentials printed by the seed command. Show the class roster, assignments, and results screens.
3. Sign in as a student in another browser profile, open a lesson, enter answers, and submit them.
4. Return to the teacher profile to show the submitted result.

The seed script prints the credentials and join code. Keep those local to the demo and do not reuse them for real accounts.

## Stop and reset

Stop the API and website with `Ctrl+C` in their terminals. To reset demo data, stop the API, delete `backend/cyberrange.db`, then repeat the seed steps. The fake runtime creates no containers.
