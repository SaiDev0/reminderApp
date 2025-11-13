export const Colors = {
    primary: '#6C5CE7',
    primaryDark: '#5F3DC4',
    primaryLight: '#A29BFE',

    secondary: '#00B894',
    secondaryDark: '#00A383',

    accent: '#FD79A8',
    accentOrange: '#FF7675',

    background: '#F8F9FA',
    backgroundDark: '#1E1E2E',

    card: '#FFFFFF',
    cardDark: '#2D2D44',

    success: '#00B894',
    warning: '#FDCB6E',
    danger: '#FF7675',
    info: '#74B9FF',

    text: {
        primary: '#2D3436',
        secondary: '#636E72',
        light: '#B2BEC3',
        white: '#FFFFFF',
    },

    gradient: {
        primary: ['#6C5CE7', '#A29BFE'],
        success: ['#00B894', '#55EFC4'],
        danger: ['#FF7675', '#FD79A8'],
        orange: ['#FF9F43', '#FDCB6E'],
        accent: ['#FF9F43', '#FDCB6E'],
        blue: ['#74B9FF', '#A29BFE'],
        purple: ['#A29BFE', '#FD79A8'],
        sunset: ['#FF9F43', '#FD79A8', '#A29BFE'],
        ocean: ['#74B9FF', '#6C5CE7'],
        emerald: ['#00B894', '#00A383', '#008C7A'],
    },

    // Category specific colors for better visual distinction
    category: {
        utilities: {
            color: '#74B9FF',
            gradient: ['#74B9FF', '#5FA5FF'],
            light: '#E3F2FD',
        },
        subscriptions: {
            color: '#A29BFE',
            gradient: ['#A29BFE', '#8B7FE8'],
            light: '#F3E5F5',
        },
        insurance: {
            color: '#FD79A8',
            gradient: ['#FD79A8', '#FE5F8A'],
            light: '#FCE4EC',
        },
        rent: {
            color: '#FF7675',
            gradient: ['#FF7675', '#FF5252'],
            light: '#FFEBEE',
        },
        loans: {
            color: '#FDCB6E',
            gradient: ['#FDCB6E', '#FFB800'],
            light: '#FFF8E1',
        },
        credit_card: {
            color: '#00B894',
            gradient: ['#00B894', '#00A383'],
            light: '#E0F2F1',
        },
        other: {
            color: '#B2BEC3',
            gradient: ['#B2BEC3', '#95A5A6'],
            light: '#ECEFF1',
        },
    },

    // Status colors with semantic meaning
    status: {
        paid: {
            color: '#00B894',
            bg: '#D1F2EB',
            text: '#00695C',
        },
        pending: {
            color: '#FDCB6E',
            bg: '#FFF9E6',
            text: '#F57F17',
        },
        overdue: {
            color: '#FF7675',
            bg: '#FFE6E6',
            text: '#C62828',
        },
        due_today: {
            color: '#FF9F43',
            bg: '#FFF3E0',
            text: '#E65100',
        },
        due_soon: {
            color: '#74B9FF',
            bg: '#E3F2FD',
            text: '#1565C0',
        },
    },

    shadow: {
        xs: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 4,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.16,
            shadowRadius: 16,
            elevation: 8,
        },
        xl: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.20,
            shadowRadius: 24,
            elevation: 12,
        },
        colored: {
            shadowColor: '#6C5CE7',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
        },
    },

    // Glass morphism effect
    glass: {
        background: 'rgba(255, 255, 255, 0.85)',
        backgroundDark: 'rgba(45, 45, 68, 0.85)',
        border: 'rgba(255, 255, 255, 0.3)',
    },
};

