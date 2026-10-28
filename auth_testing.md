# Auth testing
- Login: POST /api/auth/login {email,password} -> sets httpOnly cookies access_token/refresh_token, returns user with access_state (active|expired|blocked)
- GET /api/auth/me with cookies
- Blocked/expired users: can log in but every /api/projects call returns 403 {detail:{code}}; frontend redirects to /acesso-expirado
- Admin-only: /api/admin/* (403 for clients)
- No public signup
- Credentials in /app/memory/test_credentials.md
