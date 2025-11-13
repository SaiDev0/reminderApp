import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { UserStats, Achievement, AchievementDefinition } from '../../lib/types';
import { getUserStats, getUnlockedAchievements } from '../../lib/gamification';
import { Colors } from '../../constants/Colors';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 16;

const allAchievements: AchievementDefinition[] = [
    {
        type: 'first_bill',
        title: 'First Bill Paid!',
        description: 'You paid your very first bill. Great start!',
        icon: 'star',
        condition: (stats: UserStats) => stats.total_bills_paid >= 1,
    },
    {
        type: 'streak_7',
        title: '7-Day Streak',
        description: 'Paid bills on time for 7 consecutive days.',
        icon: 'fire',
        condition: (stats: UserStats) => stats.current_streak >= 7,
    },
    {
        type: 'streak_30',
        title: '30-Day Streak',
        description: 'Paid bills on time for 30 consecutive days. Amazing!',
        icon: 'flame',
        condition: (stats: UserStats) => stats.current_streak >= 30,
    },
    {
        type: 'bills_10',
        title: 'Bill Master I',
        description: 'Paid 10 bills. You are getting the hang of it!',
        icon: 'trophy',
        condition: (stats: UserStats) => stats.total_bills_paid >= 10,
    },
    {
        type: 'bills_50',
        title: 'Bill Master II',
        description: 'Paid 50 bills. You are a pro!',
        icon: 'medal',
        condition: (stats: UserStats) => stats.total_bills_paid >= 50,
    },
    {
        type: 'bills_100',
        title: 'Bill Legend',
        description: 'Paid 100 bills. Legendary status!',
        icon: 'ribbon',
        condition: (stats: UserStats) => stats.total_bills_paid >= 100,
    },
    {
        type: 'perfect_month',
        title: 'Perfect Month',
        description: 'Paid all bills on time for a whole month.',
        icon: 'checkmark-done-circle',
        condition: (stats: UserStats) => stats.on_time_payments >= 10 && stats.late_payments === 0,
    },
    {
        type: 'on_time_warrior',
        title: 'On-Time Warrior',
        description: 'Paid 25 bills on time.',
        icon: 'time',
        condition: (stats: UserStats) => stats.on_time_payments >= 25,
    },
];

