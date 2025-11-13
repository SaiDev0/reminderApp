# Bill Reminder App 💰📱

A cross-platform (iOS, Android, Web) bill reminder application built with React Native, Expo, and Supabase. Never miss a payment again!

**Cost: $0/month for personal use** ✅

---

## 📋 Table of Contents

- [Quick Start](#quick-start-15-minutes)
- [MVP Deployment Guide](#-mvp-ready) - **← Start here for production!**
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Notifications](#notifications)
- [Bill Attachments](#bill-attachments)
- [UI Design](#ui-design)
- [Assets & Icons](#assets--icons)
- [Production Deployment](#production-deployment)
- [Architecture](#architecture)
- [Cost Analysis](#cost-analysis)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## ⚡ Quick Start (15 Minutes)

### Prerequisites
- Node.js 18+
- Expo Go app on your phone (iOS/Android)

### Setup Steps

```bash
# 1. Install dependencies
cd reminderApp
npm install

# 2. Set up Supabase (free)
# - Go to supabase.com → Create account
# - Create new project
# - Run SQL from: supabase/migrations/001_initial_schema.sql
# - Run SQL from: supabase/migrations/002_add_attachments.sql
# - Create storage bucket: "bill-attachments" (private)
# - Get your URL and anon key from Settings → API

# 3. Create .env file
cat > .env << EOF
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EOF

# 4. Run the app
npm start

# 5. Scan QR code with Expo Go app
# 6. Done! 🎉
```

---

## 🚀 MVP Ready?

**Ready to use your app on your phone?** 

See the complete deployment guide: **[MVP_DEPLOYMENT.md](./MVP_DEPLOYMENT.md)**

### Quick Deploy (5 minutes):

1. **Check readiness:**
   ```bash
   ./scripts/pre-launch-check.sh
   ```

2. **Fix any issues** (usually just .env setup)

3. **Install Expo Go** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

4. **Start the app:**
   ```bash
   npm start
   ```

5. **Scan QR code** with Expo Go - Done! 🎉

**Full guide with all options:** [MVP_DEPLOYMENT.md](./MVP_DEPLOYMENT.md)

---

## ✨ Features

### Core Features
- 📊 **Dashboard** - See all upcoming bills at a glance with beautiful gradients
- 📝 **Bill Management** - Add, edit, delete bills with rich details
- 🔔 **Smart Notifications** - Local reminders 7, 3, and 1 day before due date
- 🔄 **Recurring Bills** - Support for weekly, monthly, quarterly, yearly
- 📈 **Payment History** - Track all past payments
- 📎 **Bill Attachments** - Upload photos/PDFs of bills, receipts, and documents
- 💾 **Offline Support** - Access bills without internet
- 🔐 **Secure Auth** - Email/password authentication
- 🎨 **Modern UI** - Beautiful gradients, shadows, professional design

### Bill Features
- Multiple categories (utilities, subscriptions, insurance, rent, loans, credit cards)
- Custom reminder intervals
- Auto-pay tracking
- Notes and details
- Status tracking (pending/paid/overdue)
- Color-coded urgency indicators
- Photo capture & document uploads for bill copies
- Secure cloud storage for attachments (1GB free)
- Category-specific icons

---

## 🛠️ Tech Stack

### Frontend
- **React Native 0.74** + **Expo SDK 51** (TypeScript)
- **Expo Router** - File-based navigation
- **React Native New Architecture** - 25-30% performance boost ⚡
- **Expo Linear Gradient** - Beautiful gradient effects
- **Date-fns 4.1** - Date manipulation

### Backend
- **Supabase** (PostgreSQL + Auth + Edge Functions)
- **Row Level Security** - User data isolation
- **Real-time subscriptions** (optional)

### Notifications
- **Expo Notifications** - Local notifications (works automatically)
- **Push Notifications** - Optional server-based (requires setup)

### State Management
- Local state (useState)
- AsyncStorage for offline support
- Supabase as source of truth

---

## 📦 Installation

### 1. Clone & Install

```bash
cd /Users/s0d0fds/Documents/self/reminderApp
npm install
```

### 2. Set Up Supabase Database

**Create Account:**
1. Go to [supabase.com](https://supabase.com)
2. Sign up (free)
3. Create new project
4. Wait 2-3 minutes for setup

**Run Database Migration:**
1. Supabase Dashboard → SQL Editor
2. Copy all SQL from `supabase/migrations/001_initial_schema.sql`
3. Paste and click "Run"
4. Should see "Success. No rows returned"

**Get API Credentials:**
1. Settings → API
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 3. Configure Environment

Create `.env` file in project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-key-here
```

### 4. Run the App

```bash
# Clear cache and start
npm start -c

# Or specific platform
npm run ios       # iOS simulator
npm run android   # Android emulator
npm run web       # Web browser
```

---

## ⚙️ Configuration

### App Settings (app.json)

```json
{
  "expo": {
    "name": "Bill Reminder",
    "slug": "bill-reminder-app",
    "scheme": "billreminder",
    "newArchEnabled": true
  }
}
```

### Database Schema

**Tables:**
- `bills` - All bill information
- `payment_history` - Payment records
- `reminder_logs` - Notification history
- `user_settings` - User preferences

**Features:**
- Row Level Security (RLS) enabled
- Automatic triggers for status updates
- Indexed queries for performance
- Backup functions

---

## 🚀 Usage

### First Time Setup

1. **Sign Up**
   - Open app → Create account
   - Enter email + password
   - Verify email (check inbox)

2. **Allow Notifications**
   - App asks for permission → Tap "Allow"
   - Local notifications work automatically

3. **Add Your First Bill**
   - Tap blue "+" button
   - Enter bill details:
     - Name: "Electric Bill"
     - Amount: $150
     - Due Date: Next month
     - Frequency: Monthly
     - Category: Utilities
     - Reminders: Keep default (7, 3, 1 days)
   - Tap "Save"

4. **View Dashboard**
   - See your bill in upcoming list
   - Check total amount due
   - Monitor overdue count

### Daily Usage

- **Dashboard** - Check upcoming bills
- **All Bills** - Search and filter by category
- **History** - View past payments
- **Settings** - Adjust preferences

---

## 🔔 Notifications

### Local Notifications (Already Working!) ✅

**How they work:**
1. You add a bill with due date
2. App schedules reminders on your device
3. Phone shows notification at right time
4. Works on **real devices AND simulators**
5. **No server or internet needed!**

**Just allow notification permission** when app asks.

**Example:**
- Bill: Electric Bill, $150
- Due: December 15, 2024
- Reminders: 7, 3, 1 days before

**You'll get:**
- Dec 8: "Electric Bill due in 7 days. Amount: $150"
- Dec 12: "Electric Bill due in 3 days. Amount: $150"
- Dec 14: "Electric Bill due in 1 day. Amount: $150"

**Testing:**
- Add bill due tomorrow
- Set reminder to 1 day before
- Should see notification tomorrow

### Advanced Push Notifications (Optional)

**Only needed if:**
- Sharing with 50+ users
- Want email notification backups
- Need centralized control

**Setup requires:**
- Expo account
- Supabase Edge Functions
- Cron jobs

**See Advanced Setup section below for details**

---

## 📎 Bill Attachments

### Overview

Upload and store photos, PDFs, and documents for your bills. Perfect for:
- 📸 Insurance policy documents
- 📄 Lease agreements
- 🧾 Utility bill copies
- 💵 Payment receipts

**Storage:** Supabase Storage (1GB free - enough for 250+ bills with attachments)

### Features

**File Types Supported:**
- Photos (JPEG, PNG, GIF)
- PDFs
- Documents

**Actions:**
- 📷 **Take Photo** - Capture bill with camera
- 🖼️ **Choose Image** - Select from photo library
- 📄 **Upload Document** - Select PDF or other documents
- 👁️ **View Attachment** - Open file in native viewer
- 🗑️ **Delete** - Remove unwanted attachments

### How to Use

1. **Add a Bill**
   - Create or open an existing bill
   - Scroll to "Attachments" section

2. **Upload Attachment**
   - Tap "Add" button
   - Choose: Take Photo / Choose from Library / Choose Document
   - File uploads automatically

3. **View Attachment**
   - Tap on attachment card
   - Opens in system viewer (Photos app, PDF viewer, etc)

4. **Delete Attachment**
   - Tap trash icon on attachment card
   - Confirm deletion

### Setup Required

**1. Install Dependencies**
```bash
npm install
```

The following packages are already in `package.json`:
- `expo-image-picker` - Camera & photo library access
- `expo-document-picker` - Document selection
- `expo-file-system` - File operations

**2. Create Storage Bucket in Supabase**

Go to your Supabase project → Storage → Create bucket:

```
Bucket name: bill-attachments
Public: NO (private)
```

**3. Run Migration**

Execute the SQL migration to create attachments table:

```bash
# In Supabase SQL Editor
# Run: supabase/migrations/002_add_attachments.sql
```

This creates:
- `bill_attachments` table
- Row Level Security (RLS) policies
- Storage policies (if enabled)

**4. Mobile Permissions**

When you first use attachments:
- **iOS:** App will request camera/photo permissions
- **Android:** Permissions defined in `app.json` automatically

**No additional configuration needed!**

### Storage & Cost

**Free Tier Limits:**
- 1GB storage
- Enough for personal use

**Typical File Sizes:**
- Photo: 2-3MB
- PDF: 1-5MB
- 100 bills × 2 attachments = ~400MB
- **You can store 250+ bills before hitting 1GB**

**Cost Analysis:**
- Personal use: **$0/month** ✅
- If you exceed 1GB: $0.021/GB/month (~$2/year for 10GB)

### Technical Details

**File Upload Process:**
1. User selects file (camera, library, or document)
2. File compressed (images only, 80% quality)
3. Uploaded to Supabase Storage at `{userId}/{billId}/{timestamp}.{ext}`
4. Metadata saved to `bill_attachments` table
5. Signed URL generated for viewing (1 hour expiry)

**Security:**
- Files stored privately (not public)
- Row Level Security enforces user access
- Users can only access their own bill attachments
- Signed URLs expire after 1 hour

**Limitations:**
- Max file size: 10MB per file
- Supported types: Images (JPEG, PNG, GIF), PDFs
- No OCR/auto-fill (manual entry required)

### Troubleshooting

**Camera not working:**
- Check app has camera permissions in iOS/Android settings
- Real device required (simulator camera may not work)

**File too large:**
- Maximum 10MB per file
- Compress images before uploading
- Use PDF compression tools for large PDFs

**Upload fails:**
- Check internet connection
- Verify Supabase storage bucket exists and is named `bill-attachments`
- Check storage quota in Supabase dashboard

**Can't view attachment:**
- Check internet connection (signed URL requires network)
- File may have been deleted from storage
- Try re-uploading

---

## 🎨 UI Design

### Modern Design Features

**Dashboard:**
- 🎨 Purple gradient hero section
- 💎 Glass morphism effects on amount card
- 📊 Three gradient stat cards (Upcoming, Overdue, Due Today)
- 💳 Modern bill cards with category icons
- ✨ Smooth shadows and depth

**Color Scheme:**
- Primary: `#6C5CE7` (Purple) - Modern, trustworthy
- Success: `#00B894` (Teal) - Positive actions
- Danger: `#FF7675` (Coral Red) - Urgent items
- Orange: `#FF9F43` (Warm Orange) - Warnings

**Category Icons:**
- ⚡ Lightning for utilities
- 📺 TV for subscriptions
- 🏠 House for rent
- 🛡️ Shield for insurance
- 💳 Card for loans/credit cards

**Typography:**
- Header: 800 weight, larger sizes
- Body: 600-700 weight for emphasis
- Clear visual hierarchy

**Design Inspiration:**
- Mint (financial tracking)
- YNAB (budget management)
- Revolut (modern banking)

---

## 🎯 Assets & Icons

### Required Assets (4 files)

| File | Size | Purpose |
|------|------|---------|
| `assets/icon.png` | 1024x1024 | App icon |
| `assets/splash.png` | 2048x2048 | Splash screen |
| `assets/adaptive-icon.png` | 1024x1024 | Android icon |
| `assets/favicon.png` | 48x48 | Web icon |

### Quick Asset Creation

**Option 1: Use Free Tool**
1. Go to [appicon.co](https://www.appicon.co/)
2. Upload 1024x1024 image
3. Download all sizes

**Option 2: Simple Placeholders**
```bash
# Install ImageMagick (Mac)
brew install imagemagick

# Generate purple gradient icons
convert -size 1024x1024 gradient:'#6C5CE7-#A29BFE' assets/icon.png
convert -size 2048x2048 xc:white \
  -gravity center -pointsize 120 -fill '#6C5CE7' \
  -font Arial-Bold -annotate +0-100 'Bill\nReminder' \
  assets/splash.png
convert -size 1024x1024 gradient:'#6C5CE7-#A29BFE' assets/adaptive-icon.png
convert -size 48x48 gradient:'#6C5CE7-#A29BFE' assets/favicon.png
```

**Design Recommendations:**
- Keep it simple (complex designs don't work at small sizes)
- No text (unreadable at 60x60 pixels)
- Use your brand purple (#6C5CE7)
- Bold, recognizable design

---

## 🚀 Production Deployment

### Building the App

#### Android APK (Free - No Play Store)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build APK
eas build -p android --profile preview
```

**Result:** APK file you can install directly on Android devices

#### iOS App (Requires $99/year Apple Developer Account)

```bash
# Build for iOS
eas build -p ios

# Submit to App Store
eas submit -p ios
```

#### Web Deployment (Free on Vercel)

```bash
# Build web version
npx expo export:web

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Result:** URL like `https://bill-reminder-xxx.vercel.app`

### Alternative: Use Expo Go Forever (Free)

- Users install "Expo Go" app
- They scan your QR code
- Works forever, completely free
- ❌ Can't use custom push notifications
- ✅ Perfect for personal/family use

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────┐
│   React Native + Expo (Client)      │
│   - iOS, Android, Web               │
│   - Expo Router navigation          │
│   - Local notifications             │
│   - AsyncStorage for offline        │
└─────────────┬───────────────────────┘
              │ HTTPS / WebSocket
              ▼
┌─────────────────────────────────────┐
│   Supabase (Backend)                │
│   - PostgreSQL database             │
│   - Authentication (JWT)            │
│   - Row Level Security              │
│   - Edge Functions (optional)       │
└─────────────────────────────────────┘
```

### Data Flow

**User adds bill →** Saves to Supabase → Schedules local notification → Phone's OS handles reminder

**Notification triggers →** Phone shows alert → User opens app → Marks bill as paid → Updates database

### Security

- ✅ JWT tokens (Supabase Auth)
- ✅ Encrypted storage (Expo SecureStore)
- ✅ Row Level Security (users only see their data)
- ✅ HTTPS for all API calls
- ✅ No sensitive data in client

---

## 💰 Cost Analysis

### Personal Use: **$0/month** ✅

| Service | Free Tier | Usage (1-10 users) | Cost |
|---------|-----------|-------------------|------|
| **Supabase DB** | 500MB, 50K users | ~5MB | $0 |
| **Supabase Storage** | 1GB | ~400MB (100 bills) | $0 |
| **Expo** | Unlimited | Development | $0 |
| **Push Notifications** | Unlimited | N/A (using local) | $0 |
| **Web Hosting** | 100GB bandwidth | Optional | $0 |
| **Total** | | | **$0/month** |

### Scaling Costs

**50 users:** Still free
**500 users:** ~$25/month (Supabase Pro)
**5,000 users:** ~$198/month (all services)

### One-Time Costs (Optional)

- **iOS App Store:** $99/year
- **Android Play Store:** $25 one-time
- **Can skip both:** Use Expo Go or direct APK (free)

---

## 🐛 Troubleshooting

### Common Issues

**"Can't connect to Supabase"**
```bash
# Check .env file
cat .env

# Verify credentials are correct
# Restart with cache clear
npm start -c
```

**"Notifications not working"**
1. Check permissions in phone Settings → Bill Reminder → Notifications
2. Add test bill due today
3. Set reminder to 0 days before
4. Should notify immediately

**"App won't start"**
```bash
# Nuclear option - clear everything
rm -rf node_modules package-lock.json
npm install
npm start -c
```

**"Push token error in Settings"**
- This is normal! Local notifications work without push tokens
- Only needed for server-based push (optional)
- Settings screen will still work

**"Blank white screen"**
- Check Supabase credentials in .env
- Verify SQL migration ran successfully
- Check console for errors

### Getting Help

- Check error logs in terminal
- Review database in Supabase dashboard
- Test with clean build: `npm start -c`

---

## ❓ FAQ

### General

**Q: How much does it cost?**
A: $0/month for personal use (1-50 users). All services have generous free tiers.

**Q: Do I need to publish to app stores?**
A: No! Use Expo Go (free) or build APK for Android (free). App stores are optional.

**Q: Will notifications work without internet?**
A: Yes! Local notifications are scheduled on your device and work offline.

**Q: Can I use this on iOS Simulator?**
A: Yes, though notifications have limited support in simulator. Test on real device.

**Q: How do I backup my data?**
A: Supabase automatically backs up your database. Can also export manually from SQL Editor.

### Notifications

**Q: What's the difference between local and push notifications?**
A: 
- **Local:** Your phone reminds itself (works offline, no server)
- **Push:** Server sends reminders to phone (needs internet, optional)

**Q: Which notifications should I use?**
A: Local notifications (already working) are perfect for personal use. Simple and reliable.

**Q: Do notifications work if app is closed?**
A: Yes! Once scheduled, they work even if app is closed or phone restarts.

**Q: Can I change reminder intervals?**
A: Yes! Edit the reminder days when adding/editing a bill. Default is [7, 3, 1] but you can customize.

### Technical

**Q: What's the "New Architecture"?**
A: React Native's latest rendering engine. 25-30% faster performance, enabled by default in this app.

**Q: Can I self-host Supabase?**
A: Yes! Supabase is open source. Can run on your own server for ~$5-10/month.

**Q: How do I update the app?**
A: 
- **Expo Go:** Automatic updates
- **Standalone app:** Rebuild and reinstall
- **Web:** Redeploy to Vercel

**Q: Can I add features?**
A: Yes! All source code is yours. Edit and customize as needed.

**Q: What if I want dark mode?**
A: Edit `constants/Colors.ts` to add dark theme colors. Toggle in settings.

---

## 📚 Advanced Topics

### Setting Up Server Push Notifications (Optional)

**Only if you need:**
- Centralized notification control
- Email notification backups
- Support for 50+ users

**Requirements:**
1. Supabase CLI
2. Expo account with project ID
3. Deploy Edge Function
4. Set up cron jobs

**Installation:**
```bash
# Install Supabase CLI (Mac)
brew install supabase/tap/supabase

# Login
supabase login

# Link project
supabase link --project-ref your-ref

# Deploy function
supabase functions deploy check-reminders

# Set up cron job (in Supabase dashboard)
# Database → Cron Jobs → Add job
# Schedule: 0 9 * * * (9 AM daily)
```

### Database Schema Details

**Bills Table:**
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key)
- name: VARCHAR
- amount: DECIMAL
- due_date: DATE
- frequency: ENUM (once, weekly, monthly, quarterly, yearly)
- category: ENUM (utilities, subscriptions, insurance, rent, loans, credit_card, other)
- status: ENUM (pending, paid, overdue)
- reminder_days_before: INTEGER[]
- auto_pay: BOOLEAN
- notes: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Key Features:**
- Automatic status updates via triggers
- RLS policies for data isolation
- Indexes on frequently queried columns
- Cascade deletes for related records

### Performance Optimizations

**Implemented:**
- ✅ React Native New Architecture
- ✅ Indexed database queries
- ✅ Cached data with AsyncStorage
- ✅ Optimized images and gradients
- ✅ Lazy loading for lists

**Future Enhancements:**
- Add Redis caching for heavy loads
- Implement pagination for large bill lists
- Use service workers for web version
- Add image optimization for web

---

## 🎯 Project Structure

```
reminderApp/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Tab navigation
│   │   ├── index.tsx            # Dashboard (home)
│   │   ├── bills.tsx            # All bills list
│   │   ├── history.tsx          # Payment history
│   │   └── settings.tsx         # User settings
│   ├── bill/
│   │   ├── [id].tsx             # Bill details
│   │   └── add.tsx              # Add/edit bill
│   ├── auth/
│   │   └── login.tsx            # Authentication
│   └── _layout.tsx              # Root layout
├── lib/
│   ├── supabase.ts              # Supabase client
│   ├── types.ts                 # TypeScript types
│   ├── notifications.ts         # Notification logic
│   └── offline.ts               # Offline/cache logic
├── constants/
│   └── Colors.ts                # Color system
├── supabase/
│   ├── migrations/              # Database schema
│   └── functions/               # Edge functions
├── assets/                      # Images, icons
├── package.json
├── app.json                     # Expo configuration
├── tsconfig.json
└── README.md                    # This file
```

---

## 🤝 Contributing

This is a personal project, but feel free to:
- Fork for your own use
- Customize the design
- Add features you need
- Share improvements

---

## 📄 License

MIT License - Use for personal or commercial projects.

---

## 🎉 Summary

**You've built a professional bill reminder app with:**
- ✅ iOS, Android, and Web support
- ✅ Beautiful modern UI with gradients
- ✅ Local notifications (work automatically)
- ✅ Secure authentication
- ✅ Offline support
- ✅ Complete documentation
- ✅ **$0/month cost**
- ✅ Production-ready architecture

**Time to first bill tracked: ~15 minutes!** ⚡

**Never miss a bill payment again!** 💰✨

---

## 📞 Support

For issues:
1. Check Troubleshooting section above
2. Review error logs in terminal
3. Verify Supabase configuration
4. Test with clean install: `npm start -c`

---

**Made with ❤️ to help you never miss a bill payment!**

**Version:** 1.0.0
**Last Updated:** November 2024
**React Native:** 0.74.5 with New Architecture
**Expo SDK:** 51.0
