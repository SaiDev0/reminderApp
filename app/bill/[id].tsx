import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Linking,
    Dimensions,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Bill, PaymentHistory, BillAttachment } from '../../lib/types';
import { format, parseISO, differenceInDays, isPast, isToday } from 'date-fns';
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

const { width } = Dimensions.get('window');
const CARD_MARGIN = 16;

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
                { text: 'Take Photo', onPress: handleTakePhoto },
                { text: 'Choose from Gallery', onPress: handlePickImage },
                { text: 'Choose Document', onPress: handlePickDocument },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleTakePhoto = async () => {
        const photo = await takePhoto();
        if (photo) await uploadFile(photo);
    };

    const handlePickImage = async () => {
        const image = await pickImage();
        if (image) await uploadFile(image);
    };

    const handlePickDocument = async () => {
        const doc = await pickDocument();
        if (doc) await uploadFile(doc);
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
                Alert.alert('✅ Success', 'Attachment uploaded!');
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
                            Alert.alert('✅ Deleted', 'Attachment removed');
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
            `Confirm payment for "${bill.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark Paid',
                    onPress: async () => {
                        try {
                            const { error: historyError } = await supabase
                                .from('payment_history')
                                .insert({
                                    bill_id: bill.id,
                                    paid_date: new Date().toISOString().split('T')[0],
                                    amount: bill.amount,
                                });

                            if (historyError) throw historyError;

                            const { error: billError } = await supabase
                                .from('bills')
                                .update({ status: 'paid' })
                                .eq('id', bill.id);

                            if (billError) throw billError;

                            if (bill.frequency !== 'once') {
                                const nextDueDate = calculateNextDueDate(bill.due_date, bill.frequency);
                                await supabase
                                    .from('bills')
                                    .update({
                                        due_date: nextDueDate,
                                        status: 'pending',
                                    })
                                    .eq('id', bill.id);
                            }

                            Alert.alert('✅ Success', 'Bill marked as paid!', [
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
            case 'weekly': date.setDate(date.getDate() + 7); break;
            case 'bi-weekly': date.setDate(date.getDate() + 14); break;
            case 'monthly': date.setMonth(date.getMonth() + 1); break;
            case 'bi-monthly': date.setMonth(date.getMonth() + 2); break;
            case 'quarterly': date.setMonth(date.getMonth() + 3); break;
            case 'semi-annually': date.setMonth(date.getMonth() + 6); break;
            case 'yearly': date.setFullYear(date.getFullYear() + 1); break;
        }
        return date.toISOString().split('T')[0];
    };

    const handleExportToCalendar = async () => {
        if (!bill) return;

        const isRecurring = bill.frequency !== 'once';
        const result = isRecurring
            ? await createRecurringBillEvent(bill)
            : await exportBillToCalendar(bill);

        if (result) {
            Alert.alert('✅ Exported', 'Bill added to calendar!');
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Bill',
            `Are you sure you want to delete "${bill?.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await supabase.from('bills').delete().eq('id', id);
                            Alert.alert('✅ Deleted', 'Bill removed', [
                                { text: 'OK', onPress: () => router.back() },
                            ]);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete bill');
                        }
                    },
                },
            ]
        );
    };

    const getCategoryInfo = (category: string) => {
        return (Colors.category as any)[category] || Colors.category.other;
    };

    const getCategoryIcon = (category: string) => {
        const icons: any = {
            utilities: 'flash',
            subscriptions: 'tv',
            insurance: 'shield',
            rent: 'home',
            loans: 'card',
            credit_card: 'card-outline',
            other: 'ellipsis-horizontal',
        };
        return icons[category] || 'document';
    };

    const getStatusInfo = () => {
        if (!bill) return null;
        const dueDate = parseISO(bill.due_date);
        const daysUntil = differenceInDays(dueDate, new Date());

        if (bill.status === 'paid') {
            return { color: Colors.status.paid.color, bg: Colors.status.paid.bg, text: 'Paid', icon: 'checkmark-circle' };
        }
        if (isPast(dueDate)) {
            return { color: Colors.status.overdue.color, bg: Colors.status.overdue.bg, text: 'Overdue', icon: 'alert-circle' };
        }
        if (isToday(dueDate)) {
            return { color: Colors.status.due_today.color, bg: Colors.status.due_today.bg, text: 'Due Today', icon: 'time' };
        }
        if (daysUntil <= 7) {
            return { color: Colors.status.due_soon.color, bg: Colors.status.due_soon.bg, text: `Due in ${daysUntil}d`, icon: 'calendar' };
        }
        return { color: Colors.status.pending.color, bg: Colors.status.pending.bg, text: `Due in ${daysUntil}d`, icon: 'calendar-outline' };
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!bill) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>Bill not found</Text>
            </View>
        );
    }

    const categoryInfo = getCategoryInfo(bill.category);
    const statusInfo = getStatusInfo();
    const categoryIcon = getCategoryIcon(bill.category);

    return (
        <View style={styles.container}>
            {/* Hero Section */}
            <LinearGradient
                colors={categoryInfo.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroSection}
            >
                <View style={styles.heroTop}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => router.push(`/bill/add?id=${bill.id}`)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="create-outline" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <View style={styles.heroContent}>
                    <View style={styles.categoryIconLarge}>
                        <Ionicons name={categoryIcon as any} size={48} color="white" />
                    </View>
                    <Text style={styles.billNameLarge}>{bill.name}</Text>
                    <Text style={styles.categoryLabel}>{bill.category.replace('_', ' ').toUpperCase()}</Text>
                    <Text style={styles.amountLarge}>${parseFloat(bill.amount.toString()).toFixed(2)}</Text>
                </View>

                <View style={styles.heroBottom}>
                    {statusInfo && (
                        <View style={[styles.statusPill, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                            <Ionicons name={statusInfo.icon as any} size={16} color="white" />
                            <Text style={styles.statusPillText}>{statusInfo.text}</Text>
                        </View>
                    )}
                    <View style={styles.datePill}>
                        <Ionicons name="calendar-outline" size={16} color="white" />
                        <Text style={styles.datePillText}>{format(parseISO(bill.due_date), 'MMM d, yyyy')}</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Action Buttons */}
                {bill.status !== 'paid' && (
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={styles.primaryActionButton}
                            onPress={handleMarkAsPaid}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={Colors.gradient.success}
                                style={styles.actionButtonGradient}
                            >
                                <Ionicons name="checkmark-circle" size={24} color="white" />
                                <Text style={styles.actionButtonText}>Mark as Paid</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Details Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Bill Details</Text>

                    <View style={styles.detailRow}>
                        <View style={styles.detailLeft}>
                            <Ionicons name="repeat" size={20} color={Colors.text.secondary} />
                            <Text style={styles.detailLabel}>Frequency</Text>
                        </View>
                        <Text style={styles.detailValue}>
                            {bill.frequency === 'once' ? 'One-time' : bill.frequency.replace('_', ' ')}
                        </Text>
                    </View>

                    {bill.auto_pay && (
                        <View style={styles.detailRow}>
                            <View style={styles.detailLeft}>
                                <Ionicons name="flash" size={20} color={Colors.warning} />
                                <Text style={styles.detailLabel}>Auto-Pay</Text>
                            </View>
                            <Text style={[styles.detailValue, { color: Colors.warning }]}>Enabled</Text>
                        </View>
                    )}

                    {bill.notes && (
                        <View style={styles.notesSection}>
                            <View style={styles.detailLeft}>
                                <Ionicons name="document-text-outline" size={20} color={Colors.text.secondary} />
                                <Text style={styles.detailLabel}>Notes</Text>
                            </View>
                            <Text style={styles.notesText}>{bill.notes}</Text>
                        </View>
                    )}
                </View>

                {/* Attachments Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Attachments ({attachments.length})</Text>
                        <TouchableOpacity
                            onPress={handleAddAttachment}
                            disabled={uploading}
                            activeOpacity={0.7}
                        >
                            {uploading ? (
                                <ActivityIndicator size="small" color={Colors.primary} />
                            ) : (
                                <Ionicons name="add-circle" size={28} color={Colors.primary} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {attachments.length === 0 ? (
                        <View style={styles.emptyAttachments}>
                            <Ionicons name="attach" size={32} color={Colors.text.light} />
                            <Text style={styles.emptyText}>No attachments yet</Text>
                            <Text style={styles.emptySubtext}>Add photos or documents</Text>
                        </View>
                    ) : (
                        <View style={styles.attachmentsList}>
                            {attachments.map((attachment) => (
                                <TouchableOpacity
                                    key={attachment.id}
                                    style={styles.attachmentItem}
                                    onPress={() => handleViewAttachment(attachment)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.attachmentIcon}>
                                        <Ionicons
                                            name={getFileIcon(attachment.file_type)}
                                            size={24}
                                            color={Colors.primary}
                                        />
                                    </View>
                                    <View style={styles.attachmentInfo}>
                                        <Text style={styles.attachmentName} numberOfLines={1}>
                                            {attachment.file_name}
                                        </Text>
                                        <Text style={styles.attachmentSize}>
                                            {formatFileSize(attachment.file_size)}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleDeleteAttachment(attachment)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Payment History */}
                {history.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Payment History ({history.length})</Text>
                        {history.slice(0, 5).map((payment, index) => (
                            <View key={payment.id} style={styles.historyItem}>
                                <View style={styles.historyLeft}>
                                    <View style={styles.historyIcon}>
                                        <Ionicons name="checkmark" size={16} color={Colors.success} />
                                    </View>
                                    <View>
                                        <Text style={styles.historyAmount}>
                                            ${parseFloat(payment.amount.toString()).toFixed(2)}
                                        </Text>
                                        <Text style={styles.historyDate}>
                                            {format(parseISO(payment.paid_date), 'MMM d, yyyy')}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={Colors.text.light} />
                            </View>
                        ))}
                    </View>
                )}

                {/* Quick Actions */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Quick Actions</Text>
                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={handleExportToCalendar}
                        activeOpacity={0.8}
                    >
                        <View style={styles.quickActionLeft}>
                            <View style={[styles.quickActionIcon, { backgroundColor: Colors.info + '20' }]}>
                                <Ionicons name="calendar" size={20} color={Colors.info} />
                            </View>
                            <Text style={styles.quickActionText}>Export to Calendar</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.text.light} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={handleDelete}
                        activeOpacity={0.8}
                    >
                        <View style={styles.quickActionLeft}>
                            <View style={[styles.quickActionIcon, { backgroundColor: Colors.danger + '20' }]}>
                                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                            </View>
                            <Text style={[styles.quickActionText, { color: Colors.danger }]}>Delete Bill</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.danger} />
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
    errorText: {
        fontSize: 16,
        color: Colors.text.secondary,
    },
    heroSection: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 32,
        paddingHorizontal: CARD_MARGIN,
    },
    heroTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroContent: {
        alignItems: 'center',
    },
    categoryIconLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    billNameLarge: {
        fontSize: 28,
        fontWeight: '800',
        color: 'white',
        textAlign: 'center',
        marginBottom: 6,
    },
    categoryLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.8)',
        letterSpacing: 1.2,
        marginBottom: 12,
    },
    amountLarge: {
        fontSize: 48,
        fontWeight: '800',
        color: 'white',
        marginBottom: 16,
    },
    heroBottom: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 6,
    },
    statusPillText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'white',
    },
    datePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.25)',
        gap: 6,
    },
    datePillText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'white',
    },
    scrollContent: {
        flex: 1,
    },
    actionButtonsContainer: {
        paddingHorizontal: CARD_MARGIN,
        paddingTop: 20,
        paddingBottom: 8,
    },
    primaryActionButton: {
        borderRadius: 16,
        overflow: 'hidden',
        ...Colors.shadow.md,
    },
    actionButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
    },
    actionButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white',
    },
    card: {
        backgroundColor: Colors.card,
        marginHorizontal: CARD_MARGIN,
        marginTop: 16,
        borderRadius: 20,
        padding: 20,
        ...Colors.shadow.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text.primary,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.background,
    },
    detailLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    detailLabel: {
        fontSize: 16,
        color: Colors.text.secondary,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.primary,
        textTransform: 'capitalize',
    },
    notesSection: {
        paddingTop: 12,
    },
    notesText: {
        fontSize: 15,
        color: Colors.text.primary,
        lineHeight: 22,
        marginTop: 8,
    },
    emptyAttachments: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.secondary,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.text.light,
        marginTop: 4,
    },
    attachmentsList: {
        gap: 12,
    },
    attachmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: Colors.background,
        borderRadius: 12,
        gap: 12,
    },
    attachmentIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    attachmentInfo: {
        flex: 1,
    },
    attachmentName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: 4,
    },
    attachmentSize: {
        fontSize: 13,
        color: Colors.text.secondary,
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.background,
    },
    historyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    historyIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.success + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyAmount: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: 2,
    },
    historyDate: {
        fontSize: 13,
        color: Colors.text.secondary,
    },
    quickAction: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: Colors.background,
    },
    quickActionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    quickActionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickActionText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.primary,
    },
});

