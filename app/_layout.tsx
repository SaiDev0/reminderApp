import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import 'react-native-gesture-handler';
import { isAppLockEnabled, isBiometricEnabled } from '../lib/biometric';
import { supabase } from '../lib/supabase';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export default function RootLayout() {
    const [isReady, setIsReady] = useState(false);
    const [isLocked, setIsLocked] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        // Request notification permissions on app start
        requestNotificationPermissions();
        // Check app lock and authentication
        checkAppLockAndAuth();
    }, []);

    const checkAppLockAndAuth = async () => {
        try {
            // Check if user is authenticated
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // Not authenticated, go to login
                setIsReady(true);
                setIsLocked(false);
                return;
            }

            // Check if app lock is enabled
            const lockEnabled = await isAppLockEnabled();
            const bioEnabled = await isBiometricEnabled();

            if (lockEnabled && bioEnabled) {
                // App lock is enabled, need to authenticate
                setIsLocked(true);
            } else {
                // No app lock, proceed normally
                setIsLocked(false);
            }
        } catch (error) {
            console.error('Error checking app lock:', error);
            setIsLocked(false);
        } finally {
            setIsReady(true);
        }
    };

    useEffect(() => {
        if (!isReady) return;

        const inAuthGroup = segments[0] === 'auth';

        if (isLocked && !inAuthGroup) {
            // Redirect to app-lock screen
            router.replace('/auth/app-lock');
        }
    }, [isReady, isLocked, segments]);

    const requestNotificationPermissions = async () => {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Notification permissions not granted');
            return;
        }
    };

    return (
        <>
            <StatusBar style="light" />
            <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="bill/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="bill/add" options={{ title: 'Add Bill' }} />
                <Stack.Screen name="auth/login" options={{ title: 'Login' }} />
                <Stack.Screen
                    name="auth/app-lock"
                    options={{
                        headerShown: false,
                        gestureEnabled: false, // Prevent swipe back
                        animation: 'fade',
                    }}
                />
                <Stack.Screen name="budget/index" options={{ headerShown: false }} />
                <Stack.Screen name="achievements/index" options={{ headerShown: false }} />
            </Stack>
        </>
    );
}

