INCIDENT MANAGEMENT — SQLITE + ROLE-BASED LOGIN + ADMIN USER MANAGEMENT

The project stores incidents and login accounts in database.db. The server creates the accounts table and adds the is_active column automatically on first startup. Existing incident and legacy user data are retained.

DEMO LOGIN ACCOUNTS
Admin:       username admin       password Admin@123
Employee:    username employee    password Employee@123
Technician:  username technician  password Tech@123

ADMIN USER MANAGEMENT
1. Sign in as admin.
2. The User Management section appears above the Incident Register.
3. Enter the person's full name, a unique username, role (Employee or Technician), and an initial password of at least 8 characters.
4. Select Create account. The initial login details are displayed once; copy/save them and share them securely.
5. The Registered Accounts list shows names, usernames, roles, account status, and creation time. It never displays stored password hashes or old passwords.
6. Use Reset password to set a new password. The newly set password is displayed once so the admin can share it securely.
7. Use Deactivate/Activate to disable or restore an employee/technician account. Deactivated accounts cannot sign in and active sessions are rejected on their next authenticated request.

USERNAME RULES
- 3–30 characters; lowercase letters, numbers, dots, underscores and hyphens.
- Usernames are unique.
- Passwords must be 8–72 characters.
- Admin accounts cannot be deactivated through this screen.

ROLE PERMISSIONS
- Admin: view, create, edit, assign and delete all incidents; manage employee and technician accounts.
- Employee: create incidents and view only incidents they reported.
- Technician: view incidents assigned to their username and update their status.

ASSIGNING A TECHNICIAN
When Admin creates or edits an incident, enter the technician username exactly as shown in User Management.

HOW TO RUN (WINDOWS POWERSHELL)
1. Extract the ZIP and open the project folder in VS Code.
2. Open Terminal > New Terminal.
3. Run: npm.cmd install
4. Run: npm.cmd start
5. Open: http://localhost:3000
6. Sign in using one of the demo accounts above.

SECURITY NOTES
- Passwords are stored as bcrypt hashes, not plain text.
- Existing passwords cannot be viewed; use Reset password instead.
- Sessions use HTTP-only cookies.
- Set a strong SESSION_SECRET environment variable before use outside local testing.
- Change demo passwords before deployment. These are demonstration credentials.
- The default session store is Express MemoryStore, suitable only for local/demo use; use a persistent session store for deployment.

DATA / DELIVERY
- Existing database.db retained (4 incidents and 5 legacy user records at packaging time).
- Accounts are stored in a separate accounts table in the same database.db.
- No GitHub push has been performed.
