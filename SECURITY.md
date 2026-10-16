# Security Implementation Guide

This document outlines all security measures implemented in the e-commerce platform.

## 1. Role-Based Access Control (RBAC)

### Roles Defined
- **Admin**: Full access to all resources, user management, and system configuration
- **Seller**: Can manage own products, view own orders, handle returns for sold items
- **Customer**: Can browse products, place orders, view own order history, request returns

### Implementation

#### Permission Helpers (`lib/auth/permissions.ts`)

```typescript
// Check if user has required role
const authCheck = await requireAnyRole(request, ['customer', 'admin'])
if (authCheck.error) {
  return authCheck.response
}
const user = authCheck.user
```

#### Resource Ownership Checks
- `sellerOwnsProduct(sellerId, productId)` - Verify seller owns product
- `sellerOwnsOrder(sellerId, orderId)` - Verify seller has items in order
- `userOwnsResource(userId, resourceOwnerId)` - General ownership check

### Protected Endpoints

All API routes in `/app/api/` now enforce RBAC:
- ✅ `/api/returns/create` - Customers & Admins only
- ✅ `/api/orders/update-status` - Customers, Sellers & Admins
- ✅ `/api/returns/approve` - Sellers & Admins
- ✅ `/api/returns/reject` - Sellers & Admins
- ✅ `/api/notifications/*` - Role-aware access

### Client-Side Role Enforcement
Always check user role before showing sensitive UI:

```typescript
if (user?.role === 'admin') {
  // Show admin panel
}

if (user?.role === 'seller') {
  // Show seller dashboard
}

if (user?.role === 'customer') {
  // Show customer features
}
```

---

## 2. Input Validation with Zod

### Schema Files
- `lib/schemas/auth.ts` - Authentication inputs
- `lib/schemas/products.ts` - Product CRUD operations
- `lib/schemas/orders.ts` - Orders and returns

### Usage in API Routes

```typescript
import { validateRequest } from '@/lib/schemas/validate'
import { CreateOrderSchema } from '@/lib/schemas/orders'

const validation = await validateRequest(request, CreateOrderSchema)
if (!validation.success) {
  return validation.response // Returns 400 with detailed errors
}

const { items, total_amount, payment_method } = validation.data
```

### Validation Error Response
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

### Adding New Validations
1. Define schema in appropriate `lib/schemas/*.ts` file
2. Use `validateRequest()` in API route
3. Type-safe access to validated data

---

## 3. Structured Logging System

### Logger (`lib/logger.ts`)

#### Basic Logging
```typescript
import { logger } from '@/lib/logger'

logger.info('Operation successful', { userId, action: 'login' })
logger.warn('Suspicious activity detected', { ip, attempt: 5 })
logger.error('Payment processing failed', { error: error.message })
```

#### Domain-Specific Loggers
```typescript
// Authentication
logger.logAuth('login', userId, email, true)
logger.logAuth('signup', userId, email, false)

// Orders
logger.logOrder('created', orderId, { userId, amount: 100 })
logger.logOrder('updated', orderId, { newStatus: 'shipped' })

// Payments
logger.logPayment('completed', orderId, { userId, amount: 100 })
logger.logPayment('failed', orderId, { error: 'Card declined' })

// Returns
logger.logReturn('requested', returnId, { userId, orderId })
logger.logReturn('approved', returnId, { sellerId })

// Products
logger.logProductAction('created', productId, { userId, sellerId })
```

#### API Access Logging
```typescript
logger.logApiAccess('POST', '/api/orders/create', 201, {
  userId: 'user-123',
  orderId: 'order-456'
})
```

### Log Output (Development)
```
[2024-01-15T10:30:45.123Z] [INFO] User login {"action":"auth_login","userId":"user-123","email":"user@example.com","success":true}
[2024-01-15T10:31:12.456Z] [WARN] Rate limit exceeded {"key":"auth:192.168.1.1","count":11,"limit":10}
[2024-01-15T10:32:00.789Z] [ERROR] Payment failed {"error":"Card declined","orderId":"order-123"}
```

### Production Integration
In production, extend logger to send to services:
- Sentry for error tracking
- DataDog for analytics
- CloudWatch for monitoring
- ELK Stack for log aggregation

---

## 4. Rate Limiting

