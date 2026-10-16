# SQL Injection and Parameterized Queries

This exercise uses a disposable SQLite database inside the local training target. It contains three made-up accounts and no real credentials or personal data.

## Tasks

1. Enter a harmless username and password and choose **Try vulnerable login**.
2. Use the training input shown under the form as the username, then try the vulnerable action again.
3. Observe which sample accounts the unsafe query returns.
4. Send the same input to **Try safe login** and compare the result.
5. Answer the questions and submit for feedback.

The vulnerable action demonstrates unsafe SQL string construction. The safe action uses bound parameters. Both are fixed operations against the private training fixture; the app does not accept shell commands or connect to another database.
