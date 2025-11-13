# Changelog

## Latest Update - Auto-Refresh Fix

### ✅ Fixed: UI Not Updating After Changes

**Problem:**
- After adding a bill → list didn't update
- After marking as paid → dashboard didn't update  
- After deleting a bill → had to restart app to see changes

**Solution:**
Added `useFocusEffect` to automatically refresh data when screens come into focus.

**Affected Screens:**
- ✅ **Dashboard** (`app/(tabs)/index.tsx`) - Refreshes upcoming bills
- ✅ **Bills List** (`app/(tabs)/bills.tsx`) - Refreshes all bills
- ✅ **Payment History** (`app/(tabs)/history.tsx`) - Refreshes payment history

**How it works now:**
1. You add/edit/delete a bill
2. Navigate back to list
3. **Screen automatically fetches fresh data**
4. You see updated list immediately! 🎉

**Manual refresh still available:**
- Pull down on any list to refresh manually

---

## Previous Updates

### Build Fixes
- Fixed iOS crash due to missing environment variables
- Fixed web deployment for Vercel
- Fixed Supabase storage adapter for cross-platform support
- Added bill attachments feature

### Features Added
- 📎 Photo/PDF attachments for bills
- 🎨 Modern UI with gradients
- 📱 Cross-platform support (iOS, Android, Web)
- 🔔 Local notifications
- 💰 Payment tracking

### Configuration
- Added EAS build configuration
- Added Vercel deployment config
- Created deployment guides
- Added pre-launch checklist scripts

---

## Testing the Fix

1. **Add a new bill** → Go back → ✅ See it in the list immediately
2. **Mark bill as paid** → Go to dashboard → ✅ See updated stats
3. **Delete a bill** → Navigate to bills tab → ✅ Gone from list
4. **Switch between tabs** → ✅ Always shows latest data

**No more manual app restarts needed!** 🚀

---

## Technical Details

**Before:**
```typescript
useEffect(() => {
    fetchBills();
}, []); // Only ran on mount
```

**After:**
```typescript
useFocusEffect(
    useCallback(() => {
        fetchBills();
    }, [])
); // Runs every time screen comes into focus
```

This hook from Expo Router automatically triggers when:
- Tab is switched to
- Navigating back from another screen
- App comes to foreground (optional)

---

## Performance Impact

- ✅ Minimal - only fetches when needed
- ✅ Uses existing refresh functions
- ✅ No extra API calls (same as manual refresh)
- ✅ Better UX - always shows fresh data

---

_Last updated: 2025-01-13_

