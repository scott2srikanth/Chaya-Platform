# Onboard Doc - Interactive Video Platform

A production-ready SaaS web application for creating and experiencing interactive video content with AI-powered hotspots, subscription-based monetization, and comprehensive platform management.

## Features

### Subscription Plans

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0/month | Upload up to 2 videos, Basic hotspot editor, Video player, Community support |
| **Pro** | $10/month | Unlimited uploads, Advanced editor, AI hotspots, PNG images, Priority support |

### Admin Module
- Video upload and management with plan-based limits
- Direct file upload from PC (MP4, MOV, WEBM • Max 200MB)
- Alternative URL-based video input
- Automatic storage in Supabase Storage
- Interactive hotspot editor with draw/resize capabilities
- AI-powered hotspot generation from transcripts
- Timeline visualization
- Real-time preview
- Draft and publish workflow
- Subscription and billing management

### Super Admin Module
- User management (view all users, change roles)
- Subscription oversight (view all plans and statuses)
- Payment transactions (complete audit trail)
- Platform analytics and metrics
- Role-based access control

### Client Module
- Browse published videos
- Watch videos with interactive hotspots
- Multiple hotspot actions:
  - Popup information
  - Jump to timestamp
  - External URLs
  - Pause video
- Responsive video player
- Subscription upgrade prompts

### Core Features
- Role-based access control (User/Admin/Super Admin)
- Supabase authentication
- PostgreSQL database with RLS
- Stripe payment integration
- AI integration with OpenAI
- Upload limits enforcement
- Responsive design
- Accessibility features

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **AI**: OpenAI GPT-4
- **Video**: Native HTML5

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Stripe account (for payments)
- OpenAI API key (optional, for AI hotspot generation)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

4. Set up environment variables in `.env`:
   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

   # Stripe
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_PRICE_ID=your-stripe-price-id
   STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

   # Application
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Optional: OpenAI
   OPENAI_API_KEY=your-openai-api-key
   ```

### Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Create a product and price in Stripe Dashboard:
   - Product: "Pro Plan"
   - Price: $10/month (recurring)
3. Copy the Price ID to `STRIPE_PRICE_ID`
4. Get your secret key from Stripe Dashboard → Developers → API keys
5. Set up webhook endpoint: `https://your-domain.com/api/stripe/webhook`
6. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Database Setup

The database schema includes:
- `profiles` - User profiles with roles (USER/ADMIN/SUPER_ADMIN)
- `videos` - Video metadata and content
- `hotspots` - Interactive hotspot overlays
- `subscriptions` - User subscription plans and status
- `payments` - Payment transaction history

Storage buckets:
- `videos` - Video file storage (200MB max, MP4/MOV/WEBM)

Migrations are automatically applied in `supabase/migrations/`.

### Running the Application

Development mode:
```bash
npm run dev
```

Build for production:
```bash
npm run build
npm start
```

## Usage

### Creating an Account

1. Navigate to `/signup`
2. Choose account type:
   - **User** - View published videos (Free plan)
   - **Admin** - Create and manage videos (Free plan, upgrade to Pro for unlimited)
3. Enter email and password
4. Sign up and start with Free plan

### Upgrading to Pro

1. Go to `/pricing` or click "Upgrade to Pro" in the dashboard
2. Click "Upgrade to Pro" button
3. Complete Stripe checkout
4. Gain unlimited video uploads and advanced features

### Admin Workflow

1. **Upload Video**
   - Check current plan limits (Free: 2 videos, Pro: unlimited)
   - Go to Admin Dashboard → "Upload Video"
   - Choose upload method:
     - **Upload File**: Select video from your computer (MP4, MOV, WEBM • Max 200MB)
     - **Use URL**: Enter direct video link
   - Add title, thumbnail, and transcript (optional)
   - Click "Create Video"
   - Video is automatically uploaded to Supabase Storage

2. **Create Hotspots**
   - Manual: Click and drag on video to draw hotspots
   - AI-Generated: Add transcript and click "Generate AI Hotspots"
   - Configure timing, actions, and content

3. **Publish Video**
   - Click "Publish" to make video available to users

### Super Admin Workflow

1. **User Management** (`/admin/super/users`)
   - View all users
   - Change user roles
   - Monitor user activity

2. **Subscription Management** (`/admin/super/subscriptions`)
   - View all subscriptions
   - Filter by plan (Free/Pro)
   - Monitor subscription status
   - Track active Pro users

3. **Payment Transactions** (`/admin/super/payments`)
   - View complete payment history
   - Filter by status (Success/Failed/Pending)
   - Track total revenue
   - Audit trail for all transactions

## Database Schema

### Profiles
- `id` - UUID (references auth.users)
- `email` - User email
- `role` - 'ADMIN', 'USER', or 'SUPER_ADMIN'
- `created_at` - Timestamp

### Videos
- `id` - UUID
- `title` - Video title
- `url` - Video file URL
- `thumbnail_url` - Optional thumbnail
- `duration` - Duration in seconds
- `transcript` - Optional transcript for AI
- `status` - 'DRAFT' or 'PUBLISHED'
- `created_by` - Admin user ID