### Rate Limiter (`lib/rate-limit.ts`)

#### Default Limits
- **Auth**: 10 requests per minute
- **API**: 100 requests per minute
- **Orders**: 50 requests per hour
- **Products**: 100 requests per minute

#### Usage in API Routes
```typescript
import { rateLimiter } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const { allowed } = await rateLimiter.checkLimit(request, 'api')
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  // Process request
}
```

#### Response Headers
Rate limit information is included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1705316445
Retry-After: 60
```

#### Customizing Limits
```typescript
rateLimiter.setConfig('custom', {
  maxRequests: 20,
  windowMs: 60 * 1000 // 1 minute
})
```

#### IP Detection
Rate limiter identifies clients by:
1. `x-forwarded-for` header (behind proxy)
2. `x-real-ip` header (alternate proxy)
3. `unknown` (fallback)

---

## 5. Environment Variable Security

### Server-Only Variables (`lib/env.server.ts`)

#### Critical Variables (Server-Only)
```typescript
import { getSupabaseServiceRoleKey } from '@/lib/env.server'

// Only works on server - throws error on client
const key = getSupabaseServiceRoleKey()
```

#### Preventing Client Exposure
```typescript
// ❌ WRONG - Exposes secrets
export async function getSecretOnClient() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY
}

// ✅ CORRECT - Server-only
import { getSupabaseServiceRoleKey } from '@/lib/env.server'
export async function getSecretOnServer() {
  return getSupabaseServiceRoleKey()
}
```

### Environment Setup

#### 1. Create `.env.local` (Local Development)
```bash
cp .env.example .env.local
# Fill in your Supabase credentials
```

#### 2. Add to `.env.example` (Version Control Safe)
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

#### 3. Add to `.gitignore` (Never Commit Secrets)
```
.env.local
.env*.local
```

#### 4. Vercel Deployment
Add environment variables in Vercel dashboard:
- Settings → Environment Variables
- Add `SUPABASE_SERVICE_ROLE_KEY` (protected)
- Public keys can use `NEXT_PUBLIC_` prefix

### Variable Classification
| Variable | Type | Exposure |
|----------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL | Client OK |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Key | Client OK |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Server Only ⚠️ |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | URL | Client OK |

---

## Security Checklist

### Before Deployment
- [ ] All sensitive keys in `.env.local` (never committed)
- [ ] `.env.example` has placeholder values only
- [ ] `.env.local` added to `.gitignore`
- [ ] No hardcoded secrets in source code
- [ ] All API routes validate input with Zod
- [ ] All API routes check authentication
- [ ] All API routes enforce RBAC
- [ ] Rate limiting enabled on public endpoints
- [ ] Logging configured for production
- [ ] Error messages don't leak sensitive info

### Ongoing Maintenance
- [ ] Review logs regularly for suspicious activity
- [ ] Monitor rate limit violations
- [ ] Audit API access patterns
- [ ] Update validation schemas as needed
- [ ] Review role assignments quarterly
- [ ] Keep Supabase policies aligned with RBAC

---

## Incident Response

### If Credentials Leak
1. **Immediately**: Rotate Supabase service key
2. **Within 1 hour**: Revoke all active sessions
3. **Within 24 hours**: Audit access logs
4. **Follow up**: Update deployment variables

### If Unauthorized Access Detected
1. Review logs for affected resources
2. Check user data integrity
3. Notify affected users if needed
4. Update RBAC rules if needed

---

## Testing Security

### Test RBAC
```bash
# Should fail - customer accessing seller endpoint
curl -H "Authorization: Bearer customer-token" \
  -X POST /api/returns/approve

# Should succeed - seller accessing own resource
curl -H "Authorization: Bearer seller-token" \
  -X POST /api/returns/approve
```

### Test Validation
```bash
# Should return 400 with validation errors
curl -X POST /api/orders/create \
  -H "Content-Type: application/json" \
  -d '{"items": []}'
```

### Test Rate Limiting
```bash
# Make 11 rapid requests to /api/auth/login
# 11th should return 429
for i in {1..15}; do
  curl -X POST /api/auth/login
done
```

---

## Resources

- [Zod Documentation](https://zod.dev)
- [Supabase Auth Security](https://supabase.com/docs/guides/auth)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/nodejs-security/)
