import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Only warn at runtime, not during build
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
    console.warn('Missing Supabase environment variables. Please check your .env file.');
}

// Storage adapter that works on all platforms
const createStorageAdapter = () => {
    // For web and during build, use a simple in-memory/localStorage adapter
    if (Platform.OS === 'web' || typeof window === 'undefined') {
        return {
            getItem: async (key: string) => {
                if (typeof window === 'undefined') return null; // During SSR/build
                try {
                    return localStorage.getItem(key);
                } catch {
                    return null;
                }
            },
            setItem: async (key: string, value: string) => {
                if (typeof window === 'undefined') return; // During SSR/build
                try {
                    localStorage.setItem(key, value);
                } catch (e) {
                    console.error('Failed to save to localStorage:', e);
                }
            },
            removeItem: async (key: string) => {
                if (typeof window === 'undefined') return; // During SSR/build
                try {
                    localStorage.removeItem(key);
                } catch (e) {
                    console.error('Failed to remove from localStorage:', e);
                }
            },
        };
    }

    // For native (iOS/Android), use AsyncStorage (more secure than SecureStore for this use case)
    return AsyncStorage;
};

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            storage: createStorageAdapter() as any,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: Platform.OS === 'web',
        },
    }
);

