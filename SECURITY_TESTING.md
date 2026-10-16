# Security Testing Guide

How to test security features in your application.

## 🧪 Test Environments

### Local Testing
```bash
npm run dev
# Runs on http://localhost:3000
# Logger outputs to console
```

### Production Testing
Use staging environment before deploying to production.

---

## 1️⃣ Authentication Testing

### Test Missing Token
```bash
curl -X POST http://localhost:3000/api/orders/update-status \
  -H "Content-Type: application/json" \
  -d '{"order_id": "123", "status": "shipped"}'

# Expected: 401 Unauthorized
# Response: {"error":"Unauthorized"}
```

### Test Invalid Token
```bash
curl -X POST http://localhost:3000/api/orders/update-status \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "123", "status": "shipped"}'

# Expected: 401 Unauthorized
```

### Test Valid Token (Get from App)
1. Sign in to your app
2. Open DevTools → Application → Cookies
3. Copy the auth session cookie/token
4. Use in curl:
```bash
curl -X POST http://localhost:3000/api/orders/update-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "123", "status": "shipped"}'

# Expected: 200 OK or 404 if order doesn't exist
```

---

## 2️⃣ RBAC (Role) Testing

### Setup Test Users
1. Create 3 test accounts:
   - Admin account (set role to 'admin' in database)
   - Seller account (role='seller')
   - Customer account (role='customer')

### Test Admin-Only Endpoint
```bash
# As customer - should fail
TOKEN_CUSTOMER=your_customer_token
curl -X POST http://localhost:3000/api/returns/approve \
  -H "Authorization: Bearer $TOKEN_CUSTOMER" \
  -H "Content-Type: application/json" \
  -d '{"id": "return-123", "status": "approved"}'

# Expected: 403 Forbidden
# Response: {"error":"Forbidden: insufficient permissions"}

# As admin - should succeed
TOKEN_ADMIN=your_admin_token
curl -X POST http://localhost:3000/api/returns/approve \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"id": "return-123", "status": "approved"}'

# Expected: 200 OK or 404 if return doesn't exist
```

### Test Seller-Only Resources
```bash
# Customer trying to approve seller's return
TOKEN_CUSTOMER=your_customer_token
curl -X POST http://localhost:3000/api/returns/approve \
  -H "Authorization: Bearer $TOKEN_CUSTOMER" \
  -H "Content-Type: application/json" \
  -d '{"id": "return-123", "status": "approved"}'

# Expected: 403 Forbidden
```

### Test Multi-Role Endpoint
```bash
# This endpoint allows customer, seller, or admin
# Test each role works:

for ROLE in customer seller admin; do
  TOKEN=$(echo "get_${ROLE}_token")
  curl -X POST http://localhost:3000/api/orders/update-status \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"order_id": "123", "status": "shipped"}'
done

# Expected: 200 OK or 404 for all
```

---

## 3️⃣ Validation Testing

### Test Required Field Missing
```bash
curl -X POST http://localhost:3000/api/orders/update-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "shipped"}'  # Missing order_id

# Expected: 400 Bad Request
# Response: {
#   "error": "Validation failed",
#   "details": [
#     {"field": "order_id", "message": "Required"}
#   ]
# }
```

### Test Invalid Email Format
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "not-an-email",
    "password": "password123",
    "userType": "customer"
  }'

# Expected: 400 Bad Request
# Response: {
#   "error": "Validation failed",
#   "details": [
#     {"field": "email", "message": "Invalid email address"}
#   ]
# }
```

### Test Invalid Enum Value
```bash
curl -X POST http://localhost:3000/api/orders/update-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "123",
    "status": "invalid-status"
  }'

# Expected: 400 Bad Request
# Details show valid options: pending, processing, shipped, delivered, cancelled
```

### Test Number Constraints
```bash
# Price must be positive
curl -X POST http://localhost:3000/api/products/create \
  -H "Authorization: Bearer YOUR_SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product",
    "price": -100,  # Invalid: negative
    "category_id": "cat-123"
  }'

# Expected: 400 Bad Request
# Message: "Price must be positive"
```

---

## 4️⃣ Rate Limiting Testing

### Test Rate Limit Exceeded
```bash
# Make 11 rapid auth requests (limit is 10 per minute)
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "pass123"}'
  echo "Request $i"
done

# First 10: Normal responses
# 11th+: 429 Too Many Requests
# Response: {
#   "error": "Too many requests",
#   "retryAfter": 45
# }
```

### Check Rate Limit Headers
```bash
curl -v -X POST http://localhost:3000/api/orders/list \
  -H "Authorization: Bearer YOUR_TOKEN"

# Look for response headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 1705316445
```

### Test Different Rate Limit Categories
```bash
# Auth limit: 10 per minute
for i in {1..15}; do
  curl -s http://localhost:3000/api/auth/login > /dev/null
done

# Orders limit: 50 per hour
for i in {1..60}; do
  curl -s http://localhost:3000/api/orders/list > /dev/null
done

# Products limit: 100 per minute
for i in {1..110}; do
  curl -s http://localhost:3000/api/products/list > /dev/null
