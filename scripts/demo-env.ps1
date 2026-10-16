# Dot-source this file in each PowerShell terminal used for the local demo.
$env:APP_ENV = 'development'
$env:DATABASE_URL = 'sqlite:///./backend/cyberrange.db'
$env:LAB_ROOT = 'labs'
$env:FRONTEND_ORIGIN = 'http://localhost:5173'
$env:SECURE_COOKIES = 'false'
