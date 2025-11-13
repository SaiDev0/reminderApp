import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { supabase } from '../../lib/supabase';
import {
    isBiometricSupported,
    isBiometricEnabled,
    setBiometricEnabled,
    isAppLockEnabled,
    setAppLockEnabled,
    setupBiometricAuth,
    getBiometricName,
} from '../../lib/biometric';
import { rescheduleAllSmartNotifications } from '../../lib/smartNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';

const CARD_MARGIN = 16;

export default function SettingsScreen() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [pushToken, setPushToken] = useState<string | null>(null);
    const [biometricSupported, setBiometricSupported] = useState(false);
    const [biometricEnabled, setBiometricEnabledState] = useState(false);
    const [appLockEnabled, setAppLockEnabledState] = useState(false);
    const [biometricTypes, setBiometricTypes] = useState<string[]>([]);
    const [smartNotificationsEnabled, setSmartNotificationsEnabled] = useState(true);
    const [weeklySummaryEnabled, setWeeklySummaryEnabled] = useState(true);
    const [monthSummaryEnabled, setMonthSummaryEnabled] = useState(true);

    useEffect(() => {
        loadSettings();
        registerForPushNotifications();
        checkBiometricSupport();
        loadSmartNotificationSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
                setUser(currentUser);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSmartNotificationSettings = async () => {
        try {
            const smart = await AsyncStorage.getItem('@smart_notifications_enabled');
            const weekly = await AsyncStorage.getItem('@weekly_summary_enabled');
            const monthly = await AsyncStorage.getItem('@month_summary_enabled');

            setSmartNotificationsEnabled(smart !== 'false');
            setWeeklySummaryEnabled(weekly !== 'false');
            setMonthSummaryEnabled(monthly !== 'false');
        } catch (error) {
            console.error('Error loading smart notification settings:', error);
        }
    };

    const registerForPushNotifications = async () => {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                return;
            }

            const token = await Notifications.getExpoPushTokenAsync();
            setPushToken(token.data);
        } catch (error) {
            console.error('Error registering for push notifications:', error);
        }
    };

    const checkBiometricSupport = async () => {
        try {
            const { supported, enrolled, types } = await setupBiometricAuth();
            setBiometricSupported(supported && enrolled);
            setBiometricTypes(types);

            if (supported && enrolled) {
                const enabled = await isBiometricEnabled();
                setBiometricEnabledState(enabled);

                const lockEnabled = await isAppLockEnabled();
                setAppLockEnabledState(lockEnabled);
            }
        } catch (error) {
            console.error('Error checking biometric support:', error);
        }
    };

    const handleBiometricToggle = async (value: boolean) => {
        try {
            await setBiometricEnabled(value);
            setBiometricEnabledState(value);
            Alert.alert('✅ Updated', `Biometric authentication ${value ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling biometric:', error);
            Alert.alert('Error', 'Failed to update biometric settings');
        }
    };

    const handleAppLockToggle = async (value: boolean) => {
        try {
            await setAppLockEnabled(value);
            setAppLockEnabledState(value);
            Alert.alert('✅ Updated', `App lock ${value ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling app lock:', error);
            Alert.alert('Error', 'Failed to update app lock settings');
        }
    };

    const handleSmartNotificationsToggle = async (value: boolean) => {
        try {
            await AsyncStorage.setItem('@smart_notifications_enabled', value.toString());
            setSmartNotificationsEnabled(value);
            if (user) {
                await rescheduleAllSmartNotifications(user.id);
            }
            Alert.alert('✅ Updated', `Smart notifications ${value ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling smart notifications:', error);
            Alert.alert('Error', 'Failed to update notification settings');
        }
    };

    const handleWeeklySummaryToggle = async (value: boolean) => {
        try {
            await AsyncStorage.setItem('@weekly_summary_enabled', value.toString());
            setWeeklySummaryEnabled(value);
            if (user) {
                await rescheduleAllSmartNotifications(user.id);
            }
        } catch (error) {
            console.error('Error toggling weekly summary:', error);
        }
    };

    const handleMonthSummaryToggle = async (value: boolean) => {
        try {
            await AsyncStorage.setItem('@month_summary_enabled', value.toString());
            setMonthSummaryEnabled(value);
            if (user) {
                await rescheduleAllSmartNotifications(user.id);
            }
        } catch (error) {
            console.error('Error toggling month summary:', error);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await supabase.auth.signOut();
                            router.replace('/auth/login');
                        } catch (error) {
                            console.error('Error logging out:', error);
                            Alert.alert('Error', 'Failed to log out');
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <LinearGradient
                    colors={Colors.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.profileHeader}
                >
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person" size={48} color="white" />
                    </View>
                    <Text style={styles.userEmail}>{user?.email || 'User'}</Text>
                    <Text style={styles.userSubtext}>Manage your account settings</Text>
                </LinearGradient>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Access</Text>
                    <View style={styles.quickActionsGrid}>
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push('/budget')}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={Colors.gradient.ocean}
                                style={styles.quickActionIcon}
                            >
                                <Ionicons name="wallet" size={28} color="white" />
                            </LinearGradient>
                            <Text style={styles.quickActionText}>Budget</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push('/achievements')}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={Colors.gradient.sunset}
                                style={styles.quickActionIcon}
                            >
                                <Ionicons name="trophy" size={28} color="white" />
                            </LinearGradient>
                            <Text style={styles.quickActionText}>Achievements</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Security */}
                {biometricSupported && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Security</Text>
                        <View style={styles.settingsCard}>
                            <View style={styles.settingItem}>
                                <View style={styles.settingLeft}>
                                    <View style={[styles.settingIcon, { backgroundColor: Colors.primary + '20' }]}>
                                        <Ionicons name="finger-print" size={22} color={Colors.primary} />
                                    </View>
                                    <View style={styles.settingInfo}>
                                        <Text style={styles.settingTitle}>Biometric Authentication</Text>
                                        <Text style={styles.settingDescription}>
                                            Use {biometricTypes.join(' or ')} to log in
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={biometricEnabled}
                                    onValueChange={handleBiometricToggle}
                                    trackColor={{ false: Colors.background, true: Colors.primary + '50' }}
                                    thumbColor={biometricEnabled ? Colors.primary : Colors.text.light}
                                />
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.settingItem}>
                                <View style={styles.settingLeft}>
                                    <View style={[styles.settingIcon, { backgroundColor: Colors.warning + '20' }]}>
                                        <Ionicons name="lock-closed" size={22} color={Colors.warning} />
                                    </View>
                                    <View style={styles.settingInfo}>
                                        <Text style={styles.settingTitle}>App Lock</Text>
                                        <Text style={styles.settingDescription}>
                                            Require authentication on app launch
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={appLockEnabled}
                                    onValueChange={handleAppLockToggle}
                                    trackColor={{ false: Colors.background, true: Colors.warning + '50' }}
                                    thumbColor={appLockEnabled ? Colors.warning : Colors.text.light}
                                />
                            </View>
                        </View>
                    </View>
                )}

                {/* Notifications */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>
                    <View style={styles.settingsCard}>
                        <View style={styles.settingItem}>
                            <View style={styles.settingLeft}>
                                <View style={[styles.settingIcon, { backgroundColor: Colors.info + '20' }]}>
                                    <Ionicons name="notifications" size={22} color={Colors.info} />
                                </View>
                                <View style={styles.settingInfo}>
                                    <Text style={styles.settingTitle}>Smart Notifications</Text>
                                    <Text style={styles.settingDescription}>
                                        Contextual bill reminders
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={smartNotificationsEnabled}
                                onValueChange={handleSmartNotificationsToggle}
                                trackColor={{ false: Colors.background, true: Colors.info + '50' }}
                                thumbColor={smartNotificationsEnabled ? Colors.info : Colors.text.light}
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.settingItem}>
                            <View style={styles.settingLeft}>
                                <View style={[styles.settingIcon, { backgroundColor: Colors.success + '20' }]}>
                                    <Ionicons name="calendar" size={22} color={Colors.success} />
                                </View>
                                <View style={styles.settingInfo}>
                                    <Text style={styles.settingTitle}>Weekly Summary</Text>
                                    <Text style={styles.settingDescription}>
                                        Monday morning recap
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={weeklySummaryEnabled}
                                onValueChange={handleWeeklySummaryToggle}
                                trackColor={{ false: Colors.background, true: Colors.success + '50' }}
                                thumbColor={weeklySummaryEnabled ? Colors.success : Colors.text.light}
                                disabled={!smartNotificationsEnabled}
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.settingItem}>
                            <View style={styles.settingLeft}>
                                <View style={[styles.settingIcon, { backgroundColor: Colors.accent + '20' }]}>
                                    <Ionicons name="stats-chart" size={22} color={Colors.accent} />
                                </View>
                                <View style={styles.settingInfo}>
                                    <Text style={styles.settingTitle}>Month-End Summary</Text>
                                    <Text style={styles.settingDescription}>
                                        Monthly spending recap
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={monthSummaryEnabled}
                                onValueChange={handleMonthSummaryToggle}
                                trackColor={{ false: Colors.background, true: Colors.accent + '50' }}
                                thumbColor={monthSummaryEnabled ? Colors.accent : Colors.text.light}
                                disabled={!smartNotificationsEnabled}
                            />
                        </View>
                    </View>
                </View>

                {/* About */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <View style={styles.settingsCard}>
                        <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
                            <View style={styles.settingLeft}>
                                <View style={[styles.settingIcon, { backgroundColor: Colors.primary + '20' }]}>
                                    <Ionicons name="information-circle" size={22} color={Colors.primary} />
                                </View>
                                <View style={styles.settingInfo}>
                                    <Text style={styles.settingTitle}>App Version</Text>
                                    <Text style={styles.settingDescription}>1.0.0</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Colors.text.light} />
                        </TouchableOpacity>

                        {pushToken && (
                            <>
                                <View style={styles.divider} />
                                <View style={styles.settingItem}>
                                    <View style={styles.settingLeft}>
                                        <View style={[styles.settingIcon, { backgroundColor: Colors.success + '20' }]}>
                                            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                                        </View>
                                        <View style={styles.settingInfo}>
                                            <Text style={styles.settingTitle}>Push Notifications</Text>
                                            <Text style={styles.settingDescription}>Registered</Text>
                                        </View>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Logout */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
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
    // Profile Header
    profileHeader: {
        paddingTop: Platform.OS === 'ios' ? 80 : 60,
        paddingBottom: 40,
        paddingHorizontal: CARD_MARGIN,
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    userEmail: {
        fontSize: 20,
        fontWeight: '700',
        color: 'white',
        marginBottom: 6,
    },
    userSubtext: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
    },
    // Section
    section: {
        paddingHorizontal: CARD_MARGIN,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text.primary,
        marginBottom: 12,
    },
    // Quick Actions
    quickActionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    quickActionCard: {
        flex: 1,
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        ...Colors.shadow.sm,
    },
    quickActionIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    quickActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.primary,
    },
    // Settings Card
    settingsCard: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        ...Colors.shadow.sm,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    settingIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingInfo: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 13,
        color: Colors.text.secondary,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.background,
        marginHorizontal: 16,
    },
    // Logout
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: Colors.danger + '30',
        ...Colors.shadow.sm,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.danger,
    },
});

