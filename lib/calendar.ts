import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';
import { Bill } from './types';
import { parseISO, addDays } from 'date-fns';

/**
 * Request calendar permissions
 */
export async function requestCalendarPermissions(): Promise<boolean> {
    try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Error requesting calendar permissions:', error);
        return false;
    }
}

/**
 * Get or create a calendar for Bill Reminder
 */
export async function getBillReminderCalendar(): Promise<string | null> {
    try {
        const hasPermission = await requestCalendarPermissions();
        if (!hasPermission) {
            Alert.alert(
                'Permission Required',
                'Please grant calendar access in Settings to export bills to your calendar.'
            );
            return null;
        }

        // Get all calendars
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

        // Look for existing Bill Reminder calendar
        const existingCalendar = calendars.find(
            cal => cal.title === 'Bill Reminder' || cal.title === 'Bills'
        );

        if (existingCalendar) {
            return existingCalendar.id;
        }

        // Create new calendar for Bill Reminder
        const defaultCalendar = calendars.find(cal =>
            cal.allowsModifications &&
            (Platform.OS === 'ios' ? cal.allowsModifications : true)
        );

        if (!defaultCalendar) {
            Alert.alert('Error', 'No writable calendar found on device');
            return null;
        }

        const newCalendarId = await Calendar.createCalendarAsync({
            title: 'Bill Reminder',
            color: '#007AFF',
            entityType: Calendar.EntityTypes.EVENT,
            sourceId: defaultCalendar.source.id,
            source: defaultCalendar.source,
            name: 'Bill Reminder',
            ownerAccount: defaultCalendar.ownerAccount || 'personal',
            accessLevel: Calendar.CalendarAccessLevel.OWNER,
        });

        return newCalendarId;
    } catch (error) {
        console.error('Error getting/creating calendar:', error);
        Alert.alert('Error', 'Failed to access calendar');
        return null;
    }
}

/**
 * Export a single bill to calendar
 */
export async function exportBillToCalendar(bill: Bill): Promise<boolean> {
    try {
        const calendarId = await getBillReminderCalendar();
        if (!calendarId) {
            return false;
        }

        const dueDate = parseISO(bill.due_date);
        const startDate = new Date(dueDate);
        startDate.setHours(9, 0, 0, 0); // Set to 9 AM

        const endDate = new Date(startDate);
        endDate.setHours(10, 0, 0, 0); // 1 hour duration

        // Create calendar event
        const eventId = await Calendar.createEventAsync(calendarId, {
            title: `💳 ${bill.name}`,
            startDate,
            endDate,
            notes: `
Amount: $${bill.amount.toFixed(2)}
Category: ${bill.category}
Frequency: ${bill.frequency}
${bill.notes ? `Notes: ${bill.notes}` : ''}
${bill.auto_pay ? '✅ Auto-pay enabled' : '⚠️ Manual payment required'}

Created by Bill Reminder App
            `.trim(),
            alarms: [
                { relativeOffset: -1 * 24 * 60 }, // 1 day before
                { relativeOffset: -3 * 24 * 60 }, // 3 days before
            ],
            timeZone: 'default',
        });

        return !!eventId;
    } catch (error) {
        console.error('Error exporting bill to calendar:', error);
        Alert.alert('Error', 'Failed to export bill to calendar');
        return false;
    }
}

/**
 * Export multiple bills to calendar
 */
export async function exportAllBillsToCalendar(bills: Bill[]): Promise<{
    success: number;
    failed: number;
}> {
    const result = {
        success: 0,
        failed: 0,
    };

    for (const bill of bills) {
        const exported = await exportBillToCalendar(bill);
        if (exported) {
            result.success++;
        } else {
            result.failed++;
        }
    }

    return result;
}

/**
 * Export upcoming bills to calendar (next 30 days)
 */
export async function exportUpcomingBillsToCalendar(bills: Bill[]): Promise<{
    success: number;
    failed: number;
}> {
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);

    const upcomingBills = bills.filter(bill => {
        const dueDate = parseISO(bill.due_date);
        return dueDate >= today && dueDate <= thirtyDaysFromNow && bill.status !== 'paid';
    });

    return exportAllBillsToCalendar(upcomingBills);
}

/**
 * Create a recurring calendar event for a bill
 */
export async function createRecurringBillEvent(bill: Bill): Promise<boolean> {
    try {
        if (bill.frequency === 'once') {
            return exportBillToCalendar(bill);
        }

        const calendarId = await getBillReminderCalendar();
        if (!calendarId) {
            return false;
        }

        const dueDate = parseISO(bill.due_date);
        const startDate = new Date(dueDate);
        startDate.setHours(9, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setHours(10, 0, 0, 0);

        // Convert frequency to recurrence rule
        let recurrenceRule: Calendar.RecurrenceRule | undefined;

        switch (bill.frequency) {
            case 'weekly':
                recurrenceRule = {
                    frequency: Calendar.Frequency.WEEKLY,
                    interval: 1,
                };
                break;
            case 'bi-weekly':
                recurrenceRule = {
                    frequency: Calendar.Frequency.WEEKLY,
                    interval: 2,
                };
                break;
            case 'monthly':
                recurrenceRule = {
                    frequency: Calendar.Frequency.MONTHLY,
                    interval: 1,
                };
                break;
            case 'bi-monthly':
                recurrenceRule = {
                    frequency: Calendar.Frequency.MONTHLY,
                    interval: 2,
                };
                break;
            case 'quarterly':
                recurrenceRule = {
                    frequency: Calendar.Frequency.MONTHLY,
                    interval: 3,
                };
                break;
            case 'semi-annually':
                recurrenceRule = {
                    frequency: Calendar.Frequency.MONTHLY,
                    interval: 6,
                };
                break;
            case 'yearly':
                recurrenceRule = {
                    frequency: Calendar.Frequency.YEARLY,
                    interval: 1,
                };
                break;
        }

        const eventId = await Calendar.createEventAsync(calendarId, {
            title: `💳 ${bill.name} (Recurring)`,
            startDate,
            endDate,
            notes: `
Amount: $${bill.amount.toFixed(2)}
Category: ${bill.category}
Frequency: ${bill.frequency}
${bill.notes ? `Notes: ${bill.notes}` : ''}
${bill.auto_pay ? '✅ Auto-pay enabled' : '⚠️ Manual payment required'}

This is a recurring bill payment reminder.
Created by Bill Reminder App
            `.trim(),
            alarms: [
                { relativeOffset: -1 * 24 * 60 }, // 1 day before
                { relativeOffset: -3 * 24 * 60 }, // 3 days before
            ],
            recurrenceRule,
            timeZone: 'default',
        });

        return !!eventId;
    } catch (error) {
        console.error('Error creating recurring calendar event:', error);
        Alert.alert('Error', 'Failed to create recurring calendar event');
        return false;
    }
}

/**
 * Check if user has granted calendar permissions
 */
export async function hasCalendarPermissions(): Promise<boolean> {
    try {
        const { status } = await Calendar.getCalendarPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Error checking calendar permissions:', error);
        return false;
    }
}

