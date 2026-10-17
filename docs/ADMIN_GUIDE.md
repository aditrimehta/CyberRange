# Administrator guide

Use the demo administrator account printed by `scripts/seed_dev.py`. The admin overview lets you create accounts, activate or deactivate them, reset passwords, and enable or hide lessons. The seed command is for local demos only.

Admin sign-in opens **Administration** directly. Admin navigation does not include the learner Overview or Lab Catalog. Lab availability inside Administration is a management control. Runtime settings, role changes, catalog sync, and audit-log reads are also available through admin-only API endpoints; not every endpoint has a screen in this demo.

For this local demo, account setup and password reset messages are printed in the API terminal instead of being emailed. Keep that terminal private. The app stores demo data in SQLite. Only Nmap, SQL injection, and security log analysis are offered in the catalog and assignments. All three use disposable Docker environments hosted through the configured Linux VM.

The demo environment selects Ubuntu with `LAB_VM_DISTRO`. Each session has its own private network and temporary files. Stop, submission, idle expiry, and time expiry remove those resources; the shared VM and image cache remain. Keep the API running for scheduled cleanup, and stop active sessions before shutting it down. Cleanup failures remain available for retry when Docker returns.

This is a local college prototype, not a hosted service.
