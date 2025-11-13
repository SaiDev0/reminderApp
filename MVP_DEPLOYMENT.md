# 🚀 MVP Deployment Guide

## 📋 Pre-Launch Checklist

Before deploying your app, let's make sure everything is ready!

### ✅ 1. Assets (Required)

You need 4 image files in the `assets/` folder:

| File | Size | Status |
|------|------|--------|
| `icon.png` | 1024x1024 | ❌ MISSING |
| `splash.png` | 2048x2048 | ❌ MISSING |
| `adaptive-icon.png` | 1024x1024 | ❌ MISSING |
| `favicon.png` | 48x48 | ❌ MISSING |

**Quick Fix - Generate Placeholder Assets:**

```bash
# Install ImageMagick (Mac)
brew install imagemagick

# Generate all required assets
cd assets

# Icon (1024x1024)
convert -size 1024x1024 \
  -define gradient:angle=135 \
  gradient:'#6C5CE7-#A29BFE' \
  -gravity center \
  -fill white -font Arial-Bold -pointsize 80 \
  -annotate +0+0 '💰' \
  icon.png

# Adaptive Icon (1024x1024)
cp icon.png adaptive-icon.png

# Splash (2048x2048)
convert -size 2048x2048 xc:white \
  -define gradient:angle=135 \
  -gravity center \
  \( -size 1800x1800 gradient:'#6C5CE7-#A29BFE' -alpha set -channel A -evaluate multiply 0.1 \) -composite \
  -fill '#6C5CE7' -font Arial-Bold -pointsize 140 \
  -annotate +0-200 '💰' \
  -fill '#2D3436' -font Arial-Bold -pointsize 80 \
  -annotate +0+0 'Bill Reminder' \
  -fill '#636E72' -font Arial -pointsize 40 \
  -annotate +0+100 'Never miss a payment' \
  splash.png

# Favicon (48x48)
convert icon.png -resize 48x48 favicon.png

cd ..
```

**Alternative - Use Free Tool:**
1. Go to https://www.appicon.co/
2. Upload a 1024x1024 image (your app logo)
3. Download and extract to `assets/`

---

### ✅ 2. Environment Variables (.env)

Make sure your `.env` file exists and has valid credentials:

```bash
# Check if .env exists
ls -la .env

# It should contain:
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**If .env is missing or incomplete:**
1. Go to https://supabase.com/dashboard
2. Open your project
3. Settings → API
4. Copy **Project URL** and **anon/public key**
5. Create `.env` file (see above format)

---

### ✅ 3. Supabase Setup

**Database Tables:**

```bash
# Check in Supabase Dashboard → SQL Editor
# Should see these tables:
✓ users
✓ bills
✓ payment_history
✓ reminders
✓ user_settings
✓ bill_attachments
```

**If missing, run migrations:**
1. Go to SQL Editor in Supabase
2. Run: `supabase/migrations/001_initial_schema.sql`
3. Run: `supabase/migrations/002_add_attachments.sql`

**Storage Bucket:**

```bash
# Check in Supabase Dashboard → Storage
# Should see:
✓ bill-attachments (private bucket)
```

**If missing:**
1. Storage → New Bucket
2. Name: `bill-attachments`
3. Public: **NO** (private)
4. Create

---

### ✅ 4. Test Authentication

Before deploying, create a test account:

```bash
# Start app
npm start

