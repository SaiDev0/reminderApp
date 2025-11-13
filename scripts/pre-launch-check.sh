#!/bin/bash
# Pre-launch checklist for Bill Reminder App
# Usage: ./scripts/pre-launch-check.sh

set -e

echo "🔍 Running pre-launch checklist..."
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Assets
echo "1️⃣  Checking assets..."
if [ -f "assets/icon.png" ]; then
    echo "   ✅ icon.png found"
else
    echo "   ❌ icon.png MISSING"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "assets/splash.png" ]; then
    echo "   ✅ splash.png found"
else
    echo "   ❌ splash.png MISSING"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "assets/adaptive-icon.png" ]; then
    echo "   ✅ adaptive-icon.png found"
else
    echo "   ❌ adaptive-icon.png MISSING"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "assets/favicon.png" ]; then
    echo "   ✅ favicon.png found"
else
    echo "   ❌ favicon.png MISSING"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check 2: Environment variables
echo "2️⃣  Checking environment variables..."
if [ -f ".env" ]; then
    echo "   ✅ .env file found"
    
    if grep -q "EXPO_PUBLIC_SUPABASE_URL" .env; then
        URL=$(grep "EXPO_PUBLIC_SUPABASE_URL" .env | cut -d '=' -f 2)
        if [ "$URL" == "https://xxxxx.supabase.co" ]; then
            echo "   ⚠️  SUPABASE_URL is placeholder - update it!"
            WARNINGS=$((WARNINGS + 1))
        else
            echo "   ✅ SUPABASE_URL configured"
        fi
    else
        echo "   ❌ EXPO_PUBLIC_SUPABASE_URL not found in .env"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "EXPO_PUBLIC_SUPABASE_ANON_KEY" .env; then
        KEY=$(grep "EXPO_PUBLIC_SUPABASE_ANON_KEY" .env | cut -d '=' -f 2)
        if [ "$KEY" == "your-anon-key-here" ]; then
            echo "   ⚠️  SUPABASE_ANON_KEY is placeholder - update it!"
            WARNINGS=$((WARNINGS + 1))
        else
            echo "   ✅ SUPABASE_ANON_KEY configured"
        fi
    else
        echo "   ❌ EXPO_PUBLIC_SUPABASE_ANON_KEY not found in .env"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "   ❌ .env file MISSING"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check 3: Node modules
echo "3️⃣  Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules installed"
else
    echo "   ❌ node_modules MISSING - run 'npm install'"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check 4: Required files
echo "4️⃣  Checking project files..."
REQUIRED_FILES=(
    "app.json"
    "package.json"
    "app/(tabs)/_layout.tsx"
    "app/(tabs)/index.tsx"
    "app/(tabs)/bills.tsx"
    "app/(tabs)/settings.tsx"
    "lib/supabase.ts"
    "lib/types.ts"
    "lib/attachments.ts"
    "supabase/migrations/001_initial_schema.sql"
    "supabase/migrations/002_add_attachments.sql"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file MISSING"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# Check 5: App configuration
echo "5️⃣  Checking app.json configuration..."
if grep -q '"yourname"' app.json; then
    echo "   ⚠️  Bundle identifier contains 'yourname' - consider changing it!"
    WARNINGS=$((WARNINGS + 1))
else
    echo "   ✅ Bundle identifier looks good"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "🎉 ALL CHECKS PASSED!"
    echo ""
    echo "You're ready to deploy! 🚀"
    echo ""
    echo "Next steps:"
    echo "  1. npm start"
    echo "  2. Scan QR code with Expo Go app"
    echo "  3. Start using your app!"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  $WARNINGS warnings found (see above)"
    echo ""
    echo "You can deploy, but consider fixing warnings first."
    echo ""
    echo "To deploy anyway:"
    echo "  1. npm start"
    echo "  2. Scan QR code with Expo Go app"
    exit 0
else
    echo "❌ $ERRORS errors found!"
    echo ""
    echo "Fix the errors above before deploying."
    echo ""
    if [ $ERRORS -gt 0 ] && grep -q "assets" <<< "$OUTPUT"; then
        echo "To generate assets:"
        echo "  ./scripts/generate-assets.sh"
    fi
    if grep -q ".env" <<< "$OUTPUT"; then
        echo ""
        echo "To create .env:"
        echo "  1. Go to supabase.com/dashboard"
        echo "  2. Open your project → Settings → API"
        echo "  3. Copy URL and anon key"
        echo "  4. Create .env file with:"
        echo "     EXPO_PUBLIC_SUPABASE_URL=your-url"
        echo "     EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key"
    fi
    exit 1
fi

