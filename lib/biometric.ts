import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BIOMETRIC_ENABLED_KEY = '@biometric_enabled';
const BIOMETRIC_LOCK_KEY = '@biometric_lock_enabled';

/**
 * Check if device supports biometric authentication
 */
export async function isBiometricSupported(): Promise<boolean> {
    try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        return compatible;
    } catch (error) {
        console.error('Error checking biometric support:', error);
        return false;
    }
}

/**
 * Check if biometric authentication is enrolled (e.g., fingerprints or face registered)
 */
export async function isBiometricEnrolled(): Promise<boolean> {
    try {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        return enrolled;
    } catch (error) {
        console.error('Error checking biometric enrollment:', error);
        return false;
    }
}

/**
 * Get available biometric types on the device
 */
export async function getAvailableBiometrics(): Promise<string[]> {
    try {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const typeNames = types.map(type => {
            switch (type) {
                case LocalAuthentication.AuthenticationType.FINGERPRINT:
                    return 'Fingerprint';
                case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
                    return 'Face ID / Face Recognition';
                case LocalAuthentication.AuthenticationType.IRIS:
                    return 'Iris Scan';
                default:
                    return 'Biometric';
            }
        });
        return typeNames;
    } catch (error) {
        console.error('Error getting biometric types:', error);
        return [];
    }
}

/**
 * Get friendly name for biometric type based on platform
 */
export function getBiometricName(): string {
    if (Platform.OS === 'ios') {
        return 'Face ID / Touch ID';
    } else if (Platform.OS === 'android') {
        return 'Fingerprint / Face Unlock';
    } else {
        return 'Biometric';
    }
}

/**
 * Authenticate using biometrics
 */
export async function authenticateWithBiometrics(
    promptMessage?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supported = await isBiometricSupported();
        if (!supported) {
            return {
                success: false,
                error: 'Biometric authentication not supported on this device',
            };
        }

        const enrolled = await isBiometricEnrolled();
        if (!enrolled) {
            return {
                success: false,
                error: 'No biometric credentials enrolled. Please set up biometrics in device settings.',
            };
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: promptMessage || 'Authenticate to access Bill Reminder',
            cancelLabel: 'Cancel',
            disableDeviceFallback: false, // Allow PIN/password fallback
            fallbackLabel: 'Use Passcode',
        });

        if (result.success) {
            return { success: true };
        } else {
            return {
                success: false,
                error: result.error || 'Authentication failed',
            };
        }
    } catch (error: any) {
        console.error('Biometric authentication error:', error);
        return {
            success: false,
            error: error.message || 'An error occurred during authentication',
        };
    }
}

/**
 * Check if biometric authentication is enabled in app settings
 */
export async function isBiometricEnabled(): Promise<boolean> {
    try {
        const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
        return enabled === 'true';
    } catch (error) {
        console.error('Error checking biometric enabled status:', error);
        return false;
    }
}

/**
 * Enable or disable biometric authentication in app settings
 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
        await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    } catch (error) {
        console.error('Error setting biometric enabled status:', error);
    }
}

/**
 * Check if app lock (require biometric on launch) is enabled
 */
export async function isAppLockEnabled(): Promise<boolean> {
    try {
        const enabled = await AsyncStorage.getItem(BIOMETRIC_LOCK_KEY);
        return enabled === 'true';
    } catch (error) {
        console.error('Error checking app lock status:', error);
        return false;
    }
}

/**
 * Enable or disable app lock (require biometric on launch)
 */
export async function setAppLockEnabled(enabled: boolean): Promise<void> {
    try {
        await AsyncStorage.setItem(BIOMETRIC_LOCK_KEY, enabled ? 'true' : 'false');
    } catch (error) {
        console.error('Error setting app lock status:', error);
    }
}

/**
 * Setup biometric authentication - checks support and enrollment
 * Returns setup status and any error messages
 */
export async function setupBiometricAuth(): Promise<{
    supported: boolean;
    enrolled: boolean;
    types: string[];
    message?: string;
}> {
    const supported = await isBiometricSupported();

    if (!supported) {
        return {
            supported: false,
            enrolled: false,
            types: [],
            message: 'Your device does not support biometric authentication.',
        };
    }

    const enrolled = await isBiometricEnrolled();

    if (!enrolled) {
        return {
            supported: true,
            enrolled: false,
            types: [],
            message: 'Please set up biometrics (Face ID/Touch ID/Fingerprint) in your device settings first.',
        };
    }

    const types = await getAvailableBiometrics();

    return {
        supported: true,
        enrolled: true,
        types,
        message: `${types.join(' or ')} is available on your device.`,
    };
}

