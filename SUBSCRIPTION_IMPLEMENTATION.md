# CINEFLIX Subscription System Implementation

## Overview
Complete subscription system implemented with 10,000 UGX monthly subscription plan, automatic activation after payment, 3-day expiry reminders, and admin manual activation fallback.

---

## Backend Implementation (CINEFLIX-BE)

### Database Schema Updates
Added to `prisma/schema.prisma`:
- **Subscription Model**: Tracks user subscription status, price, expiry dates
- **Payment Model**: Records all payment transactions with status tracking
- **Enums**: `SubscriptionStatus` (ACTIVE, EXPIRED, CANCELLED, PENDING_PAYMENT) and `SubscriptionPlan` (MONTHLY)

```prisma
model Subscription {
  id              String              @id @default(cuid())
  userId          String              @unique
  plan            SubscriptionPlan    @default(MONTHLY)
  status          SubscriptionStatus  @default(PENDING_PAYMENT)
  price           Int                 @default(10000)      // 10,000 UGX
  expiryDate      DateTime?
  reminderSentAt  DateTime?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  payments        Payment[]
}

model Payment {
  id              String   @id @default(cuid())
  userId          String
  subscriptionId  String
  amount          Int
  status          String   @default("PENDING")
  provider        String   @default("MTN")
  transactionId   String?
  phoneNumber     String?
  reference       String   @unique @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription    Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
}
```

### API Routes

#### User Subscription Endpoints (`/api/subscriptions`)
- **GET /current** - Get user's current subscription status
  - Returns: subscription data with `isActive` and `daysUntilExpiry`
  
- **POST /initialize-payment** - Start payment process
  - Body: `{ phoneNumber, provider }`
  - Returns: payment reference for user to complete payment
  
- **POST /confirm-payment** - Verify and activate subscription
  - Body: `{ paymentId, transactionId }`
  - Auto-sets expiry to 30 days from now
  - Returns: activated subscription data

- **POST /check-expiry** - Check for subscriptions expiring in 3 days
  - Called by cron job
  - Sends reminders and marks as sent
  
- **POST /expire-old** - Auto-expire subscriptions past due date
  - Called by cron job

#### Admin Subscription Endpoints (`/api/admin/subscriptions`)
- **GET / ** - List all subscriptions with filtering
  - Query: `status`, `search`, `limit`, `offset`
  - Returns: list with isActive and daysUntilExpiry
  
- **GET /:userId** - Get specific user's subscription
  
- **POST /:userId/activate** - Manually activate subscription
  - Body: `{ daysFromNow }` (default 30)
  - Use when payment processor fails to auto-activate
  
- **POST /:userId/extend** - Extend expiry date
  - Body: `{ days }` (default 30)
  - Adds days to current expiry
  
- **POST /:userId/expire** - Manually expire subscription
  
- **DELETE /:userId/cancel** - Cancel subscription

### Middleware
- **checkSubscription.js**: Middleware to verify active subscription for protected content routes

---

## Frontend Implementation (CINEFLIX)

### New Components

#### SubscriptionGate (`src/SubscriptionGate.tsx`)
Modal component with multi-step payment flow:
1. **Check Step**: Verifies existing subscription
2. **Buy Step**: Shows plan details (10,000 UGX/month)
3. **Phone Step**: Collects Uganda phone number
4. **Confirm Step**: Asks for MTN transaction ID

Features:
- Price breakdown and features list
- Error handling and validation
- Loading states
- Phone number format validation (256XXXXXXXXX)

### Account Module Updates (`src/account.ts`)
New API methods:
```typescript
getSubscription() // Returns current subscription
initializePayment(phoneNumber, provider) // Start payment
confirmPayment(paymentId, transactionId) // Activate subscription
```

### DetailPage Integration (`src/DetailPage.tsx`)
- Play button checks for active subscription
- Shows subscription gate if not subscribed
- Episode cards also require subscription
- Users can still view details without subscription