export default function AchievementsScreen() {
    const [loading, setLoading] = useState(true);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
    const [userId, setUserId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            fetchGamificationData();
        }, [userId])
    );

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
            } else {
                router.replace('/auth/login');
            }
        };
        fetchUser();
    }, []);

    const fetchGamificationData = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const stats = await getUserStats(userId);
            setUserStats(stats);
            const achievements = await getUnlockedAchievements(userId);
            setUnlockedAchievements(achievements);
        } catch (error) {
            console.error('Error fetching gamification data:', error);
        } finally {
            setLoading(false);
        }
    };

    const isUnlocked = (type: string) => {
        return unlockedAchievements.some(a => a.type === type);
    };

    const getProgress = (achievement: AchievementDefinition) => {
        if (!userStats) return 0;
        return achievement.condition(userStats) ? 100 : 0;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const unlockedCount = unlockedAchievements.length;
    const totalCount = allAchievements.length;
    const completionPercentage = (unlockedCount / totalCount) * 100;

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Your Progress</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Stats Hero Card */}
                {userStats && (
                    <LinearGradient
                        colors={Colors.gradient.sunset}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        {userStats.current_streak > 0 && (
                            <View style={styles.streakBadge}>
                                <Text style={styles.streakEmoji}>🔥</Text>
                                <View>
                                    <Text style={styles.streakValue}>{userStats.current_streak}</Text>
                                    <Text style={styles.streakLabel}>Day Streak</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{userStats.total_bills_paid}</Text>
                                <Text style={styles.statLabel}>Bills Paid</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{userStats.longest_streak}</Text>
                                <Text style={styles.statLabel}>Best Streak</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>${userStats.total_amount_paid.toFixed(0)}</Text>
                                <Text style={styles.statLabel}>Total Paid</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{userStats.on_time_payments}</Text>
                                <Text style={styles.statLabel}>On Time</Text>
                            </View>
                        </View>
                    </LinearGradient>
                )}

                {/* Achievement Progress */}
                <View style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressTitle}>Achievement Progress</Text>
                        <Text style={styles.progressCount}>{unlockedCount}/{totalCount}</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBg}>
                            <LinearGradient
                                colors={Colors.gradient.success}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.progressBarFill, { width: `${completionPercentage}%` }]}
                            />
                        </View>
                    </View>
                    <Text style={styles.progressPercentage}>{completionPercentage.toFixed(0)}% Complete</Text>
                </View>

                {/* Achievements Grid */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Achievements</Text>
                    <View style={styles.achievementsGrid}>
                        {allAchievements.map((achievement) => {
                            const unlocked = isUnlocked(achievement.type);

                            return (
                                <TouchableOpacity
                                    key={achievement.type}
                                    style={[
                                        styles.achievementCard,
                                        unlocked && styles.achievementCardUnlocked
                                    ]}
                                    activeOpacity={0.9}
                                >
                                    {unlocked ? (
                                        <LinearGradient
                                            colors={Colors.gradient.success}
                                            style={styles.achievementIconContainer}
                                        >
                                            <Ionicons name={achievement.icon as any} size={36} color="white" />
                                        </LinearGradient>
                                    ) : (
                                        <View style={styles.achievementIconContainerLocked}>
                                            <Ionicons name={achievement.icon as any} size={36} color={Colors.text.light} />
                                        </View>
                                    )}

                                    <Text style={[
                                        styles.achievementTitle,
                                        unlocked && styles.achievementTitleUnlocked
                                    ]}>
                                        {achievement.title}
                                    </Text>
                                    <Text style={styles.achievementDescription}>
                                        {achievement.description}
                                    </Text>

                                    {unlocked ? (
                                        <View style={styles.unlockedBadge}>
                                            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                                            <Text style={styles.unlockedText}>Unlocked!</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.lockedBadge}>
                                            <Ionicons name="lock-closed" size={14} color={Colors.text.light} />
                                            <Text style={styles.lockedText}>Locked</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: CARD_MARGIN,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 16,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.text.primary,
    },
    // Hero Card
    heroCard: {
        marginHorizontal: CARD_MARGIN,
        marginBottom: 16,
        borderRadius: 24,
        padding: 24,
        ...Colors.shadow.lg,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        marginBottom: 24,
        gap: 12,
    },
    streakEmoji: {
        fontSize: 32,
    },
    streakValue: {
        fontSize: 24,
        fontWeight: '800',
        color: 'white',
    },
    streakLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    statItem: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 28,
        fontWeight: '800',
        color: 'white',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
    },
    // Progress Card
    progressCard: {
        backgroundColor: Colors.card,
        marginHorizontal: CARD_MARGIN,
        marginBottom: 24,
        borderRadius: 20,
        padding: 20,
        ...Colors.shadow.sm,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    progressTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    progressCount: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.secondary,
    },
    progressBarContainer: {
        marginBottom: 12,
    },
    progressBarBg: {
        height: 12,
        backgroundColor: Colors.background,
        borderRadius: 6,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 6,
    },
    progressPercentage: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.secondary,
        textAlign: 'center',
    },
    // Section
    section: {
        paddingHorizontal: CARD_MARGIN,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text.primary,
        marginBottom: 16,
    },
    // Achievements Grid
    achievementsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    achievementCard: {
        width: (width - (CARD_MARGIN * 2) - 12) / 2,
        backgroundColor: Colors.card,
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        ...Colors.shadow.sm,
    },
    achievementCardUnlocked: {
        ...Colors.shadow.md,
    },
    achievementIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        ...Colors.shadow.colored,
    },
    achievementIconContainerLocked: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        marginBottom: 12,
    },
    achievementTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text.secondary,
        textAlign: 'center',
        marginBottom: 6,
    },
    achievementTitleUnlocked: {
        color: Colors.text.primary,
    },
    achievementDescription: {
        fontSize: 12,
        color: Colors.text.secondary,
        textAlign: 'center',
        lineHeight: 16,
        marginBottom: 12,
    },
    unlockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.success + '20',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    unlockedText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.success,
    },
    lockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    lockedText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.text.light,
    },
});

