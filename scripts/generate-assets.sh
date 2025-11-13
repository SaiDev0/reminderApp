#!/bin/bash
# Generate all required app assets using ImageMagick
# Usage: ./scripts/generate-assets.sh

set -e

echo "🎨 Generating app assets..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found!"
    echo ""
    echo "Install it first:"
    echo "  macOS:   brew install imagemagick"
    echo "  Linux:   sudo apt-get install imagemagick"
    echo "  Windows: https://imagemagick.org/script/download.php"
    exit 1
fi

# Create assets directory if it doesn't exist
mkdir -p assets

cd assets

echo "📱 Creating app icon (1024x1024)..."
convert -size 1024x1024 \
  -define gradient:angle=135 \
  gradient:'#6C5CE7-#A29BFE' \
  -gravity center \
  -fill white -font Arial-Bold -pointsize 200 \
  -annotate +0+0 '💰' \
  icon.png

echo "🤖 Creating adaptive icon (1024x1024)..."
cp icon.png adaptive-icon.png

echo "🖼️  Creating splash screen (2048x2048)..."
convert -size 2048x2048 xc:white \
  -gravity center \
  \( -size 1800x1800 -define gradient:angle=135 gradient:'#6C5CE7-#A29BFE' -alpha set -channel A -evaluate multiply 0.1 \) -composite \
  -fill '#6C5CE7' -font Arial-Bold -pointsize 140 \
  -annotate +0-200 '💰' \
  -fill '#2D3436' -font Arial-Bold -pointsize 80 \
  -annotate +0+0 'Bill Reminder' \
  -fill '#636E72' -font Arial -pointsize 40 \
  -annotate +0+100 'Never miss a payment' \
  splash.png

echo "🌐 Creating favicon (48x48)..."
convert icon.png -resize 48x48 favicon.png

cd ..

echo ""
echo "✅ Assets generated successfully!"
echo ""
echo "Created files:"
echo "  ✓ assets/icon.png (1024x1024)"
echo "  ✓ assets/adaptive-icon.png (1024x1024)"
echo "  ✓ assets/splash.png (2048x2048)"
echo "  ✓ assets/favicon.png (48x48)"
echo ""
echo "🚀 Ready to deploy!"