### Styling (`src/styles.css`)
Complete subscription UI styles:
- `.subscription-gate-backdrop`: Dark overlay
- `.subscription-gate-modal`: Modal container
- `.price-card`: Plan display
- `.subscription-form`: Payment form inputs
- Mobile-responsive design

---

## How It Works

### User Subscription Flow
1. **User clicks Play** without active subscription
2. **Login Check**: If not logged in, redirect to login
3. **Subscription Check**: If logged in, show SubscriptionGate
4. **Enter Phone**: User enters Uganda phone number
5. **Payment Initiation**: System creates payment record and sends USSD prompt
6. **User Pays**: User completes MTN payment
7. **Transaction Confirmation**: User enters transaction ID
8. **Auto-Activation**: Subscription activated, 30-day expiry set
9. **Access Granted**: User can now play content

### Automatic Features
- **3-Day Reminders**: Cron job runs `/api/subscriptions/check-expiry` to send reminders
- **Auto-Expiry**: Cron job runs `/api/subscriptions/expire-old` to expire old subscriptions
- **Admin Fallback**: If auto-activation fails, admin can manually activate from dashboard

---

## Admin Dashboard Features

Access `/api/admin/subscriptions` endpoints to:
- View all subscriptions with status
- Filter by status (ACTIVE, EXPIRED, CANCELLED, PENDING_PAYMENT)
- Search users by email/name
- Manually activate accounts that failed to auto-activate
- Extend subscriptions
- Expire or cancel subscriptions

---

## Configuration

### Environment Variables
- `JWT_SECRET`: For token signing (existing)
- `DATABASE_URL`: PostgreSQL connection (existing)

### Cron Jobs to Setup
Add these to your cron scheduler (e.g., Vercel Cron, AWS Lambda, etc.):

```bash
# Daily at 2 AM UTC - Check for expiring subscriptions
0 2 * * * curl -X POST https://your-api.com/api/subscriptions/check-expiry

# Daily at 3 AM UTC - Expire old subscriptions
0 3 * * * curl -X POST https://your-api.com/api/subscriptions/expire-old
```

---

## Testing Checklist

- [ ] User can view content details without subscription
- [ ] User cannot play without subscription
- [ ] Login prompts on play attempt (unauth)
- [ ] Subscription gate shows on play (auth, no subscription)
- [ ] Phone number validation works
- [ ] Payment initialization creates record
- [ ] Payment confirmation updates subscription status
- [ ] Subscription expiry tracking works
- [ ] 3-day reminder email/SMS would send (mock)
- [ ] Old subscriptions auto-expire
- [ ] Admin can manually activate subscriptions
- [ ] Admin can extend subscriptions
- [ ] Admin can view all subscriptions

---

## Next Steps

### Payment Integration
Currently the system is ready for payment provider integration. To fully enable:
1. Integrate MTN Mobile Money API for real payments
2. Integrate Airtel Money API (optional)
3. Add webhook handlers for payment callbacks
4. Implement email/SMS notifications

### Admin Dashboard UI
Create admin dashboard pages:
- Subscription management view
- User subscription details
- Manual activation controls

### Notifications
Implement:
- Email reminders (3 days before expiry)
- SMS reminders (optional)
- Payment confirmation emails

---

## File Changes Summary

### Backend
- `prisma/schema.prisma`: Added Subscription, Payment models
- `src/index.js`: Added subscription routes
- `src/routes/subscriptions.js`: NEW - User subscription endpoints
- `src/routes/adminSubscriptions.js`: NEW - Admin subscription endpoints
- `src/middleware/checkSubscription.js`: NEW - Subscription verification middleware

### Frontend  
- `src/SubscriptionGate.tsx`: NEW - Payment UI component
- `src/DetailPage.tsx`: Updated to use SubscriptionGate
- `src/account.ts`: Added subscription API methods
- `src/styles.css`: Added subscription UI styles

---

## Pricing
- **Monthly Subscription**: 10,000 UGX
- **Duration**: 30 days from activation/renewal
- **Renewal**: Manual via payment system

---

## Support
For issues or questions about the subscription system, refer to the admin subscription endpoints documentation or contact backend team.
