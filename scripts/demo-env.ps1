# Dot-source this file in each PowerShell terminal used for the local demo.
$env:APP_ENV = 'development'
$env:DATABASE_URL = 'sqlite:///./backend/cyberrange.db'
$env:LAB_ROOT = 'labs'
$env:LAB_VM_DISTRO = 'Ubuntu'
$env:FRONTEND_ORIGIN = 'http://localhost:5173'
$env:SECURE_COOKIES = 'false'
$env:SMTP_HOST = 'console'
