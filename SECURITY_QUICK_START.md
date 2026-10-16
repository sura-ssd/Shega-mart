# Security Quick Start Guide

Fast reference for implementing security in new API routes.

## 🚀 5-Minute Setup

### 1. Copy the Template
```typescript
// Use lib/api-route-template.ts as your starting point
import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/schemas/validate'
import { getAuthUser, requireAnyRole } from '@/lib/auth/permissions'
import { logger } from '@/lib/logger'
import { rateLimiter } from '@/lib/rate-limit'
```

### 2. Define Your Schema
```typescript
// Add to lib/schemas/your-domain.ts
import { z } from 'zod'

export const YourActionSchema = z.object({
  field1: z.string().min(1),
  field2: z.number().positive(),
})

export type YourActionInput = z.infer<typeof YourActionSchema>
```

### 3. Implement Full Security Stack
```typescript
export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const { allowed } = await rateLimiter.checkLimit(request, 'api')
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Authenticate
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RBAC
    const authCheck = await requireAnyRole(request, ['customer', 'seller'])
    if (authCheck.error) return authCheck.response

    // Validate
    const validation = await validateRequest(request, YourActionSchema)
    if (!validation.success) return validation.response

    const { field1, field2 } = validation.data

    // Your business logic here
    const result = { field1, field2 }

    // Log action
    logger.info('your-action completed', {
      userId: user.id,
      userRole: user.role,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Error in your-action', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## ✅ Security Checklist

### Every API Route Must Have
- [ ] Rate limiting (`rateLimiter.checkLimit()`)
- [ ] Authentication (`getAuthUser()`)
- [ ] RBAC enforcement (`requireAnyRole()`)
- [ ] Input validation (`validateRequest()`)
- [ ] Structured logging (`logger.*()`)
- [ ] Generic error response (no stack traces)
- [ ] Proper HTTP status codes

### Code Quality
- [ ] No `console.log()` → use `logger` instead
- [ ] No hardcoded secrets
- [ ] No sensitive data in logs
- [ ] Type-safe with TypeScript
- [ ] Handles errors gracefully

---

## 🔍 Common Patterns

### Admin-Only Endpoint
```typescript
const authCheck = await requireAnyRole(request, ['admin'])
if (authCheck.error) return authCheck.response
```

### Customer Own Resource
```typescript
const authCheck = await requireAnyRole(request, ['customer', 'admin'])
if (authCheck.error) return authCheck.response

// Check ownership
if (user.role === 'customer' && resource.owner_id !== user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### Seller Product Ownership
```typescript
const owns = await sellerOwnsProduct(user.id, productId)
if (!owns && user.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### Optional RBAC
```typescript
// Allow multiple roles with optional role-specific logic
const authCheck = await requireAnyRole(request, ['customer', 'seller', 'admin'])
if (authCheck.error) return authCheck.response

if (user.role === 'seller') {
  // Seller-specific logic
} else if (user.role === 'customer') {
  // Customer-specific logic
}
```

---

## 🎯 Rate Limit Categories

```typescript
// Use appropriate category for endpoint type
rateLimiter.checkLimit(request, 'auth')      // 10 req/min - login, signup
rateLimiter.checkLimit(request, 'api')       // 100 req/min - general
rateLimiter.checkLimit(request, 'orders')    // 50 req/hr - payments
rateLimiter.checkLimit(request, 'products')  // 100 req/min - browsing
```

---

## 📝 Logging Examples

### Authentication
```typescript
logger.logAuth('login', userId, email, true)  // success
logger.logAuth('signup', userId, email, false) // failure
```

### Orders
```typescript
logger.logOrder('created', orderId, { userId, amount: 100 })
logger.logOrder('updated', orderId, { newStatus: 'shipped' })
```

### Returns
```typescript
logger.logReturn('requested', returnId, { userId, orderId })
logger.logReturn('approved', returnId, { sellerId })
```

### Generic
```typescript
logger.info('operation completed', { userId, action, resource })
logger.warn('suspicious activity', { userId, attempt: count })
logger.error('payment failed', { orderId, error: message })
```

---

## 🚫 Common Mistakes to Avoid

### ❌ Wrong: Manual auth check
```typescript
const { user } = await supabase.auth.getUser()
if (!user) return error
```
### ✅ Right: Use permission helpers
```typescript
const user = await getAuthUser(request)
const authCheck = await requireAnyRole(request, ['customer'])
```

---

### ❌ Wrong: No validation
```typescript
const { id, status } = await request.json()
```
### ✅ Right: Zod validation
```typescript
const validation = await validateRequest(request, UpdateStatusSchema)
if (!validation.success) return validation.response
const { id, status } = validation.data
```

---

### ❌ Wrong: Logging with console
```typescript
console.log('[v0] User action:', userId)
console.error('Error:', error)
```
### ✅ Right: Use structured logger
```typescript
logger.info('user action', { userId, action })
logger.error('error occurred', { error: error.message })
```

---

### ❌ Wrong: Exposing errors to client
```typescript
catch (error) {
  return NextResponse.json(
    { error: error.message, stack: error.stack },
    { status: 500 }
  )
}
```
### ✅ Right: Generic error message
```typescript
catch (error) {
  logger.error('operation failed', { error: String(error) })
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

---

### ❌ Wrong: No rate limiting
```typescript
export async function POST(request: NextRequest) {
  // Process immediately
}
```
### ✅ Right: Rate limit first
```typescript
export async function POST(request: NextRequest) {
  const { allowed } = await rateLimiter.checkLimit(request, 'api')
  if (!allowed) {
    return NextResponse.json({...}, { status: 429 })
  }
  // Process
}
```

---

## 📚 File Reference

| File | Purpose |
|------|---------|
| `lib/schemas/auth.ts` | Login, signup, profile schemas |
| `lib/schemas/products.ts` | Product CRUD schemas |
| `lib/schemas/orders.ts` | Order, return schemas |
| `lib/auth/permissions.ts` | RBAC & ownership checks |
| `lib/logger.ts` | Structured logging |
| `lib/rate-limit.ts` | Rate limiting system |
| `lib/env.server.ts` | Server-only env vars |
| `.env.example` | Env template |
| `SECURITY.md` | Detailed guide |
| `lib/api-route-template.ts` | Copy-paste template |

---

## 🔗 Copy-Paste Commands

### Create new schema file
```bash
touch lib/schemas/your-domain.ts
```

### Check existing schemas
```bash
ls lib/schemas/
# Output: auth.ts  orders.ts  products.ts  validate.ts
```

### Test an endpoint
```bash
curl -X POST http://localhost:3000/api/your-endpoint \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field1": "value"}'
```

---

## 💡 Pro Tips

1. **Always use validation** - Even if you "know" the data format
2. **Log important actions** - Helps with debugging and audits
3. **Test error cases** - What happens with invalid input?
4. **Check ownership** - Prevent users from accessing others' data
5. **Monitor rate limits** - Watch for abuse patterns

---

## 🆘 Need Help?

1. **Can't remember RBAC?** → Check `lib/auth/permissions.ts`
2. **Don't know what to log?** → See `lib/logger.ts` examples
3. **Need validation pattern?** → Look at `lib/schemas/validate.ts`
4. **Want a template?** → Copy from `lib/api-route-template.ts`
5. **Full details?** → Read `SECURITY.md`

---

**Remember**: Security is not optional. Every API route needs all 5 layers:
1. Rate Limit ⏱️
2. Authenticate 🔐
3. RBAC 👥
4. Validate ✓
5. Log 📝

Make it a habit! 🚀
