# Auth Testing Playbook

## Admin credentials
- Email: bryan.halim007@gmail.com
- Password: velox2026
- Extra admin: skbike.id@store.com / bryanhalimm21

## API Testing
```
# Login (sets access_token + refresh_token cookies, returns Bearer token)
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"bryan.halim007@gmail.com","password":"velox2026"}'

# Current user (via cookies or Authorization: Bearer <token>)
curl -b cookies.txt http://localhost:8001/api/auth/me

# Refresh access token (uses refresh_token cookie)
curl -b cookies.txt -X POST http://localhost:8001/api/auth/refresh

# Logout (clears cookies)
curl -b cookies.txt -X POST http://localhost:8001/api/auth/logout
```

## Brute force
- 5 failed logins for the same (ip:email) => HTTP 429 lockout for 15 minutes.
- Successful login clears the failed-attempt counter.

## Notes
- Login returns the user object + Bearer token and sets access_token/refresh_token cookies.
- /me returns the same user using those cookies or Authorization: Bearer <token>.
- Access token: 60 min. Refresh token: 7 days. Frontend auto-refreshes on 401.
