import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { Alert } from 'react-native';

export interface AttachmentUploadResult {
    success: boolean;
    attachment?: {
        id: string;
        file_name: string;
        file_path: string;
        file_type: string;
        file_size: number;
    };
    error?: string;
}

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<boolean> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert(
            'Permission Needed',
            'Camera permission is required to take photos of bills.'
        );
        return false;
    }
    return true;
}

/**
 * Request media library permissions
 */
export async function requestMediaLibraryPermissions(): Promise<boolean> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert(
            'Permission Needed',
            'Photo library permission is required to select images.'
        );
        return false;
    }
    return true;
}

/**
 * Take a photo with camera
 */
export async function takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8, // Compress to reduce size
        exif: false,
    });

    if (result.canceled) return null;
    return result.assets[0];
}

/**
 * Pick an image from library
 */
export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        exif: false,
    });

    if (result.canceled) return null;
    return result.assets[0];
}

/**
 * Pick a document (PDF, etc)
 */
export async function pickDocument(): Promise<DocumentPicker.DocumentPickerAsset | null> {
    const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
    });

    if (result.canceled) return null;
    return result.assets[0];
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadAttachment(
    billId: string,
    file: ImagePicker.ImagePickerAsset | DocumentPicker.DocumentPickerAsset,
    userId: string
): Promise<AttachmentUploadResult> {
    try {
        // Check file size
        const fileSize = ('size' in file && file.size) || 0;
        if (fileSize > MAX_FILE_SIZE) {
            return {
                success: false,
                error: 'File too large. Maximum size is 10MB.',
            };
        }

        // Read file as base64
        const fileUri = file.uri;
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Get file extension
        const fileName = ('name' in file && file.name) || `attachment_${Date.now()}`;
        const fileExt = fileName.split('.').pop() || 'jpg';

        // Create unique file path
        const filePath = `${userId}/${billId}/${Date.now()}.${fileExt}`;

        // Determine file type
        const fileType = file.mimeType || getFileType(fileExt);

        // Convert base64 to blob
        const base64Data = `data:${fileType};base64,${base64}`;
        const blob = await fetch(base64Data).then(r => r.blob());

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('bill-attachments')
            .upload(filePath, blob, {
                contentType: fileType,
                upsert: false,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return {
                success: false,
                error: uploadError.message || 'Failed to upload file',
            };
        }

        // Save attachment metadata to database
        const { data: attachmentData, error: dbError } = await supabase
            .from('bill_attachments')
            .insert({
                bill_id: billId,
                file_name: fileName,
                file_path: filePath,
                file_type: fileType,
                file_size: fileSize,
            })
            .select()
            .single();

        if (dbError) {
            // Cleanup: delete uploaded file if database insert fails
            await supabase.storage.from('bill-attachments').remove([filePath]);

            console.error('Database error:', dbError);
            return {
                success: false,
                error: 'Failed to save attachment information',
            };
        }

        return {
            success: true,
            attachment: attachmentData,
        };
    } catch (error: any) {
        console.error('Upload attachment error:', error);
        return {
            success: false,
            error: error.message || 'Failed to upload attachment',
        };
    }
}

/**
 * Get all attachments for a bill
 */
export async function getBillAttachments(billId: string) {
    const { data, error } = await supabase
        .from('bill_attachments')
        .select('*')
        .eq('bill_id', billId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching attachments:', error);
        return [];
    }

    return data || [];
}

/**
 * Get signed URL for viewing attachment
 */
export async function getAttachmentUrl(filePath: string): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from('bill-attachments')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
        console.error('Error getting signed URL:', error);
        return null;
    }

    return data.signedUrl;
}

/**
 * Delete an attachment
 */
export async function deleteAttachment(attachmentId: string, filePath: string): Promise<boolean> {
    try {
        // Delete from database
        const { error: dbError } = await supabase
            .from('bill_attachments')
            .delete()
            .eq('id', attachmentId);

        if (dbError) {
            console.error('Database delete error:', dbError);
            return false;
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('bill-attachments')
            .remove([filePath]);

        if (storageError) {
            console.error('Storage delete error:', storageError);
            // Don't return false - file might already be deleted
        }

        return true;
    } catch (error) {
        console.error('Delete attachment error:', error);
        return false;
    }
}

/**
 * Get file type from extension
 */
function getFileType(extension: string): string {
    const ext = extension.toLowerCase();
    const types: { [key: string]: string } = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return types[ext] || 'application/octet-stream';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file icon based on type
 */
export function getFileIcon(fileType: string): string {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType === 'application/pdf') return 'document-text';
    return 'document';
}
