import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Platform,
    Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { BillFrequency, BillCategory } from '../../lib/types';

export default function AddBillScreen() {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [frequency, setFrequency] = useState<BillFrequency>('monthly');
    const [category, setCategory] = useState<BillCategory>('other');
    const [notes, setNotes] = useState('');
    const [autoPay, setAutoPay] = useState(false);
    const [reminderDays, setReminderDays] = useState([7, 3, 1]);
    const [customDayOfMonth, setCustomDayOfMonth] = useState<string>('');
    const [saving, setSaving] = useState(false);

    const frequencies: { value: BillFrequency; label: string }[] = [
        { value: 'once', label: 'One-time' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'bi-weekly', label: 'Bi-weekly (Every 2 weeks)' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'bi-monthly', label: 'Bi-monthly (Every 2 months)' },
        { value: 'quarterly', label: 'Quarterly (Every 3 months)' },
        { value: 'semi-annually', label: 'Semi-annually (Every 6 months)' },
        { value: 'yearly', label: 'Yearly' },
    ];

    const categories: BillCategory[] = [
        'utilities', 'subscriptions', 'insurance', 'rent', 'loans', 'credit_card', 'other'
    ];

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a bill name');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        setSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                Alert.alert('Error', 'You must be logged in');
                router.replace('/auth/login');
                return;
            }

            const dayOfMonth = customDayOfMonth ? parseInt(customDayOfMonth) : undefined;

            const { error } = await supabase.from('bills').insert({
                user_id: user.id,
                name: name.trim(),
                amount: parseFloat(amount),
                due_date: dueDate.toISOString().split('T')[0],
                frequency,
                category,
                notes: notes.trim() || null,
                auto_pay: autoPay,
                reminder_days_before: reminderDays,
                custom_day_of_month: dayOfMonth,
                status: 'pending',
            });

            if (error) throw error;

            Alert.alert('Success', 'Bill added successfully', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error) {
            console.error('Error saving bill:', error);
            Alert.alert('Error', 'Failed to save bill');
        } finally {
            setSaving(false);
        }
    };

    const toggleReminderDay = (day: number) => {
        if (reminderDays.includes(day)) {
            setReminderDays(reminderDays.filter(d => d !== day));
        } else {
            setReminderDays([...reminderDays, day].sort((a, b) => b - a));
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Bill Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Electric Bill"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Amount *</Text>
                    <View style={styles.amountInput}>
                        <Text style={styles.currency}>$</Text>
                        <TextInput
                            style={[styles.input, styles.amountField]}
                            placeholder="0.00"
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Due Date *</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Ionicons name="calendar" size={20} color="#007AFF" />
                        <Text style={styles.dateText}>
                            {dueDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={dueDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(Platform.OS === 'ios');
                                if (selectedDate) {
                                    setDueDate(selectedDate);
                                }
                            }}
                            minimumDate={new Date()}
                        />
                    )}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Frequency</Text>
                    <View style={styles.chipContainer}>
                        {frequencies.map((freq) => (
                            <TouchableOpacity
                                key={freq.value}
                                style={[
                                    styles.chip,
                                    frequency === freq.value && styles.chipActive,
                                ]}
                                onPress={() => setFrequency(freq.value)}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        frequency === freq.value && styles.chipTextActive,
                                    ]}
                                >
                                    {freq.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Custom Day of Month - optional field for recurring bills */}
                {frequency !== 'once' && frequency !== 'weekly' && frequency !== 'bi-weekly' && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Specific Day of Month (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., 1, 15, or -1 for last day"
                            value={customDayOfMonth}
                            onChangeText={setCustomDayOfMonth}
                            keyboardType="numeric"
                        />
                        <Text style={styles.helpText}>
                            Leave empty to use the current due date day. Use -1 for last day of month.
                        </Text>
                    </View>
                )}

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.chipContainer}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.chip,
                                    category === cat && styles.chipActive,
                                ]}
                                onPress={() => setCategory(cat)}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        category === cat && styles.chipTextActive,
                                    ]}
                                >
                                    {cat.replace('_', ' ')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Remind me before</Text>
                    <View style={styles.chipContainer}>
                        {[14, 7, 3, 1].map((day) => (
                            <TouchableOpacity
                                key={day}
                                style={[
                                    styles.chip,
                                    reminderDays.includes(day) && styles.chipActive,
                                ]}
                                onPress={() => toggleReminderDay(day)}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        reminderDays.includes(day) && styles.chipTextActive,
                                    ]}
                                >
                                    {day} day{day > 1 ? 's' : ''}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <TouchableOpacity
                        style={styles.switchRow}
                        onPress={() => setAutoPay(!autoPay)}
                    >
                        <View style={styles.switchInfo}>
                            <Text style={styles.label}>Auto-pay enabled</Text>
                            <Text style={styles.switchDescription}>
                                This bill is automatically paid
                            </Text>
                        </View>
                        <View style={[styles.checkbox, autoPay && styles.checkboxActive]}>
                            {autoPay && <Ionicons name="checkmark" size={20} color="#fff" />}
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Notes (Optional)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Add any additional notes..."
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    <Text style={styles.saveButtonText}>
                        {saving ? 'Saving...' : 'Save Bill'}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    form: {
        padding: 16,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    amountInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingLeft: 12,
    },
    currency: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginRight: 8,
    },
    amountField: {
        flex: 1,
        borderWidth: 0,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
    },
    dateText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#333',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 4,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        marginRight: 8,
        marginBottom: 8,
    },
    chipActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    chipText: {
        fontSize: 14,
        color: '#666',
        textTransform: 'capitalize',
    },
    chipTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    switchInfo: {
        flex: 1,
    },
    switchDescription: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#ddd',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    textArea: {
        minHeight: 100,
    },
    helpText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        fontStyle: 'italic',
    },
    saveButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    saveButtonDisabled: {
        backgroundColor: '#ccc',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});

