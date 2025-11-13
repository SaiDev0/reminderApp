import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { Bill } from './types';
import { format, parseISO, isToday, isTomorrow, differenceInDays, startOfDay, addDays } from 'date-fns';

/**
 * Smart notification messages with context
 */

export interface SmartNotificationContext {
    totalBillsThisWeek: number;
    totalAmountThisWeek: number;
    overdueCount: number;
    isPayday?: boolean;
    categoryName?: string;
}

/**
 * Generate context-aware notification message
 */
export function generateSmartMessage(
    bill: Bill,
    daysUntilDue: number,
    context: SmartNotificationContext
): { title: string; body: string } {
    const amount = `$${bill.amount.toFixed(2)}`;
    const billName = bill.name;

    // Payday reminders
    if (context.isPayday && context.totalBillsThisWeek > 0) {
        return {
            title: '💰 Payday Tomorrow!',
            body: `You have ${context.totalBillsThisWeek} bills due this week (${format(
                parseISO(bill.due_date),
                'MMM d'
            )}). Total: $${context.totalAmountThisWeek.toFixed(2)}`,
        };
    }

    // Overdue bills
    if (daysUntilDue < 0) {
        const daysOverdue = Math.abs(daysUntilDue);
        return {
            title: '🚨 Overdue Bill!',
            body: `${billName} was due ${daysOverdue} day${daysOverdue > 1 ? 's' : ''
                } ago. Amount: ${amount}`,
        };
    }

    // Due today
    if (daysUntilDue === 0) {
        if (context.totalBillsThisWeek > 1) {
            return {
                title: '⚡ Bill Due Today!',
                body: `${billName} (${amount}) is due today. You have ${context.totalBillsThisWeek - 1
                    } more bills this week.`,
            };
        }
        return {
            title: '⚡ Bill Due Today!',
            body: `${billName} - ${amount} is due today`,
        };
    }

    // Due tomorrow
    if (daysUntilDue === 1) {
        if (context.totalBillsThisWeek > 1) {
            return {
                title: '📅 Bill Due Tomorrow',
                body: `${billName} (${amount}) is due tomorrow. ${context.totalBillsThisWeek} bills this week totaling $${context.totalAmountThisWeek.toFixed(
                    2
                )}`,
            };
        }
        return {
            title: '📅 Bill Due Tomorrow',
            body: `${billName} - ${amount}`,
        };
    }

    // Multiple bills in category
    if (context.categoryName && context.totalBillsThisWeek > 2) {
        return {
            title: `💳 ${context.categoryName} Bills Coming Up`,
            body: `${billName} and ${context.totalBillsThisWeek - 1
                } other bills due soon. Total: $${context.totalAmountThisWeek.toFixed(2)}`,
        };
    }

    // Standard reminder
    return {
        title: `💳 Bill Reminder`,
        body: `${billName} - ${amount} due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`,
    };
}

/**
 * Get upcoming bills for context
 */
async function getUpcomingBillsContext(userId: string, targetDate: Date): Promise<SmartNotificationContext> {
    const today = startOfDay(new Date());
    const weekFromNow = addDays(today, 7);

    const { data: bills } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', userId)
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', weekFromNow.toISOString().split('T')[0])
        .eq('status', 'pending');

    const totalBillsThisWeek = bills?.length || 0;
    const totalAmountThisWeek = bills?.reduce((sum, bill) => sum + bill.amount, 0) || 0;

    // Count overdue bills
    const { data: overdueBills } = await supabase
        .from('bills')
        .select('id')
        .eq('user_id', userId)
        .lt('due_date', today.toISOString().split('T')[0])
        .eq('status', 'pending');

    return {
        totalBillsThisWeek,
        totalAmountThisWeek,
        overdueCount: overdueBills?.length || 0,
    };
}

/**
 * Schedule a smart notification for a bill
 */
export async function scheduleSmartNotification(
    bill: Bill,
    daysBeforeDue: number,
    userId: string
): Promise<string | null> {
    try {
        const dueDate = parseISO(bill.due_date);
        const notificationDate = addDays(dueDate, -daysBeforeDue);

        // Don't schedule if date is in the past
        if (notificationDate < new Date()) {
            return null;
        }

        // Get context for smart messaging
        const context = await getUpcomingBillsContext(userId, notificationDate);

        // Generate smart message
        const { title, body } = generateSmartMessage(bill, daysBeforeDue, context);

        // Set notification time to optimal time (9 AM or user's preferred time)
        const notificationTime = new Date(notificationDate);
        notificationTime.setHours(9, 0, 0, 0);

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: {
                    billId: bill.id,
                    billName: bill.name,
                    amount: bill.amount,
                    dueDate: bill.due_date,
                    type: 'smart_reminder',
                },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
                categoryIdentifier: 'bill-reminder',
            },
            trigger: {
                date: notificationTime,
            },
        });

        return notificationId;
    } catch (error) {
        console.error('Error scheduling smart notification:', error);
        return null;
    }
}

/**
 * Schedule payday reminder
 * Checks all bills due in the next 7 days and sends a summary
 */
