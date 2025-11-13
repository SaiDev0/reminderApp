# 🚀 Quick Deployment Guide

Your app is ready to deploy! Follow these steps:

---

## ✅ Step 1: Set Environment Variables in Vercel

### Method 1: Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to: **Settings → Environment Variables**
4. Add these two variables:

```
Variable Name: EXPO_PUBLIC_SUPABASE_URL
Value: [Your Supabase URL from .env file]
Environment: Production

Variable Name: EXPO_PUBLIC_SUPABASE_ANON_KEY  
Value: [Your Supabase anon key from .env file]
Environment: Production
```

5. Click **Save**

### Method 2: Via CLI

```bash
# Get your values from .env first
cat .env

# Add to Vercel
vercel env add EXPO_PUBLIC_SUPABASE_URL production
# Paste your URL when prompted

vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY production
# Paste your key when prompted
```

---

## ✅ Step 2: Deploy

```bash
# Commit the fixes
git add .
git commit -m "Fix Vercel deployment"

# Deploy
vercel --prod --archive=tgz
```

---

## ✅ Step 3: Verify Deployment

After deployment completes:

1. Open your app URL (e.g., `https://reminder-xxxxx.vercel.app`)
2. Test login/signup
3. Try adding a bill
4. Check if data saves to Supabase

---

## 🎯 What Was Fixed

✅ **Supabase client** - Won't crash during build  
✅ **Vercel config** - Proper build command and output directory  
✅ **Environment handling** - Graceful fallback for missing vars  

---

## 🚨 Important Notes

### Environment Variables

The app **requires** these environment variables to work:
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase public API key

**Get these from:**
- Supabase Dashboard → Your Project → Settings → API

### Files to Update Before Deploy

1. **Copy your real .env values to Vercel:**
   ```bash
   # Check your current values
   cat .env
   
   # Add them to Vercel dashboard or via CLI
   ```

2. **.env.production** (optional):
   - Update with your real values
   - This file is ignored by git (secure)

---

## 🔄 Redeploy After Changes

```bash
# Method 1: Auto-deploy (if GitHub connected)
git push

# Method 2: Manual deploy
vercel --prod --archive=tgz
```

---

## 📱 Access Your App

After successful deployment:

- **Web:** `https://your-app-name.vercel.app`
- **Mobile:** Use Expo Go and scan QR from `npm start`
- **iOS/Android:** Build with EAS (see DEV_BUILD_GUIDE.md)

---

## 🐛 Troubleshooting

### Build still fails?
```bash
# Test build locally first
npm run build:web

# Check if dist/ folder was created
ls -la dist/

# Should see index.html and _expo folder
```

### Environment variables not working?
- Check they're set in Vercel dashboard
- Environment should be "Production"
- Redeploy after adding variables

### App loads but can't connect to Supabase?
- Verify the environment variables in Vercel
- Check browser console for errors
- Confirm your Supabase project is active

---

## ✨ You're Ready!

Your app is now configured for deployment. Just:

1. Add environment variables to Vercel ⬆️
2. Run `vercel --prod --archive=tgz`
3. Done! 🎉

**Next:** See MVP_DEPLOYMENT.md for mobile deployment options

