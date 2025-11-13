import { supabase } from './supabase';
import { Achievement, UserStats, AchievementDefinition, AchievementType } from './types';
import { Alert } from 'react-native';

/**
 * Achievement definitions with unlock conditions
 */
export const ACHIEVEMENTS: AchievementDefinition[] = [
    {
        type: 'first_bill',
        title: '🎉 First Payment',
        description: 'Pay your first bill',
        icon: '🎉',
        condition: (stats) => stats.total_bills_paid >= 1,
    },
    {
        type: 'streak_7',
        title: '🔥 Week Warrior',
        description: 'Pay 7 bills on time in a row',
        icon: '🔥',
        condition: (stats) => stats.current_streak >= 7,
    },
    {
        type: 'streak_30',
        title: '🌟 Month Master',
        description: 'Maintain a 30-bill streak',
        icon: '🌟',
        condition: (stats) => stats.current_streak >= 30,
    },
    {
        type: 'streak_100',
        title: '👑 Streak King',
        description: 'Achieve 100 consecutive on-time payments',
        icon: '👑',
        condition: (stats) => stats.current_streak >= 100,
    },
    {
        type: 'bills_10',
        title: '💪 Getting Started',
        description: 'Pay 10 bills total',
        icon: '💪',
        condition: (stats) => stats.total_bills_paid >= 10,
    },
    {
        type: 'bills_50',
        title: '⭐ Consistent Payer',
        description: 'Pay 50 bills total',
        icon: '⭐',
        condition: (stats) => stats.total_bills_paid >= 50,
    },
    {
        type: 'bills_100',
        title: '💯 Century Club',
        description: 'Pay 100 bills total',
        icon: '💯',
        condition: (stats) => stats.total_bills_paid >= 100,
    },
    {
        type: 'saved_100',
        title: '💰 Saver',
        description: 'Save $100 by paying early',
        icon: '💰',
        condition: (stats) => stats.total_saved >= 100,
    },
    {
        type: 'saved_500',
        title: '💎 Smart Saver',
        description: 'Save $500 total',
        icon: '💎',
        condition: (stats) => stats.total_saved >= 500,
    },
    {
        type: 'saved_1000',
        title: '🏆 Savings Champion',
        description: 'Save $1000 by avoiding late fees',
        icon: '🏆',
        condition: (stats) => stats.total_saved >= 1000,
    },
    {
        type: 'early_bird',
        title: '🌅 Early Bird',
        description: 'Pay 10 bills at least 7 days early',
        icon: '🌅',
        condition: (stats) => stats.on_time_payments >= 10,
    },
    {
        type: 'perfect_month',
        title: '✨ Perfect Month',
        description: 'Pay all bills on time in a calendar month',
        icon: '✨',
        condition: (stats) => stats.on_time_payments >= 5 && stats.late_payments === 0,
    },
];

/**
 * Get user stats
 */
export async function getUserStats(userId: string): Promise<UserStats | null> {
    try {
        const { data, error } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (!data) {
            // Create initial stats
            const { data: newStats, error: insertError } = await supabase
                .from('user_stats')
                .insert({
                    user_id: userId,
                    current_streak: 0,
                    longest_streak: 0,
                    total_bills_paid: 0,
                    total_amount_paid: 0,
                    on_time_payments: 0,
                    late_payments: 0,
                    total_saved: 0,
                })
                .select()
                .single();

            if (insertError) throw insertError;
            return newStats;
        }

        return data;
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return null;
    }
}

/**
 * Get all unlocked achievements
 */
export async function getUnlockedAchievements(userId: string): Promise<Achievement[]> {
    try {
        const { data, error } = await supabase
            .from('achievements')
            .select('*')
            .eq('user_id', userId)
            .order('unlocked_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching achievements:', error);
        return [];
    }
}

/**
 * Check and unlock achievements
 */
export async function checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
    try {
        const stats = await getUserStats(userId);
        if (!stats) return [];

        const unlocked = await getUnlockedAchievements(userId);
        const unlockedTypes = new Set(unlocked.map(a => a.type));
        const newlyUnlocked: Achievement[] = [];

        // Check each achievement
        for (const achievement of ACHIEVEMENTS) {
            // Skip if already unlocked
            if (unlockedTypes.has(achievement.type)) continue;

            // Check if condition is met
            if (achievement.condition(stats)) {
                const { data, error } = await supabase
                    .from('achievements')
                    .insert({
                        user_id: userId,
                        type: achievement.type,
                        title: achievement.title,
                        description: achievement.description,
                        icon: achievement.icon,
                    })
                    .select()
                    .single();

                if (!error && data) {
                    newlyUnlocked.push(data);
                    // Show celebration
                    showAchievementUnlocked(achievement);
                }
            }
        }

        return newlyUnlocked;
    } catch (error) {
        console.error('Error checking achievements:', error);
        return [];
    }
}

