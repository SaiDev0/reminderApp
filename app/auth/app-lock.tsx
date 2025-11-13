import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { authenticateWithBiometrics, getBiometricName } from '../../lib/biometric';
import { Colors } from '../../constants/Colors';

export default function AppLockScreen() {
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    useEffect(() => {
        // Auto-prompt for biometric on mount
        handleAuthenticate();
    }, []);

    const handleAuthenticate = async () => {
        if (isAuthenticating) return;

        setIsAuthenticating(true);
        const result = await authenticateWithBiometrics('Authenticate to access Bill Reminder');
        setIsAuthenticating(false);

        if (result.success) {
            // Authentication successful, navigate to app
            router.replace('/(tabs)');
        } else {
            // Authentication failed
            Alert.alert(
                'Authentication Failed',
                result.error || 'Could not authenticate. Please try again.',
                [
                    { text: 'Try Again', onPress: handleAuthenticate },
                    { text: 'Exit App', onPress: () => { }, style: 'cancel' },
                ]
            );
        }
    };

    return (
        <LinearGradient colors={Colors.gradient.primary} style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                        style={styles.iconCircle}
                    >
                        <Ionicons name="lock-closed" size={64} color="white" />
                    </LinearGradient>
                </View>

                <Text style={styles.title}>App Locked</Text>
                <Text style={styles.subtitle}>
                    Authenticate with {getBiometricName()} to continue
                </Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleAuthenticate}
                    disabled={isAuthenticating}
                >
                    <LinearGradient
                        colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']}
                        style={styles.buttonGradient}
                    >
                        <Ionicons
                            name="finger-print"
                            size={32}
                            color="white"
                            style={styles.buttonIcon}
                        />
                        <Text style={styles.buttonText}>
                            {isAuthenticating ? 'Authenticating...' : 'Authenticate'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.hint}>
                    This app is protected with biometric authentication
                </Text>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        marginBottom: 40,
    },
    iconCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginBottom: 48,
    },
    button: {
        width: '100%',
        marginBottom: 24,
        overflow: 'hidden',
        borderRadius: 16,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        paddingHorizontal: 32,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
        borderRadius: 16,
    },
    buttonIcon: {
        marginRight: 12,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    hint: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