done
```

---

## 5️⃣ Logging Testing

### Check Logs in Development
```bash
# Terminal where npm run dev is running should show:
[2024-01-15T10:30:45.123Z] [INFO] User login {"action":"auth_login","userId":"user-123","email":"user@example.com","success":true}
```

### Test Suspicious Activity Logging
```bash
# Attempt to access resource you don't own
curl -X GET http://localhost:3000/api/orders/someone-elses-order \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should log warning:
[timestamp] [WARN] Forbidden access attempt {"userId":"your-id","requiredRole":"customer","userRole":"customer"}
```

### Test Error Logging
```bash
# Send malformed request
curl -X POST http://localhost:3000/api/orders/update-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d 'not valid json'

# Should log error:
[timestamp] [ERROR] Error updating order {"error":"..."}
```

---

## 🔐 Security Audit Checklist

### Run These Tests Before Deployment

#### Authentication
- [ ] Unauthenticated request returns 401
- [ ] Invalid token returns 401  
- [ ] Valid token allows access
- [ ] Token expired returns 401

#### RBAC
- [ ] Customer cannot access admin endpoints
- [ ] Seller cannot approve other seller's returns
- [ ] Customer cannot see other customer's orders
- [ ] Admin can access all endpoints

#### Validation
- [ ] Missing required fields return 400
- [ ] Invalid email format rejected
- [ ] Invalid enum values rejected
- [ ] Negative numbers rejected where needed
- [ ] Array with 0 items rejected where needed

#### Rate Limiting
- [ ] First N requests succeed
- [ ] Request N+1 returns 429
- [ ] Response includes Retry-After header
- [ ] Limit resets after window expires

#### Logging
- [ ] Auth actions logged
- [ ] Order changes logged
- [ ] API access logged
- [ ] Errors logged
- [ ] No sensitive data in logs

#### Environment Security
- [ ] No .env.local in git
- [ ] .env.local in .gitignore
- [ ] SUPABASE_SERVICE_ROLE_KEY not hardcoded
- [ ] Only use NEXT_PUBLIC_ for client vars
- [ ] Server env vars loaded from lib/env.server.ts

---

## 📊 Test Coverage Template

Create `test-results.md`:
```markdown
# Security Test Results

## Date: 2024-01-15
## Tester: Your Name

### Authentication
- [ ] Missing token: PASS/FAIL
- [ ] Invalid token: PASS/FAIL
- [ ] Valid token: PASS/FAIL

### RBAC
- [ ] Admin access: PASS/FAIL
- [ ] Seller access: PASS/FAIL
- [ ] Customer access: PASS/FAIL
- [ ] Cross-user access blocked: PASS/FAIL

### Validation
- [ ] Required fields: PASS/FAIL
- [ ] Email format: PASS/FAIL
- [ ] Number constraints: PASS/FAIL
- [ ] Enum values: PASS/FAIL

### Rate Limiting
- [ ] Normal requests: PASS/FAIL
- [ ] Exceeded limit: PASS/FAIL
- [ ] Headers correct: PASS/FAIL
- [ ] Retry-After: PASS/FAIL

### Logging
- [ ] Auth logged: PASS/FAIL
- [ ] Actions logged: PASS/FAIL
- [ ] Errors logged: PASS/FAIL
- [ ] No sensitive data: PASS/FAIL

### Issues Found
- Issue 1: Description
- Issue 2: Description

### Recommendations
- Recommendation 1
- Recommendation 2
```

---

## 🚀 Automated Testing (Optional)

### Using Jest + Supertest
```bash
pnpm add -D jest @types/jest supertest
```

### Example Test File
```typescript
// __tests__/api/orders.test.ts
import { createMocks } from 'node-mocks-http'
import handler from '@/app/api/orders/update-status/route'

describe('/api/orders/update-status', () => {
  it('returns 401 without auth', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { order_id: '123', status: 'shipped' }
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(401)
  })

  it('validates input', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: { status: 'shipped' } // Missing order_id
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  it('enforces RBAC', async () => {
    // Test with customer token
    // Expect 403 or success based on endpoint
  })
})
```

---

## 📋 Security Test Scenarios

### Scenario 1: Malicious User
1. User tries to access other user's order
2. User attempts 20 rapid API calls (rate limit)
3. User sends SQL injection in form input
4. User tries to access admin panel

**Expected**: All blocked, all logged

### Scenario 2: Data Breach
1. Hacker obtains auth token
2. Hacker tries to delete data
3. Hacker tries to export all users
4. System logs all attempts

**Expected**: RBAC blocks, actions logged, admin notified

### Scenario 3: API Abuse
1. Bot makes 1000 requests per second
2. Bot tries invalid tokens repeatedly
3. Bot sends malformed JSON

**Expected**: Rate limited, logged, IP can be blocked

---

## 📞 If Tests Fail

### Debug Logging
1. Check terminal where `npm run dev` runs
2. Look for error messages in logs
3. Check browser console for client errors
4. Use curl with `-v` flag for headers

### Common Issues
- **401 Unauthorized**: Token missing or expired
- **403 Forbidden**: Role not allowed for this action
- **400 Bad Request**: Validation failed - check response details
- **429 Too Many Requests**: Rate limit exceeded - wait and retry
- **500 Internal Error**: Server error - check logs

### Get More Info
```bash
# Run with verbose output
curl -v -X POST http://localhost:3000/api/endpoint ...

# Check network tab in DevTools
# Check Application tab for cookies/storage
# Check Console for errors
```

---

**Remember**: Security is everyone's responsibility. Test thoroughly before deployment! 🔒
