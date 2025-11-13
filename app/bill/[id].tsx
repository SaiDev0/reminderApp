import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Image,
    Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Bill, PaymentHistory, BillAttachment } from '../../lib/types';
import { format, parseISO } from 'date-fns';
import {
    takePhoto,
    pickImage,
    pickDocument,
    uploadAttachment,
    getBillAttachments,
    getAttachmentUrl,
    deleteAttachment,
    formatFileSize,
    getFileIcon,
} from '../../lib/attachments';
import { exportBillToCalendar, createRecurringBillEvent } from '../../lib/calendar';
import { Colors } from '../../constants/Colors';

export default function BillDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [bill, setBill] = useState<Bill | null>(null);
    const [history, setHistory] = useState<PaymentHistory[]>([]);
    const [attachments, setAttachments] = useState<BillAttachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (id) {
            fetchBillDetails();
        }
    }, [id]);

    const fetchBillDetails = async () => {
        try {
            const { data: billData, error: billError } = await supabase
                .from('bills')
                .select('*')
                .eq('id', id)
                .single();

            if (billError) throw billError;
            setBill(billData);

            const { data: historyData, error: historyError } = await supabase
                .from('payment_history')
                .select('*')
                .eq('bill_id', id)
                .order('paid_date', { ascending: false });

            if (historyError) throw historyError;
            setHistory(historyData || []);

            // Fetch attachments
            const attachmentsData = await getBillAttachments(id);
            setAttachments(attachmentsData);
        } catch (error) {
            console.error('Error fetching bill details:', error);
            Alert.alert('Error', 'Failed to load bill details');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAttachment = () => {
        Alert.alert(
            'Add Attachment',
            'Choose an option',
            [
                {
                    text: 'Take Photo',
                    onPress: handleTakePhoto,
                },
                {
                    text: 'Choose from Library',
                    onPress: handlePickImage,
                },
                {
                    text: 'Choose Document',
                    onPress: handlePickDocument,
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    const handleTakePhoto = async () => {
        const photo = await takePhoto();
        if (photo) {
            await uploadFile(photo);
        }
    };

    const handlePickImage = async () => {
        const image = await pickImage();
        if (image) {
            await uploadFile(image);
        }
    };

    const handlePickDocument = async () => {
        const doc = await pickDocument();
        if (doc) {
            await uploadFile(doc);
        }
    };

    const uploadFile = async (file: any) => {
        if (!id || !bill) return;

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Error', 'You must be logged in');
                return;
            }

            const result = await uploadAttachment(id, file, user.id);

            if (result.success) {
                Alert.alert('Success', 'Attachment uploaded successfully');
                // Refresh attachments
                const updatedAttachments = await getBillAttachments(id);
                setAttachments(updatedAttachments);
            } else {
                Alert.alert('Error', result.error || 'Failed to upload attachment');
            }
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Error', 'Failed to upload attachment');
        } finally {
            setUploading(false);
        }
    };

    const handleViewAttachment = async (attachment: BillAttachment) => {
        try {
            const url = await getAttachmentUrl(attachment.file_path);
            if (url) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Error', 'Failed to load attachment');
            }
        } catch (error) {
            console.error('View attachment error:', error);
            Alert.alert('Error', 'Failed to open attachment');
        }
    };

    const handleDeleteAttachment = (attachment: BillAttachment) => {
        Alert.alert(
            'Delete Attachment',
            `Delete ${attachment.file_name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteAttachment(attachment.id, attachment.file_path);
                        if (success) {
                            setAttachments(attachments.filter(a => a.id !== attachment.id));
                            Alert.alert('Success', 'Attachment deleted');
                        } else {
                            Alert.alert('Error', 'Failed to delete attachment');
                        }
                    },
                },
            ]
        );
    };

    const handleMarkAsPaid = async () => {
        if (!bill) return;

        Alert.alert(
            'Mark as Paid',
            `Mark "${bill.name}" as paid?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark Paid',
                    onPress: async () => {
                        try {
                            // Add to payment history
                            const { error: historyError } = await supabase
                                .from('payment_history')
                                .insert({
                                    bill_id: bill.id,
                                    paid_date: new Date().toISOString().split('T')[0],
                                    amount: bill.amount,
                                });

                            if (historyError) throw historyError;

                            // Update bill status
                            const { error: billError } = await supabase
                                .from('bills')
                                .update({ status: 'paid' })
                                .eq('id', bill.id);

                            if (billError) throw billError;

                            // If recurring, create next bill
                            if (bill.frequency !== 'once') {
                                const nextDueDate = calculateNextDueDate(
                                    bill.due_date,
                                    bill.frequency
                                );

                                const { error: nextBillError } = await supabase
                                    .from('bills')
                                    .update({
                                        due_date: nextDueDate,
                                        status: 'pending',
                                    })
                                    .eq('id', bill.id);

                                if (nextBillError) throw nextBillError;
                            }

                            Alert.alert('Success', 'Bill marked as paid', [
                                { text: 'OK', onPress: () => router.back() },
                            ]);
                        } catch (error) {
                            console.error('Error marking bill as paid:', error);
                            Alert.alert('Error', 'Failed to mark bill as paid');
                        }
                    },
                },
            ]
        );
    };

    const calculateNextDueDate = (currentDate: string, frequency: string): string => {
        const date = new Date(currentDate);

        switch (frequency) {
            case 'weekly':
                date.setDate(date.getDate() + 7);
                break;
            case 'bi-weekly':
                date.setDate(date.getDate() + 14);
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'bi-monthly':
                date.setMonth(date.getMonth() + 2);
                break;
            case 'quarterly':
                date.setMonth(date.getMonth() + 3);
                break;
            case 'semi-annually':
                date.setMonth(date.getMonth() + 6);
                break;
            case 'yearly':
                date.setFullYear(date.getFullYear() + 1);
                break;
        }

        return date.toISOString().split('T')[0];
    };

    const handleExportToCalendar = async () => {
        if (!bill) return;

        Alert.alert(
            'Export to Calendar',
            bill.frequency !== 'once'
                ? 'Would you like to create a recurring calendar event for this bill?'
                : 'Export this bill to your device calendar?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Export',
                    onPress: async () => {
                        try {
                            const success = bill.frequency !== 'once'
                                ? await createRecurringBillEvent(bill)
                                : await exportBillToCalendar(bill);

                            if (success) {
                                Alert.alert(
                                    'Success!',
                                    `"${bill.name}" has been added to your calendar.`
                                );
                            }
                        } catch (error) {
                            console.error('Error exporting to calendar:', error);
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Bill',
            `Are you sure you want to delete "${bill?.name}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('bills')
                                .delete()
                                .eq('id', id);

                            if (error) throw error;

                            Alert.alert('Success', 'Bill deleted successfully', [
                                { text: 'OK', onPress: () => router.back() },
                            ]);
                        } catch (error) {
                            console.error('Error deleting bill:', error);
                            Alert.alert('Error', 'Failed to delete bill');
                        }
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

    if (!bill) {
        return (
            <View style={styles.centered}>
                <Text>Bill not found</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.billName}>{bill.name}</Text>
                    <Text style={styles.billAmount}>${bill.amount}</Text>
                </View>
                <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{bill.category}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Ionicons name="calendar" size={24} color="#007AFF" />
                        <Text style={styles.infoLabel}>Due Date</Text>
                        <Text style={styles.infoValue}>
                            {format(parseISO(bill.due_date), 'MMM dd, yyyy')}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Ionicons name="repeat" size={24} color="#007AFF" />
                        <Text style={styles.infoLabel}>Frequency</Text>
                        <Text style={styles.infoValue}>{bill.frequency}</Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Ionicons
                            name={
                                bill.status === 'paid'
                                    ? 'checkmark-circle'
                                    : bill.status === 'overdue'
                                        ? 'alert-circle'
                                        : 'time'
                            }
                            size={24}
                            color={
                                bill.status === 'paid'
                                    ? '#4CAF50'
                                    : bill.status === 'overdue'
                                        ? '#F44336'
                                        : '#FF9800'
                            }
                        />
                        <Text style={styles.infoLabel}>Status</Text>
                        <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>
                            {bill.status}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Ionicons name="card" size={24} color="#007AFF" />
                        <Text style={styles.infoLabel}>Auto-pay</Text>
                        <Text style={styles.infoValue}>{bill.auto_pay ? 'Yes' : 'No'}</Text>
                    </View>
                </View>
            </View>

            {bill.notes && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    <Text style={styles.notesText}>{bill.notes}</Text>
                </View>
            )}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Reminders</Text>
                <View style={styles.remindersList}>
                    {bill.reminder_days_before.map((days) => (
                        <View key={days} style={styles.reminderItem}>
                            <Ionicons name="notifications" size={20} color="#007AFF" />
                            <Text style={styles.reminderText}>
                                {days} day{days > 1 ? 's' : ''} before due date
                            </Text>
                        </View>
                    ))}
                </View>
            </View>

            {history.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment History</Text>
                    {history.map((payment) => (
                        <View key={payment.id} style={styles.historyItem}>
                            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                            <View style={styles.historyInfo}>
                                <Text style={styles.historyDate}>
                                    {format(parseISO(payment.paid_date), 'MMM dd, yyyy')}
                                </Text>
                                {payment.notes && (
                                    <Text style={styles.historyNotes}>{payment.notes}</Text>
                                )}
                            </View>
                            <Text style={styles.historyAmount}>${payment.amount}</Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.section}>
                <View style={styles.attachmentsHeader}>
                    <Text style={styles.sectionTitle}>Attachments</Text>
                    <TouchableOpacity
                        style={styles.addAttachmentButton}
                        onPress={handleAddAttachment}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                            <>
                                <Ionicons name="add-circle" size={20} color={Colors.primary} />
                                <Text style={styles.addAttachmentText}>Add</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {attachments.length === 0 ? (
                    <View style={styles.emptyAttachments}>
                        <Ionicons name="attach-outline" size={48} color={Colors.text.secondary} />
                        <Text style={styles.emptyAttachmentsText}>No attachments yet</Text>
                        <Text style={styles.emptyAttachmentsSubtext}>
                            Add photos or documents related to this bill
                        </Text>
                    </View>
                ) : (
                    <View style={styles.attachmentsList}>
                        {attachments.map((attachment) => (
                            <TouchableOpacity
                                key={attachment.id}
                                style={styles.attachmentCard}
                                onPress={() => handleViewAttachment(attachment)}
                            >
                                <LinearGradient
                                    colors={attachment.file_type.startsWith('image/') ? Colors.gradient.blue : Colors.gradient.accent}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.attachmentIcon}
                                >
                                    <Ionicons
                                        name={getFileIcon(attachment.file_type) as any}
                                        size={28}
                                        color="white"
                                    />
                                </LinearGradient>
                                <View style={styles.attachmentInfo}>
                                    <Text style={styles.attachmentName} numberOfLines={1}>
                                        {attachment.file_name}
                                    </Text>
                                    <Text style={styles.attachmentSize}>
                                        {formatFileSize(attachment.file_size)}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.deleteAttachmentButton}
                                    onPress={() => handleDeleteAttachment(attachment)}
                                >
                                    <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <View style={styles.actions}>
                {bill.status === 'pending' && (
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleMarkAsPaid}
                    >
                        <Ionicons name="checkmark-circle" size={24} color="#fff" />
                        <Text style={styles.primaryButtonText}>Mark as Paid</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.calendarButton} onPress={handleExportToCalendar}>
                    <Ionicons name="calendar" size={24} color="#007AFF" />
                    <Text style={styles.calendarButtonText}>Export to Calendar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Ionicons name="trash" size={24} color="#F44336" />
                    <Text style={styles.deleteButtonText}>Delete Bill</Text>
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
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: '#007AFF',
        padding: 20,
        paddingTop: 40,
    },
    headerTop: {
        marginBottom: 12,
    },
    billName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    billAmount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    categoryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    section: {
        backgroundColor: '#fff',
        marginTop: 12,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    infoItem: {
        flex: 1,
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        textTransform: 'capitalize',
    },
    notesText: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
    },
    remindersList: {
        gap: 12,
    },
    reminderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    reminderText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#333',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    historyInfo: {
        flex: 1,
        marginLeft: 12,
    },
    historyDate: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    historyNotes: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    historyAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    actions: {
        padding: 20,
        paddingBottom: 40,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
    },
    primaryButtonText: {
        marginLeft: 8,
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    calendarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
    },
    calendarButtonText: {
        marginLeft: 8,
        color: '#007AFF',
        fontSize: 18,
        fontWeight: '600',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#F44336',
    },
    deleteButtonText: {
        marginLeft: 8,
        color: '#F44336',
        fontSize: 18,
        fontWeight: '600',
    },
    attachmentsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    addAttachmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: Colors.background,
    },
    addAttachmentText: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '600',
        marginLeft: 4,
    },
    emptyAttachments: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyAttachmentsText: {
        fontSize: 16,
        color: Colors.text.primary,
        fontWeight: '600',
        marginTop: 12,
    },
    emptyAttachmentsSubtext: {
        fontSize: 14,
        color: Colors.text.secondary,
        marginTop: 4,
        textAlign: 'center',
    },
    attachmentsList: {
        gap: 12,
    },
    attachmentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: 12,
        padding: 12,
        ...Colors.shadow.sm,
    },
    attachmentIcon: {
        width: 56,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    attachmentInfo: {
        flex: 1,
        marginLeft: 12,
    },
    attachmentName: {
        fontSize: 15,
        color: Colors.text.primary,
        fontWeight: '600',
        marginBottom: 4,
    },
    attachmentSize: {
        fontSize: 13,
        color: Colors.text.secondary,
    },
    deleteAttachmentButton: {
        padding: 8,
    },
});

