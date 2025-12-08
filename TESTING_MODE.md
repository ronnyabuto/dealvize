# Testing Mode Implementation Guide

## 🎯 Quick Setup

1. **Add environment variable:**
```bash
ENABLE_FREE_TESTING=true
NEXT_PUBLIC_ENABLE_FREE_TESTING=true
```

2. **Import and use in components:**
```typescript
import { featureFlags, hasFullAccess, requiresPayment } from '@/lib/config/feature-flags'
import { getEffectivePlan, isFeatureEnabled } from '@/lib/auth/testing-overrides'
import { PaymentWrapper } from '@/components/testing/payment-wrapper'
```

## 🔧 Common Usage Patterns

### In Components (Replace payment gates):
```typescript
// Before: Hard payment gate
if (user.plan !== 'pro') return <UpgradeRequired />

// After: Testing-aware gate  
if (!hasFullAccess(user.plan)) return <UpgradeRequired />
```

### In API Routes (Bypass limits):
```typescript
import { getEffectiveUsageLimits } from '@/lib/auth/testing-overrides'

const limits = getEffectiveUsageLimits(user.subscription?.limits)
if (currentUsage > limits.deals) {
  return NextResponse.json({ error: 'Limit reached' }, { status: 403 })
}
```

### Wrap Payment Components:
```typescript
<PaymentWrapper>
  <StripeCheckout />
</PaymentWrapper>
```

### Feature Flags:
```typescript
// Check if premium feature should be available
const canUseAdvancedAnalytics = isFeatureEnabled('advanced-analytics', user.plan)
```

## 🚀 Production Deployment

**To disable testing mode:**
```bash
ENABLE_FREE_TESTING=false
NEXT_PUBLIC_ENABLE_FREE_TESTING=false
```

All restrictions will be automatically enforced again.

## ✅ Benefits

- ✅ **Zero code deletion** - Nothing permanently removed
- ✅ **Environment-driven** - Easy production toggle  
- ✅ **Future-proof** - Works with any payment system
- ✅ **Clean rollback** - One environment variable change
- ✅ **Testing visibility** - Clear testing badges shown to users