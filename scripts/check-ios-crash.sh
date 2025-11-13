#!/bin/bash
# iOS Crash Debugging Helper
# Run this to check common issues

echo "🔍 Checking for common iOS crash issues..."
echo ""

echo "1️⃣  Checking environment variables in build..."
echo "   Make sure these are set in EAS:"
echo "   - EXPO_PUBLIC_SUPABASE_URL"
echo "   - EXPO_PUBLIC_SUPABASE_ANON_KEY"
echo ""

echo "2️⃣  Checking app.json configuration..."
if grep -q "com.yourname.billreminder" app.json; then
    echo "   ⚠️  Bundle identifier still has 'yourname' - might need updating"
else
    echo "   ✅ Bundle identifier looks good"
fi
echo ""

echo "3️⃣  Checking for native dependencies..."
if [ -f "ios/Podfile" ]; then
    echo "   ✅ Podfile exists"
else
    echo "   ⚠️  Podfile not found - run 'npm run prebuild'"
fi
echo ""

echo "4️⃣  Common iOS crash causes:"
echo "   - Missing environment variables in EAS build"
echo "   - Supabase client initialization during app launch"
echo "   - Permissions not properly configured"
echo "   - Native modules not linked"
echo ""

echo "📱 To get crash logs from your iPhone:"
echo "   1. Connect iPhone to Mac"
echo "   2. Open Xcode → Window → Devices and Simulators"
echo "   3. Select your device → View Device Logs"
echo "   4. Find crash log for 'Bill Reminder'"
echo ""

echo "🔧 Quick fixes to try:"
echo "   1. Rebuild with environment variables"
echo "   2. Check crash logs for specific error"
echo "   3. Try development build first for better error messages"
echo ""

