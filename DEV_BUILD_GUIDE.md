# 🔨 Development Build Guide

## What is a Development Build?

A development build includes native `ios/` and `android/` folders, allowing you to:
- ✅ Run directly on devices/simulators without Expo Go
- ✅ Add custom native code
- ✅ Use any native library
- ✅ Debug with native tools (Xcode, Android Studio)

---

## 🚀 Quick Start

### Step 1: Generate Native Folders

```bash
# Generate ios/ and android/ folders
npm run prebuild

# Or clean rebuild:
npm run prebuild:clean
```

This creates:
- `ios/` - Xcode project
- `android/` - Android Studio project

**Note:** These folders are in `.gitignore` - they're generated, not committed.

---

## 📱 Building & Running

### Option A: Run on Local Devices (Fastest)

#### iOS (Mac only):

```bash
# Run on iOS Simulator
npm run ios

# Or run on connected iPhone
npm run ios -- --device
```

**Requirements:**
- Mac with Xcode installed
- iOS Simulator or iPhone connected via USB

#### Android:

```bash
# Run on Android Emulator or connected device
npm run android
```

**Requirements:**
- Android Studio installed
- Android Emulator running OR Android phone connected via USB

---

### Option B: Build with EAS (Cloud Builds)

#### Build Development APK/IPA:

```bash
# Android (outputs APK you can install)
npm run build:android

# iOS (outputs IPA for device)
npm run build:ios

# Wait 15-30 minutes for cloud build
# Then install on device
```

#### Build Locally (on your Mac):

```bash
# Build Android locally (faster)
npm run build:android:local

# Build iOS locally (Mac + Xcode required)
npm run build:ios:local
```

---

### Option C: Preview Builds (For Testing)

```bash
# Android preview (like production but for testing)
npm run build:preview:android

# iOS preview
npm run build:preview:ios
```

---

## 🛠️ Complete Setup Guide

### 1. Install Prerequisites

#### For iOS (Mac only):

```bash
# Install Xcode from App Store (free, ~15GB)
# After installing, accept license:
sudo xcodebuild -license accept

# Install Xcode Command Line Tools:
xcode-select --install

# Install CocoaPods (iOS dependency manager):
sudo gem install cocoapods
```

#### For Android:

1. **Install Android Studio:** https://developer.android.com/studio
2. **Install Android SDK:**
   - Open Android Studio
   - SDK Manager → Install SDK 33 (or latest)
3. **Set environment variables** (add to `~/.zshrc` or `~/.bash_profile`):
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
4. **Create virtual device:**
   - Android Studio → Device Manager → Create Device

### 2. Generate Native Folders

```bash
# First time - generates ios/ and android/
npm run prebuild
```

This reads your `app.json` and creates native projects.

### 3. Install Dependencies

```bash
# Install iOS pods (Mac only)
cd ios && pod install && cd ..

# Android dependencies install automatically
```

---

## 📂 Project Structure (After Prebuild)

```
reminderApp/
├── app/                    # Your React Native code
├── assets/                 # Images, fonts, etc.
├── lib/                    # TypeScript utilities
├── ios/                    # ← Generated iOS project
│   ├── BillReminder.xcworkspace
│   └── BillReminder/
├── android/                # ← Generated Android project
│   ├── app/
│   └── build.gradle
├── node_modules/
├── app.json               # Expo config
├── eas.json              # EAS Build config
└── package.json
```

---

## 🎯 Common Commands

### Development:

```bash
# Start Metro bundler
npm start

# Run on iOS Simulator
npm run ios

# Run on Android Emulator/Device
npm run android

# Clear cache and restart
npm run reset
```

### Building:

```bash
# Generate native folders
npm run prebuild

# Build development build (cloud)
npm run build:android
npm run build:ios

# Build locally (faster)
npm run build:android:local  # Any OS
npm run build:ios:local      # Mac only
```

### Cleaning:

```bash
# Clean and regenerate native folders
npm run prebuild:clean

# Clean iOS build
cd ios && xcodebuild clean && cd ..

# Clean Android build
cd android && ./gradlew clean && cd ..
```

---

## 🐛 Troubleshooting

### "ios/ folder not found"
```bash
npm run prebuild
```

### "Pod install failed"
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### "Android build failed"
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### "Module not found after prebuild"
```bash
rm -rf node_modules
npm install
npm run prebuild:clean
```

### "Xcode signing error"
- Open `ios/BillReminder.xcworkspace` in Xcode
- Select project → Signing & Capabilities
- Change Team to your Apple ID

### "Android SDK not found"
```bash
# Add to ~/.zshrc:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## 🔄 Development Workflow

### Daily Development:

```bash
# 1. Start Metro bundler
npm start

# 2. In another terminal, run on device:
npm run ios    # or npm run android

# 3. Make code changes
# 4. App reloads automatically!
```

### When Adding Native Dependencies:

```bash
# 1. Install package
npm install some-native-package

# 2. Regenerate native folders
npm run prebuild:clean

# 3. Install iOS pods
cd ios && pod install && cd ..

# 4. Run again
npm run ios
```

### Before Committing Code:

```bash
# Native folders are in .gitignore
# They're regenerated from app.json

# Commit:
git add app/ lib/ package.json app.json
git commit -m "Your changes"
```

---

## 📊 Expo Go vs Development Build

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| Setup | ✅ Instant | ⏱️ 30 min setup |
| Native code | ❌ Limited | ✅ Full access |
| Custom modules | ❌ No | ✅ Yes |
| File size | ✅ Small | 📦 Larger |
| Updates | ✅ Instant | ⏱️ Rebuild needed |
| Best for | Testing, MVP | Production, custom features |

---

## 🎯 When to Use Development Build?

**Use Expo Go if:**
- ✅ Just starting out
- ✅ Testing MVP
- ✅ No custom native code needed
- ✅ Want instant updates

**Use Development Build if:**
- ✅ Need custom native modules
- ✅ Building for production
- ✅ Want full control
- ✅ Publishing to app stores

---

## 💡 Tips

1. **Keep native folders in sync:**
   - After changing `app.json`, run `npm run prebuild`

2. **Don't edit native folders manually:**
   - They're auto-generated from `app.json`
   - Use Expo config plugins instead

3. **For debugging:**
   - iOS: Xcode → Product → Run
   - Android: Android Studio → Run

4. **For builds:**
   - Local builds are faster
   - Cloud builds (EAS) work on any OS

---

## 🚀 Next Steps

1. **Run prebuild:**
   ```bash
   npm run prebuild
   ```

2. **Test on simulator:**
   ```bash
   npm run ios
   # or
   npm run android
   ```

3. **Build for device:**
   ```bash
   npm run build:android
   # or
   npm run build:ios
   ```

---

## 📞 Need Help?

- **EAS Build docs:** https://docs.expo.dev/build/introduction/
- **Prebuild docs:** https://docs.expo.dev/workflow/prebuild/
- **Config plugins:** https://docs.expo.dev/config-plugins/introduction/

**You're ready to build!** 🔨

