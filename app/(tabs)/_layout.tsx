import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#6C5CE7',
                tabBarInactiveTintColor: '#B2BEC3',
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 0,
                    elevation: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    height: 70 + insets.bottom,
                    paddingTop: 8,
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    position: 'absolute',
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 4,
                    marginBottom: Platform.OS === 'ios' ? 4 : 0,
                },
                tabBarIconStyle: {
                    marginTop: 4,
                },
                headerShown: false, // Hide all headers - screens have their own hero sections
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "home" : "home-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="bills"
                options={{
                    title: 'Bills',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "document-text" : "document-text-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: 'History',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "receipt" : "receipt-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "settings" : "settings-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}

