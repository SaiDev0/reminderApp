import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;

    // Save token to database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase
            .from('user_settings')
            .upsert({
                user_id: user.id,
                expo_push_token: token,
            }, {
                onConflict: 'user_id',
            });
    }

    return token;
}

export async function scheduleLocalNotification(
    title: string,
    body: string,
    trigger: Date,
    data?: any
) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
    });
}

export async function scheduleBillReminders(
    billName: string,
    amount: number,
    dueDate: Date,
    reminderDaysBefore: number[]
) {
    const notifications = [];

    for (const days of reminderDaysBefore) {
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - days);

        // Only schedule if the reminder date is in the future
        if (reminderDate > new Date()) {
            const id = await scheduleLocalNotification(
                'Bill Reminder',
                `${billName} is due in ${days} day${days > 1 ? 's' : ''}. Amount: $${amount}`,
                reminderDate,
                { type: 'bill_reminder', billName, amount, dueDate: dueDate.toISOString() }
            );

            notifications.push(id);
        }
    }

    return notifications;
}

export async function cancelAllBillNotifications(billId: string) {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
        if (notification.content.data?.billId === billId) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
    }
}

export async function setupNotificationHandler() {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });
}

export function addNotificationReceivedListener(handler: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(handler);
}

export function addNotificationResponseReceivedListener(
    handler: (response: Notifications.NotificationResponse) => void
) {
    return Notifications.addNotificationResponseReceivedListener(handler);
}