### Hotspots
- `id` - UUID
- `video_id` - Parent video reference
- `start_time` / `end_time` - Time range
- `x`, `y`, `width`, `height` - Position (0-1 scale)
- `action` - JSON configuration
- `trigger_type` - 'click' or 'automatic'
- `image_url` - Optional PNG image

### Subscriptions
- `id` - UUID
- `user_id` - User reference
- `plan` - 'FREE' or 'PRO'
- `status` - 'ACTIVE', 'CANCELED', 'PAST_DUE'
- `stripe_subscription_id` - Stripe reference
- `stripe_customer_id` - Stripe customer
- `current_period_end` - Next billing date

### Payments
- `id` - UUID
- `user_id` - User reference
- `amount` - Amount in cents
- `currency` - Currency code
- `status` - 'SUCCESS', 'FAILED', 'PENDING'
- `provider` - 'stripe', 'gpay', etc.
- `provider_reference` - Transaction ID
- `metadata` - Additional data

## Security

- Row Level Security (RLS) enabled on all tables
- Admin-only access to video creation and editing
- Super Admin platform-level controls
- Users can only view published content
- Middleware-based route protection
- Secure Stripe webhooks with signature verification
- Upload limits enforced at API level
- Storage bucket policies:
  - Only admins can upload videos
  - Public read access for video playback
  - File type validation (MP4, MOV, WEBM)
  - 200MB file size limit

## Payments & Billing

### Stripe Integration

- Checkout Sessions for one-time Pro upgrades
- Webhook handlers for subscription events
- Automatic subscription status updates
- Payment transaction recording
- Customer portal for payment method management

### Supported Events

- `checkout.session.completed` - Initial subscription
- `customer.subscription.updated` - Status changes
- `customer.subscription.deleted` - Cancellations
- `invoice.payment_succeeded` - Successful payments
- `invoice.payment_failed` - Failed payments

## API Routes

### Videos
- `GET /api/videos` - List videos
- `POST /api/videos` - Create video (with limit check)
- `GET /api/videos/[id]` - Get video
- `PUT /api/videos/[id]` - Update video
- `DELETE /api/videos/[id]` - Delete video

### Hotspots
- `GET /api/hotspots?videoId=...` - List hotspots
- `POST /api/hotspots` - Create hotspot
- `PUT /api/hotspots/[id]` - Update hotspot
- `DELETE /api/hotspots/[id]` - Delete hotspot

### Stripe
- `POST /api/stripe/create-checkout` - Create checkout session
- `POST /api/stripe/webhook` - Handle Stripe webhooks
- `POST /api/stripe/manage-subscription` - Manage subscription

### AI
- `POST /api/ai/generate-hotspots` - AI hotspot generation

## Deployment

### Netlify Deployment

1. **Connect Repository**
   - Go to Netlify and import your Git repository

2. **Configure Environment Variables**
   - Add all required environment variables from `.env`
   - Ensure Stripe keys are set for production

3. **Set Up Stripe Webhooks**
   - Add webhook endpoint: `https://your-domain.netlify.app/api/stripe/webhook`
   - Configure webhook events in Stripe Dashboard
   - Update `STRIPE_WEBHOOK_SECRET` with production secret

4. **Deploy**
   - Netlify automatically builds and deploys
   - Verify Stripe webhook is receiving events

### Production Checklist

- [ ] Configure all environment variables
- [ ] Set up Stripe product and pricing
- [ ] Configure Stripe webhooks
- [ ] Test payment flow end-to-end
- [ ] Verify subscription limits are enforced
- [ ] Test Super Admin controls
- [ ] Enable production mode in Stripe

## Future Enhancements

### Video Compression (Planned)
- Automatic MP4 (H.265/HEVC) compression
- FFmpeg integration for optimization
- Reduce storage and bandwidth costs
- Client-side codec detection

### PNG Hotspot Images (Planned)
- Upload PNG images as hotspot overlays
- 2MB size limit
- Transparent background support
- Responsive scaling

### Additional Payment Providers (Planned)
- Google Pay integration
- CC Avenue support
- Multi-currency support

## Development

### Project Structure

```
app/
├── admin/
│   ├── dashboard/         # Admin video management
│   ├── editor/[id]/       # Hotspot editor
│   ├── upload/            # Video upload with limits
│   └── super/             # Super Admin controls
│       ├── users/         # User management
│       ├── subscriptions/ # Subscription oversight
│       └── payments/      # Payment transactions
├── client/
│   ├── videos/            # Browse videos
│   └── watch/[id]/        # Video player
├── api/
│   ├── videos/            # Video CRUD
│   ├── hotspots/          # Hotspot CRUD
│   ├── stripe/            # Payment integration
│   └── ai/                # AI generation
├── login/                 # Authentication
├── signup/                # User registration
├── pricing/               # Subscription plans
└── billing/               # Billing management

components/
├── auth/                  # Auth forms
├── ui/                    # shadcn/ui components
├── VideoPlayer.tsx        # Video playback
├── HotspotLayer.tsx       # Hotspot rendering
├── HotspotEditor.tsx      # Hotspot creation
└── Timeline.tsx           # Timeline visualization

lib/
├── supabase.ts            # Database client & types
├── auth-context.tsx       # Auth state management
├── stripe.ts              # Stripe configuration
└── ai.ts                  # AI integration
```

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
