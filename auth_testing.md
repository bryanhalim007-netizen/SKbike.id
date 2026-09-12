# Auth Testing Playbook

## Admin credentials
- Email: bryan.halim007@gmail.com
- Password: velox2026

## API Testing
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"bryan.halim007@gmail.com","password":"velox2026"}'
curl -b cookies.txt http://localhost:8001/api/auth/me
```
Login returns the user object + Bearer token and sets access_token/refresh_token cookies.
The /me call returns the same user using those cookies or Authorization: Bearer <token>.
