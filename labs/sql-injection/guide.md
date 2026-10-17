# SQL Injection and Parameterized Queries

This exercise uses a disposable SQLite database with fictional accounts. The account count, admin role, and example payload vary between sessions. Read your own output when answering.

## Tasks

1. Enter `student` and `demo-student-password`, then choose **Test current login**. One account should match.
2. Use the training input shown under the form as the username, then try the vulnerable action again.
3. Observe which sample accounts the unsafe query returns.
4. Keep the bypass input in the form and choose **Apply fix and retest same input**. Zero accounts should match.
5. Test a normal login again. It should still work with the fix enabled.
6. Answer the questions and submit for feedback.

## What the payload means

Your session shows a boolean-based training payload such as `' OR 1=1 -- `. A payload is deliberately chosen input used to test application behavior. The leading quote closes the username string, `OR 1=1` adds an always-true condition, and `-- ` comments out the remaining unsafe password check. The result can match multiple accounts without a valid password. Compare it with an ordinary username and a false condition such as `' OR 1=2 -- `.

Other SQL injection categories include UNION-based queries, error-based information leaks, and blind techniques using response differences or timing. Their syntax depends on the database and application. This lab focuses on understanding the boolean bypass and verifying the parameterized fix; the other categories are context, not additional tasks.

Submit below the answers. Scores below 80% are saved as **Needs reattempt**. Review the feedback and start a new attempt to pass.

The fix switches this session's application to bound parameters and saves that mode in its temporary filesystem. All later login tests use the protected query. Compare the query template and matched accounts before and after. Starting a fresh session restores the vulnerable training application. The database and saved mode disappear when the environment is removed.
