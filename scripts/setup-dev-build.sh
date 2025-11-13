#!/bin/bash
# Setup script for development build
# Generates ios/ and android/ folders

set -e

echo "🔨 Setting up development build..."
echo ""

# Check if Expo CLI is available
if ! command -v npx &> /dev/null; then
    echo "❌ npm/npx not found. Please install Node.js first."
    exit 1
fi

echo "1️⃣  Checking prerequisites..."

# Check for Mac (needed for iOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "   ✅ macOS detected - iOS builds available"
    
    # Check for Xcode
    if xcode-select -p &> /dev/null; then
        echo "   ✅ Xcode Command Line Tools installed"
    else
        echo "   ⚠️  Xcode Command Line Tools not found"
        echo "   Install with: xcode-select --install"
    fi
    
    # Check for CocoaPods
    if command -v pod &> /dev/null; then
        echo "   ✅ CocoaPods installed"
    else
        echo "   ⚠️  CocoaPods not found (needed for iOS)"
        echo "   Install with: sudo gem install cocoapods"
    fi
else
    echo "   ℹ️  Not on Mac - iOS builds not available"
    echo "   (Android builds will work)"
fi

echo ""
echo "2️⃣  Installing dependencies..."
npm install

echo ""
echo "3️⃣  Generating native folders..."
echo "   This will create ios/ and android/ directories..."
npx expo prebuild --clean

echo ""
echo "4️⃣  Installing iOS dependencies..."
if [[ "$OSTYPE" == "darwin"* ]] && [ -d "ios" ]; then
    cd ios
    if command -v pod &> /dev/null; then
        pod install
        echo "   ✅ iOS pods installed"
    else
        echo "   ⚠️  Skipping pod install (CocoaPods not found)"
    fi
    cd ..
else
    echo "   ⏭️  Skipped (not on Mac or ios/ not found)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Development build setup complete!"
echo ""
echo "📂 Generated folders:"
if [ -d "ios" ]; then
    echo "   ✅ ios/"
fi
if [ -d "android" ]; then
    echo "   ✅ android/"
fi

echo ""
echo "🚀 Next steps:"
echo ""
echo "Run on iOS Simulator (Mac only):"
echo "   npm run ios"
echo ""
echo "Run on Android Emulator/Device:"
echo "   npm run android"
echo ""
echo "Build for cloud deployment:"
echo "   npm run build:android"
echo "   npm run build:ios"
echo ""
echo "See DEV_BUILD_GUIDE.md for full documentation"
echo ""