# On your phone:
1. Scan QR code with Expo Go
2. Try to register a new account
3. Check if you can login
4. Verify account appears in Supabase → Authentication → Users
```

---

### ✅ 5. App Configuration

Check `app.json` for production-ready settings:

```json
{
  "expo": {
    "name": "Bill Reminder",
    "slug": "bill-reminder-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",         // ← Must exist
    "splash": {
      "image": "./assets/splash.png",    // ← Must exist
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.billreminder"  // ← Change "yourname"
    },
    "android": {
      "package": "com.yourname.billreminder",          // ← Change "yourname"
      "permissions": [
        "NOTIFICATIONS",
        "SCHEDULE_EXACT_ALARM",
        "CAMERA",                                       // ← For attachments
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

**Important:** Change `com.yourname.billreminder` to your actual identifier!

---

## 🎯 Deployment Options

### Option 1: Expo Go (Easiest - 5 minutes) ⭐

**Perfect for MVP and personal use!**

**Pros:**
- ✅ No build required
- ✅ Instant updates
- ✅ Free forever
- ✅ Works on iOS and Android

**Cons:**
- ❌ Requires Expo Go app installed
- ❌ Can't publish to App Store

**Steps:**

1. **Install Expo Go on your phone**
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

2. **Start the development server**
   ```bash
   cd /Users/s0d0fds/Documents/self/reminderApp
   npm start
   ```

3. **Scan QR code**
   - iOS: Open Camera app → Scan QR code
   - Android: Open Expo Go app → Scan QR code

4. **Done!** 🎉

**Using it daily:**
- App stays on your phone as long as it's in Expo Go
- Just open Expo Go → Your app appears in history
- To update: Just save files in VS Code, app reloads automatically

---

### Option 2: EAS Build (Production Build - 1 hour)

**For standalone app without Expo Go**

**Pros:**
- ✅ Standalone app (like real apps)
- ✅ Can share with others
- ✅ Can publish to stores later

**Cons:**
- ❌ Takes 15-30 minutes to build
- ❌ Requires Expo account

**Steps:**

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   # Create free account if needed
   ```

3. **Configure EAS**
   ```bash
   eas build:configure
   ```

4. **Build for Android (easiest)**
   ```bash
   # Preview build (installs on your phone only)
   eas build --platform android --profile preview
   
   # Wait 15-30 minutes...
   # Download APK to your phone
   # Install and use!
   ```

5. **Build for iOS** (requires Apple Developer account - $99/year)
   ```bash
   eas build --platform ios --profile preview
   ```

---

### Option 3: Expo Dev Client (Best of Both Worlds)

**Development build with custom native code**

**When to use:**
- When Expo Go limitations become a problem
- When you need custom native modules

**Not needed for MVP** - Stick with Option 1 or 2!

---

## 🎯 Recommended Path for MVP

### **Use Expo Go** (Option 1)

This is the fastest and easiest way to use your app daily:

1. **Create assets** (5 min)
2. **Verify Supabase setup** (5 min)
3. **Install Expo Go on phone** (2 min)
4. **Start app and scan QR** (1 min)
5. **Use daily!** ✅

**Total time: 13 minutes**

---

## 📱 Daily Usage with Expo Go

### Starting the App:

```bash
# On your computer
cd /Users/s0d0fds/Documents/self/reminderApp
npm start
```

Then on your phone:
- Open Expo Go app
- Your app appears in "Recently Opened"
- Tap to open
- Done!

### Updating the App:

Just save any file in VS Code - the app updates automatically!

### Sharing with Family:

Share the QR code! Anyone with Expo Go can use your app.

---

## 🔧 Pre-Launch Testing Checklist

Before using daily, test these features:

### Authentication:
- [ ] Register new account
- [ ] Login works
- [ ] Logout works

### Bills:
- [ ] Add a bill
- [ ] Edit a bill
- [ ] Delete a bill
- [ ] Mark as paid
- [ ] View bill details

### Notifications:
- [ ] Add bill due tomorrow
- [ ] Set reminder for 1 day before
- [ ] Check if notification appears

### Attachments:
- [ ] Take photo of a bill
- [ ] Upload a PDF
- [ ] View attachment
- [ ] Delete attachment

### Navigation:
- [ ] All tabs work (Dashboard, Bills, Settings)
- [ ] Back button works
- [ ] No crashes

---

## 🚨 Common Issues & Fixes

### "Can't connect to Supabase"
**Solution:**
```bash
# 1. Check .env file exists and has correct values
cat .env

# 2. Restart with cache clear
npm start -- --clear

# 3. Make sure phone and computer are on same WiFi
```

### "Assets not found"
**Solution:**
```bash
# Generate placeholder assets (see section 1 above)
cd assets
# Run ImageMagick commands
```

### "Notifications not working"
**Solution:**
- On phone: Settings → Expo Go → Notifications → Allow
- Use a real device (simulator notifications are unreliable)
- Test with bill due today, reminder set to 0 days

### "Attachments not uploading"
**Solution:**
1. Check Supabase → Storage → `bill-attachments` bucket exists
2. Run migration: `002_add_attachments.sql`
3. Check camera permissions on phone

### "Blank white screen"
**Solution:**
```bash
# Clear everything and restart
rm -rf node_modules
npm install
npm start -- --clear
```

---

## 🎉 Post-Launch Monitoring

### Things to Watch:

1. **Supabase Usage**
   - Dashboard → Settings → Usage
   - Should be well within free tier

2. **Storage**
   - Dashboard → Storage → bill-attachments
   - Check file sizes

3. **Auth**
   - Dashboard → Authentication → Users
   - Verify your account is there

4. **Logs**
   - Check terminal for errors
   - Use Expo Go → Shake device → Show Dev Menu → Debug Remote JS

---

## 💡 Tips for MVP Success

### Performance:
- Clear old bills to keep database light
- Compress images before uploading
- Delete unused attachments

### Reliability:
- Keep computer and phone on same WiFi
- Don't close terminal while using app
- Update Expo Go app regularly

### Data Safety:
- Your data is in Supabase (backed up)
- Export important bills as PDFs
- Keep Supabase password safe

---

## 📊 What's Using Your Free Tier

| Resource | Free Tier | Your Usage | Status |
|----------|-----------|------------|--------|
| Database | 500MB | ~5-10MB | ✅ 98% free |
| Storage | 1GB | ~100-400MB | ✅ 60% free |
| Auth Users | 50,000 | 1 (you) | ✅ 99.99% free |
| API Requests | Unlimited | ~100/day | ✅ Free |

**Estimated to stay free for: Forever** (for personal use) ✅

---

## 🚀 Next Steps After MVP

Once you're happy with the MVP:

1. **Build standalone app** (EAS Build)
2. **Share with family** (send APK file)
3. **Add more features** (from roadmap)
4. **Publish to stores** (if desired)

---

## 📞 Need Help?

Check the main README.md for:
- Detailed architecture
- Feature documentation
- Troubleshooting guide
- FAQ section

---

**You're ready to launch! 🎉**

Recommended: Start with Expo Go (Option 1) - it's the fastest way to get your MVP running today!