/**
 * Show achievement unlocked alert
 */
function showAchievementUnlocked(achievement: AchievementDefinition) {
    Alert.alert(
        `${achievement.icon} Achievement Unlocked!`,
        `${achievement.title}\n${achievement.description}`,
        [{ text: 'Awesome!', style: 'default' }]
    );
}

/**
 * Get achievement progress for display
 */
export function getAchievementProgress(
    stats: UserStats,
    achievement: AchievementDefinition
): { current: number; target: number; percentage: number } {
    let current = 0;
    let target = 0;

    switch (achievement.type) {
        case 'first_bill':
            current = Math.min(stats.total_bills_paid, 1);
            target = 1;
            break;
        case 'streak_7':
            current = Math.min(stats.current_streak, 7);
            target = 7;
            break;
        case 'streak_30':
            current = Math.min(stats.current_streak, 30);
            target = 30;
            break;
        case 'streak_100':
            current = Math.min(stats.current_streak, 100);
            target = 100;
            break;
        case 'bills_10':
            current = Math.min(stats.total_bills_paid, 10);
            target = 10;
            break;
        case 'bills_50':
            current = Math.min(stats.total_bills_paid, 50);
            target = 50;
            break;
        case 'bills_100':
            current = Math.min(stats.total_bills_paid, 100);
            target = 100;
            break;
        case 'saved_100':
            current = Math.min(stats.total_saved, 100);
            target = 100;
            break;
        case 'saved_500':
            current = Math.min(stats.total_saved, 500);
            target = 500;
            break;
        case 'saved_1000':
            current = Math.min(stats.total_saved, 1000);
            target = 1000;
            break;
        case 'early_bird':
            current = Math.min(stats.on_time_payments, 10);
            target = 10;
            break;
        case 'perfect_month':
            current = stats.late_payments === 0 && stats.on_time_payments >= 5 ? 1 : 0;
            target = 1;
            break;
        default:
            current = 0;
            target = 1;
    }

    const percentage = target > 0 ? Math.round((current / target) * 100) : 0;

    return { current, target, percentage };
}

/**
 * Calculate potential savings (estimated late fees avoided)
 */
export async function calculateTotalSavings(userId: string): Promise<number> {
    try {
        const stats = await getUserStats(userId);
        if (!stats) return 0;

        // Estimate: Average late fee is $25-35, use $30
        const averageLateFee = 30;
        const potentialLateFees = stats.total_bills_paid * averageLateFee;
        const actualLateFees = stats.late_payments * averageLateFee;
        const saved = potentialLateFees - actualLateFees;

        return Math.max(0, saved);
    } catch (error) {
        console.error('Error calculating savings:', error);
        return 0;
    }
}

/**
 * Update savings in user stats
 */
export async function updateSavings(userId: string, amount: number): Promise<void> {
    try {
        const { error } = await supabase.rpc('increment_savings', {
            user_id_param: userId,
            amount_param: amount,
        });

        if (error) throw error;
    } catch (error) {
        console.error('Error updating savings:', error);
    }
}

/**
 * Get leaderboard position (future feature)
 */
export async function getLeaderboardPosition(userId: string): Promise<number> {
    try {
        const { data, error } = await supabase
            .from('user_stats')
            .select('user_id, current_streak')
            .order('current_streak', { ascending: false })
            .limit(100);

        if (error) throw error;

        const position = data?.findIndex(s => s.user_id === userId);
        return position !== undefined ? position + 1 : -1;
    } catch (error) {
        console.error('Error getting leaderboard position:', error);
        return -1;
    }
}

/**
 * Get streak emoji based on streak count
 */
export function getStreakEmoji(streak: number): string {
    if (streak === 0) return '💤';
    if (streak < 7) return '🔥';
    if (streak < 30) return '🔥🔥';
    if (streak < 100) return '🔥🔥🔥';
    return '🔥🔥🔥💯';
}

/**
 * Get streak status message
 */
export function getStreakMessage(streak: number): string {
    if (streak === 0) return "Start your streak by paying bills on time!";
    if (streak === 1) return "Great start! Keep it going!";
    if (streak < 7) return `${streak} in a row! You're on fire!`;
    if (streak < 30) return `${streak} streak! Amazing consistency!`;
    if (streak < 100) return `${streak} payments! You're a legend!`;
    return `${streak} STREAK! 🏆 Absolutely incredible!`;
}

