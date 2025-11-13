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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { supabase } from '../../lib/supabase';
import { UserSettings } from '../../lib/types';
import {
    isBiometricSupported,
    isBiometricEnabled,
    setBiometricEnabled,
    isAppLockEnabled,
    setAppLockEnabled,
    authenticateWithBiometrics,
    setupBiometricAuth,
    getBiometricName,
} from '../../lib/biometric';

export default function SettingsScreen() {
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [pushToken, setPushToken] = useState<string | null>(null);
    const [biometricSupported, setBiometricSupported] = useState(false);
    const [biometricEnabled, setBiometricEnabledState] = useState(false);
    const [appLockEnabled, setAppLockEnabledState] = useState(false);
    const [biometricTypes, setBiometricTypes] = useState<string[]>([]);

    useEffect(() => {
        loadSettings();
        registerForPushNotifications();
        checkBiometricSupport();
    }, []);

    const checkBiometricSupport = async () => {
        const setup = await setupBiometricAuth();
        setBiometricSupported(setup.supported && setup.enrolled);
        setBiometricTypes(setup.types);

        if (setup.supported && setup.enrolled) {
            const enabled = await isBiometricEnabled();
            const lockEnabled = await isAppLockEnabled();
            setBiometricEnabledState(enabled);
            setAppLockEnabledState(lockEnabled);
        }
    };

    const loadSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.replace('/auth/login');
                return;
            }

            const { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                setSettings(data);
            } else {
                // Create default settings
                const defaultSettings = {
                    user_id: user.id,
                    email_notifications: true,
                    push_notifications: true,
                    notification_time: '09:00:00',
                    currency: 'USD',
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                };

                const { data: newSettings, error: insertError } = await supabase
                    .from('user_settings')
                    .insert(defaultSettings)
                    .select()
                    .single();

                if (insertError) throw insertError;
                setSettings(newSettings);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            Alert.alert('Error', 'Failed to load settings');
        } finally {
            setLoading(false);
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
                console.log('Notification permissions not granted');
                return;
            }

            // Try to get Expo push token (requires Expo project ID)
            // This is optional - local notifications work without it
            try {
                const token = (await Notifications.getExpoPushTokenAsync()).data;
                setPushToken(token);

                // Save token to database
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase
                        .from('user_settings')
                        .update({ expo_push_token: token })
                        .eq('user_id', user.id);
                }
                console.log('Push token registered successfully');
            } catch (pushTokenError) {
                // Push token registration failed (probably missing Expo project ID)
                // This is OK - local notifications will still work
                console.log('Push token registration skipped (local notifications will still work)');
            }
        } catch (error) {
            console.error('Error with notifications:', error);
            // Don't throw - allow settings screen to load
        }
    };

    const updateSetting = async (key: keyof UserSettings, value: any) => {
        if (!settings) return;

        try {
            const { error } = await supabase
                .from('user_settings')
                .update({ [key]: value })
                .eq('id', settings.id);

            if (error) throw error;

            setSettings({ ...settings, [key]: value });
        } catch (error) {
            console.error('Error updating setting:', error);
            Alert.alert('Error', 'Failed to update setting');
        }
    };

    const handleBiometricToggle = async (value: boolean) => {
        if (value) {
            // Test biometric authentication before enabling
            const result = await authenticateWithBiometrics(
                'Authenticate to enable biometric security'
            );

            if (result.success) {
                await setBiometricEnabled(true);
                setBiometricEnabledState(true);
                Alert.alert('Success', `${getBiometricName()} enabled successfully!`);
            } else {
                Alert.alert('Authentication Failed', result.error || 'Could not authenticate');
            }
        } else {
            await setBiometricEnabled(false);
            setBiometricEnabledState(false);
            // Also disable app lock when disabling biometrics
            await setAppLockEnabled(false);
            setAppLockEnabledState(false);
        }
    };

    const handleAppLockToggle = async (value: boolean) => {
        if (value) {
            // Require biometric to be enabled first
            if (!biometricEnabled) {
                Alert.alert(
                    'Enable Biometric First',
                    `Please enable ${getBiometricName()} before enabling app lock.`
                );
                return;
            }

            // Test biometric authentication before enabling app lock
            const result = await authenticateWithBiometrics(
                'Authenticate to enable app lock'
            );

            if (result.success) {
                await setAppLockEnabled(true);
                setAppLockEnabledState(true);
                Alert.alert(
                    'App Lock Enabled',
                    'The app will now require authentication when you open it.'
                );
            } else {
                Alert.alert('Authentication Failed', result.error || 'Could not authenticate');
            }
        } else {
            await setAppLockEnabled(false);
            setAppLockEnabledState(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.auth.signOut();
                        router.replace('/auth/login');
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notifications</Text>

                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Ionicons name="notifications" size={24} color="#007AFF" />
                        <View style={styles.settingText}>
                            <Text style={styles.settingLabel}>Push Notifications</Text>
                            <Text style={styles.settingDescription}>
                                Get notified about upcoming bills
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={settings?.push_notifications}
                        onValueChange={(value) => updateSetting('push_notifications', value)}
                        trackColor={{ false: '#767577', true: '#81b0ff' }}
                        thumbColor={settings?.push_notifications ? '#007AFF' : '#f4f3f4'}
                    />
                </View>

                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Ionicons name="mail" size={24} color="#007AFF" />
                        <View style={styles.settingText}>
                            <Text style={styles.settingLabel}>Email Notifications</Text>
                            <Text style={styles.settingDescription}>
                                Receive email reminders
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={settings?.email_notifications}
                        onValueChange={(value) => updateSetting('email_notifications', value)}
                        trackColor={{ false: '#767577', true: '#81b0ff' }}
                        thumbColor={settings?.email_notifications ? '#007AFF' : '#f4f3f4'}
                    />
                </View>

                {pushToken && (
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={20} color="#007AFF" />
                        <Text style={styles.infoText}>
                            Push notifications are enabled
                        </Text>
                    </View>
                )}
            </View>

            {/* Security Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Security</Text>

                {biometricSupported ? (
                    <>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Ionicons name="finger-print" size={24} color="#007AFF" />
                                <View style={styles.settingText}>
                                    <Text style={styles.settingLabel}>{getBiometricName()}</Text>
                                    <Text style={styles.settingDescription}>
                                        Secure your app with {biometricTypes.join(' or ')}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={biometricEnabled}
                                onValueChange={handleBiometricToggle}
                                trackColor={{ false: '#767577', true: '#81b0ff' }}
                                thumbColor={biometricEnabled ? '#007AFF' : '#f4f3f4'}
                            />
                        </View>

                        {biometricEnabled && (
                            <View style={styles.settingRow}>
                                <View style={styles.settingInfo}>
                                    <Ionicons name="lock-closed" size={24} color="#007AFF" />
                                    <View style={styles.settingText}>
                                        <Text style={styles.settingLabel}>App Lock</Text>
                                        <Text style={styles.settingDescription}>
                                            Require authentication when opening app
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={appLockEnabled}
                                    onValueChange={handleAppLockToggle}
                                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                                    thumbColor={appLockEnabled ? '#007AFF' : '#f4f3f4'}
                                />
                            </View>
                        )}
                    </>
                ) : (
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={20} color="#999" />
                        <Text style={styles.infoText}>
                            Biometric authentication is not available on this device. Please set up Face ID, Touch ID, or Fingerprint in device settings.
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferences</Text>

                <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => router.push('/budget')}
                >
                    <View style={styles.settingInfo}>
                        <Ionicons name="wallet" size={24} color="#007AFF" />
                        <View style={styles.settingText}>
                            <Text style={styles.settingLabel}>Budget Tracking</Text>
                            <Text style={styles.settingDescription}>
                                Manage monthly spending limits
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Ionicons name="cash" size={24} color="#007AFF" />
                        <View style={styles.settingText}>
                            <Text style={styles.settingLabel}>Currency</Text>
                            <Text style={styles.settingDescription}>
                                {settings?.currency || 'USD'}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Ionicons name="time" size={24} color="#007AFF" />
                        <View style={styles.settingText}>
                            <Text style={styles.settingLabel}>Notification Time</Text>
                            <Text style={styles.settingDescription}>
                                {settings?.notification_time || '09:00 AM'}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>

                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Ionicons name="information-circle" size={24} color="#007AFF" />
                        <View style={styles.settingText}>
                            <Text style={styles.settingLabel}>Version</Text>
                            <Text style={styles.settingDescription}>1.0.0</Text>
                        </View>
                    </View>
                </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out" size={24} color="#F44336" />
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: {
        marginTop: 20,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        textTransform: 'uppercase',
        marginBottom: 12,
        marginTop: 12,
        paddingHorizontal: 4,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingText: {
        marginLeft: 12,
        flex: 1,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 14,
        color: '#666',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        padding: 12,
        borderRadius: 8,
        marginVertical: 12,
    },
    infoText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#007AFF',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        padding: 16,
        marginTop: 20,
        marginBottom: 40,
        marginHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#F44336',
    },
    logoutText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        color: '#F44336',
    },
});

