import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import 'react-native-gesture-handler';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export default function RootLayout() {
    useEffect(() => {
        // Request notification permissions on app start
        requestNotificationPermissions();
    }, []);

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
            <StatusBar style="auto" />
            <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="bill/[id]" options={{ title: 'Bill Details' }} />
                <Stack.Screen name="bill/add" options={{ title: 'Add Bill' }} />
                <Stack.Screen name="auth/login" options={{ title: 'Login' }} />
            </Stack>
        </>
    );
}