export async function schedulePaydayReminder(
    userId: string,
    paydayDate: Date
): Promise<string | null> {
    try {
        const today = startOfDay(new Date());
        const weekFromPayday = addDays(paydayDate, 7);

        // Get all bills due in the week after payday
        const { data: bills } = await supabase
            .from('bills')
            .select('*')
            .eq('user_id', userId)
            .gte('due_date', paydayDate.toISOString().split('T')[0])
            .lte('due_date', weekFromPayday.toISOString().split('T')[0])
            .eq('status', 'pending')
            .order('due_date');

        if (!bills || bills.length === 0) {
            return null;
        }

        const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
        const billsList = bills
            .slice(0, 3)
            .map(b => `• ${b.name} - $${b.amount.toFixed(2)}`)
            .join('\n');

        const notificationTime = new Date(paydayDate);
        notificationTime.setHours(8, 0, 0, 0); // 8 AM on payday

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '💰 Payday Reminder',
                body: `You have ${bills.length} bills due this week. Total: $${totalAmount.toFixed(
                    2
                )}\n\n${billsList}${bills.length > 3 ? `\n...and ${bills.length - 3} more` : ''}`,
                data: {
                    type: 'payday_reminder',
                    billCount: bills.length,
                    totalAmount,
                },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: {
                date: notificationTime,
            },
        });

        return notificationId;
    } catch (error) {
        console.error('Error scheduling payday reminder:', error);
        return null;
    }
}

/**
 * Schedule weekly summary notification
 * Sent every Monday morning with the week's bills overview
 */
export async function scheduleWeeklySummary(userId: string): Promise<void> {
    try {
        const today = new Date();
        const daysUntilMonday = (8 - today.getDay()) % 7 || 7; // Next Monday
        const nextMonday = addDays(startOfDay(today), daysUntilMonday);
        const weekFromMonday = addDays(nextMonday, 7);

        // Get bills for the upcoming week
        const { data: bills } = await supabase
            .from('bills')
            .select('*')
            .eq('user_id', userId)
            .gte('due_date', nextMonday.toISOString().split('T')[0])
            .lt('due_date', weekFromMonday.toISOString().split('T')[0])
            .eq('status', 'pending')
            .order('due_date');

        if (!bills || bills.length === 0) {
            // Still send notification saying no bills
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '✅ Good News!',
                    body: 'No bills due this week. Enjoy your week!',
                    data: { type: 'weekly_summary' },
                },
                trigger: {
                    date: new Date(nextMonday.setHours(9, 0, 0, 0)),
                },
            });
            return;
        }

        const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
        const byCategory = bills.reduce((acc: any, bill) => {
            acc[bill.category] = (acc[bill.category] || 0) + 1;
            return acc;
        }, {});

        const categorySummary = Object.entries(byCategory)
            .map(([cat, count]) => `${count} ${cat}`)
            .join(', ');

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '📊 Week Ahead',
                body: `${bills.length} bills due this week: ${categorySummary}. Total: $${totalAmount.toFixed(
                    2
                )}`,
                data: {
                    type: 'weekly_summary',
                    billCount: bills.length,
                    totalAmount,
                },
                sound: true,
            },
            trigger: {
                date: new Date(nextMonday.setHours(9, 0, 0, 0)),
            },
        });

        console.log('Weekly summary scheduled for', nextMonday);
    } catch (error) {
        console.error('Error scheduling weekly summary:', error);
    }
}

/**
 * Schedule end-of-month summary
 */
export async function scheduleMonthEndSummary(userId: string): Promise<void> {
    try {
        const today = new Date();
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const summaryDate = new Date(lastDayOfMonth);
        summaryDate.setHours(20, 0, 0, 0); // 8 PM on last day of month

        // Don't schedule if it's in the past
        if (summaryDate < new Date()) {
            return;
        }

        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Get all bills paid this month
        const { data: paidBills } = await supabase
            .from('payment_history')
            .select('amount, paid_date')
            .gte('paid_date', firstDayOfMonth.toISOString().split('T')[0])
            .lte('paid_date', lastDayOfMonth.toISOString().split('T')[0]);

        const totalPaid = paidBills?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        const billsPaidCount = paidBills?.length || 0;

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '📈 Month Summary',
                body: `You paid ${billsPaidCount} bills this month totaling $${totalPaid.toFixed(
                    2
                )}. Great job staying on top of your finances! 💪`,
                data: {
                    type: 'month_summary',
                    totalPaid,
                    billsPaidCount,
                },
            },
            trigger: {
                date: summaryDate,
            },
        });

        console.log('Month-end summary scheduled for', summaryDate);
    } catch (error) {
        console.error('Error scheduling month-end summary:', error);
    }
}

/**
 * Reschedule all smart notifications for a user
 */
export async function rescheduleAllSmartNotifications(userId: string): Promise<void> {
    try {
        // Cancel all existing scheduled notifications
        await Notifications.cancelAllScheduledNotificationsAsync();

        // Get all pending bills
        const { data: bills } = await supabase
            .from('bills')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'pending')
            .gte('due_date', new Date().toISOString().split('T')[0]);

        if (!bills) return;

        // Schedule smart notifications for each bill
        for (const bill of bills) {
            const reminderDays = bill.reminder_days_before || [7, 3, 1];
            for (const days of reminderDays) {
                await scheduleSmartNotification(bill, days, userId);
            }
        }

        // Schedule weekly summary
        await scheduleWeeklySummary(userId);

        // Schedule month-end summary
        await scheduleMonthEndSummary(userId);

        console.log(`Scheduled smart notifications for ${bills.length} bills`);
    } catch (error) {
        console.error('Error rescheduling smart notifications:', error);
    }
}

