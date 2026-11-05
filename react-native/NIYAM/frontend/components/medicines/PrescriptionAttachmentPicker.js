import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from '../ui/AppText';
import AppButton from '../ui/AppButton';
import PrescriptionImageViewerModal from './PrescriptionImageViewerModal';

/**
 * Format bytes to human readable format (KB, MB)
 */
export function formatFileSize(bytes) {
  if (!bytes || typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) {
    return null;
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * PrescriptionAttachmentPicker (Phase 11)
 * Modular component for selecting, previewing, inspecting, replacing, and removing
 * prescription documents (Images & PDFs) in the medication form.
 */
export default function PrescriptionAttachmentPicker({
  attachment,
  onAttachmentChange,
  disabled = false,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

  // Helper to extract clean file name from URI or path
  const extractFileName = (uri, fallback = 'Prescription_Document') => {
    if (!uri) return fallback;
    const parts = uri.split('/');
    const last = parts[parts.length - 1];
    return last ? decodeURIComponent(last) : fallback;
  };

  // Option A — Choose Image from Gallery
  const handleChooseImage = async () => {
    if (disabled || isProcessing) return;
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // 1. Check & request Media Library permissions
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage(
          'Photo library permission was denied. Please allow photo access in device settings to attach images.'
        );
        return;
      }

      // 2. Launch system image library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
        base64: false, // Strict requirement: do not convert to Base64
      });

      // 3. Graceful handling of user cancellation
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const rawFileName =
        asset.fileName ||
        extractFileName(asset.uri, `Prescription_${Date.now()}.jpg`);

      // Validate image format
      const isImg =
        !asset.mimeType ||
        asset.mimeType.startsWith('image/') ||
        /\.(jpg|jpeg|png|webp|heic)$/i.test(rawFileName);

      if (!isImg) {
        setErrorMessage('Unsupported file type. Please select a valid JPG, JPEG, or PNG image.');
        return;
      }

      // Validate file size (5 MB limit)
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        setErrorMessage('File size exceeds the 5 MB limit. Please select an image under 5 MB.');
        return;
      }

      // Store attachment metadata locally
      onAttachmentChange({
        uri: asset.uri,
        name: rawFileName,
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || null,
        type: 'image',
        width: asset.width || null,
        height: asset.height || null,
        file: asset.file || null,
        isNew: true,
      });
      setErrorMessage(null);
    } catch (err) {
      console.warn('Prescription image selection error:', err);
      setErrorMessage('Could not open image picker. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Option B — Choose PDF Document
  const handleChoosePdf = async () => {
    if (disabled || isProcessing) return;
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // 1. Launch system document picker for PDF
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      // 2. Graceful handling of user cancellation
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const rawFileName =
        asset.name ||
        extractFileName(asset.uri, `Prescription_${Date.now()}.pdf`);

      // Validate PDF MIME / extension
      const isPdf =
        (asset.mimeType && asset.mimeType.toLowerCase().includes('pdf')) ||
        rawFileName.toLowerCase().endsWith('.pdf');

      if (!isPdf) {
        setErrorMessage('Unsupported file type. Please select a valid PDF document (.pdf).');
        return;
      }

      // Validate file size (5 MB limit)
      if (asset.size && asset.size > 5 * 1024 * 1024) {
        setErrorMessage('File size exceeds the 5 MB limit. Please select a PDF document under 5 MB.');
        return;
      }

      // Store attachment metadata locally
      onAttachmentChange({
        uri: asset.uri,
        name: rawFileName,
        mimeType: asset.mimeType || 'application/pdf',
        size: asset.size || null,
        type: 'pdf',
        file: asset.file || null,
        isNew: true,
      });
      setErrorMessage(null);
    } catch (err) {
      console.warn('Prescription PDF selection error:', err);
      setErrorMessage('Could not open document picker. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Replace attachment flow
  const handleReplaceAttachment = () => {
    Alert.alert(
      'Replace Attachment',
      'Select a new prescription source:',
      [
        {
          text: 'Choose Image (Gallery)',
          onPress: handleChooseImage,
        },
        {
          text: 'Choose PDF Document',
          onPress: handleChoosePdf,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Remove attachment flow
  const handleRemoveAttachment = () => {
    Alert.alert(
      'Remove Attachment',
      'Are you sure you want to remove this prescription document from this medicine?',
      [
        { text: 'Keep Attachment', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onAttachmentChange(null);
            setErrorMessage(null);
          },
        },
      ]
    );
  };

  // Tap handler on document preview
  const handlePreviewPress = () => {
    if (!attachment) return;

    if (attachment.type === 'image') {
      setIsImageViewerVisible(true);
    } else {
      // PDF Document preview handler
      // As per Section 5: "If direct PDF viewing is not supported, show a friendly message rather than pretending the document opened. Do not create a fake PDF viewer."
      const sizeStr = formatFileSize(attachment.size);
      Alert.alert(
        'Prescription PDF Document',
        `File: ${attachment.name}\n${sizeStr ? `Size: ${sizeStr}\n` : ''}Format: PDF Document\n\nDirect in-app PDF rendering is not supported on this platform. This prescription file remains safely attached to your medication record for personal reference.`,
        [{ text: 'Close', style: 'default' }]
      );
    }
  };

  const isImage = attachment?.type === 'image';
  const fileSizeLabel = attachment ? formatFileSize(attachment.size) : null;

  return (
    <View style={styles.container}>
      {/* SECTION HEADER */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.titleIconRow}>
            <Ionicons
              name="document-attach-outline"
              size={18}
              color={Colors.primary}
              style={styles.headerIcon}
            />
            <AppText variant="secondary" color={Colors.textPrimary} style={styles.sectionTitle}>
              Prescription Document
            </AppText>
          </View>
          <AppText variant="caption" color={Colors.textMuted} style={styles.supportingText}>
            Attach a prescription for your personal reference.
          </AppText>
        </View>

        {attachment ? (
          <View style={styles.attachedPill}>
            <View style={styles.attachedDot} />
            <AppText variant="caption" color={Colors.success} style={styles.attachedText}>
              Attached
            </AppText>
          </View>
        ) : (
          <View style={styles.optionalPill}>
            <AppText variant="caption" color={Colors.textMuted} style={styles.optionalText}>
              Optional
            </AppText>
          </View>
        )}
      </View>

      {/* ERROR FEEDBACK BANNER */}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} style={styles.errorIcon} />
          <AppText variant="caption" color={Colors.textPrimary} style={styles.errorBannerText}>
            {errorMessage}
          </AppText>
          <Pressable
            onPress={() => setErrorMessage(null)}
            hitSlop={8}
            style={styles.dismissErrorBtn}
            accessibilityLabel="Dismiss error"
          >
            <Ionicons name="close" size={16} color={Colors.textMuted} />
          </Pressable>
        </View>
      )}

      {/* PROCESSING INDICATOR */}
      {isProcessing && (
        <View style={styles.processingCard}>
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
          <AppText variant="secondary" color={Colors.textPrimary}>
            Opening document picker...
          </AppText>
        </View>
      )}

      {/* MAIN ATTACHMENT CARD */}
      {attachment ? (
        /* ATTACHED STATE CARD */
        <View style={styles.previewCard}>
          <Pressable
            onPress={handlePreviewPress}
            style={({ pressed }) => [
              styles.previewTouchable,
              pressed && styles.previewPressed,
            ]}
            accessibilityLabel={`Preview ${attachment.name}`}
          >
            {/* Left Thumbnail or PDF Icon */}
            {isImage ? (
              <View style={styles.thumbnailBox}>
                {attachment.uri ? (
                  <Image
                    source={{ uri: attachment.uri }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="image-outline"
                    size={28}
                    color={Colors.primary}
                  />
                )}
                <View style={styles.zoomOverlayBadge}>
                  <Ionicons name="expand-outline" size={12} color="#FFFFFF" />
                </View>
              </View>
            ) : (
              <View style={styles.pdfIconBox}>
                <MaterialCommunityIcons
                  name="file-pdf-box"
                  size={32}
                  color={Colors.primary}
                />
                <View style={styles.pdfPillBadge}>
                  <AppText variant="caption" color="#171A19" style={styles.pdfPillText}>
                    PDF
                  </AppText>
                </View>
              </View>
            )}

            {/* Document Metadata */}
            <View style={styles.docDetails}>
              <AppText
                variant="body"
                color={Colors.textPrimary}
                numberOfLines={1}
                ellipsizeMode="middle"
                style={styles.docName}
              >
                {attachment.name}
              </AppText>

              <View style={styles.metadataRow}>
                <View style={styles.typeBadge}>
                  <AppText variant="caption" color={Colors.textSecondary} style={styles.badgeText}>
                    {isImage ? 'IMAGE • PHOTO' : 'PDF DOCUMENT'}
                  </AppText>
                </View>
                {fileSizeLabel ? (
                  <AppText variant="caption" color={Colors.textMuted} style={styles.fileSizeText}>
                    • {fileSizeLabel}
                  </AppText>
                ) : null}
              </View>

              <AppText variant="caption" color={Colors.primary} style={styles.tapToViewHint}>
                {isImage ? 'Tap to view full image' : 'Tap for file details'}
              </AppText>
            </View>
          </Pressable>

          {/* Action Buttons Row */}
          <View style={styles.cardActionsRow}>
            {/* View Fullscreen Action (For Images) */}
            {isImage && (
              <Pressable
                onPress={() => setIsImageViewerVisible(true)}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.actionButtonPressed,
                ]}
                accessibilityLabel="View full size image"
              >
                <Ionicons name="eye-outline" size={15} color={Colors.primary} style={{ marginRight: 4 }} />
                <AppText variant="caption" color={Colors.primary} style={styles.actionBtnText}>
                  View
                </AppText>
              </Pressable>
            )}

            {/* Replace Action */}
            <Pressable
              onPress={handleReplaceAttachment}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
              ]}
              accessibilityLabel="Replace attachment"
            >
              <Ionicons name="swap-horizontal-outline" size={15} color={Colors.textSecondary} style={{ marginRight: 4 }} />
              <AppText variant="caption" color={Colors.textSecondary} style={styles.actionBtnText}>
                Replace
              </AppText>
            </Pressable>

            {/* Remove Action */}
            <Pressable
              onPress={handleRemoveAttachment}
              style={({ pressed }) => [
                styles.actionButton,
                styles.removeButton,
                pressed && styles.actionButtonPressed,
              ]}
              accessibilityLabel="Remove prescription document"
            >
              <Ionicons name="trash-outline" size={15} color={Colors.danger} style={{ marginRight: 4 }} />
              <AppText variant="caption" color={Colors.danger} style={styles.actionBtnText}>
                Remove
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : (
        /* EMPTY STATE / SELECTION DROPZONE */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyPrompt}>
            <View style={styles.uploadIconCircle}>
              <Ionicons name="cloud-upload-outline" size={24} color={Colors.primary} />
            </View>
            <AppText variant="secondary" color={Colors.textPrimary} style={styles.emptyTitle}>
              No prescription attached
            </AppText>
            <AppText variant="caption" color={Colors.textMuted} style={styles.emptySubtitle}>
              Select an image from gallery or upload a PDF reference
            </AppText>
          </View>

          {/* Option A & Option B Buttons */}
          <View style={styles.pickerButtonsRow}>
            <Pressable
              onPress={handleChooseImage}
              disabled={isProcessing || disabled}
              style={({ pressed }) => [
                styles.pickerButton,
                pressed && styles.pickerButtonPressed,
              ]}
              accessibilityLabel="Choose Image from gallery"
            >
              <View style={styles.pickerButtonIconBox}>
                <Ionicons name="image-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.pickerButtonTextCol}>
                <AppText variant="body" color={Colors.textPrimary} style={styles.pickerButtonTitle}>
                  Choose Image
                </AppText>
                <AppText variant="caption" color={Colors.textMuted} style={styles.pickerButtonSubtitle}>
                  JPG, JPEG, PNG
                </AppText>
              </View>
            </Pressable>

            <Pressable
              onPress={handleChoosePdf}
              disabled={isProcessing || disabled}
              style={({ pressed }) => [
                styles.pickerButton,
                pressed && styles.pickerButtonPressed,
              ]}
              accessibilityLabel="Choose PDF document"
            >
              <View style={styles.pickerButtonIconBox}>
                <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.pickerButtonTextCol}>
                <AppText variant="body" color={Colors.textPrimary} style={styles.pickerButtonTitle}>
                  Choose PDF
                </AppText>
                <AppText variant="caption" color={Colors.textMuted} style={styles.pickerButtonSubtitle}>
                  PDF document
                </AppText>
              </View>
            </Pressable>
          </View>
        </View>
      )}

      {/* FULL-SCREEN IMAGE LIGHTBOX MODAL */}
      {isImage && (
        <PrescriptionImageViewerModal
          visible={isImageViewerVisible}
          imageUri={attachment?.uri}
          fileName={attachment?.name || 'Prescription Image'}
          fileSizeText={fileSizeLabel}
          onClose={() => setIsImageViewerVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  headerLeft: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerIcon: {
    marginRight: 6,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: Typography.size.base,
  },
  supportingText: {
    lineHeight: 16,
  },
  attachedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(127, 168, 137, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(127, 168, 137, 0.3)',
  },
  attachedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: 5,
  },
  attachedText: {
    fontWeight: '600',
    fontSize: 11,
  },
  optionalPill: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionalText: {
    fontSize: 11,
  },
  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(216, 121, 112, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(216, 121, 112, 0.35)',
    borderRadius: Radius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  errorIcon: {
    marginTop: 1,
  },
  errorBannerText: {
    flex: 1,
    color: Colors.textPrimary,
    lineHeight: 16,
  },
  dismissErrorBtn: {
    padding: 4,
  },
  // Processing Card
  processingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // Attached Preview Card
  previewCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(230, 162, 60, 0.35)',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  previewTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  previewPressed: {
    backgroundColor: Colors.surfaceSecondary,
  },
  thumbnailBox: {
    width: 54,
    height: 54,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  zoomOverlayBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 4,
    padding: 2,
  },
  pdfIconBox: {
    width: 54,
    height: 54,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(230, 162, 60, 0.3)',
    position: 'relative',
  },
  pdfPillBadge: {
    position: 'absolute',
    bottom: 3,
    backgroundColor: Colors.primary,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  pdfPillText: {
    fontSize: 8,
    fontWeight: '800',
  },
  docDetails: {
    flex: 1,
  },
  docName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  typeBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  fileSizeText: {
    fontSize: 11,
  },
  tapToViewHint: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonPressed: {
    opacity: 0.75,
  },
  removeButton: {
    borderColor: 'rgba(216, 121, 112, 0.35)',
    backgroundColor: 'rgba(216, 121, 112, 0.08)',
  },
  actionBtnText: {
    fontWeight: '600',
    fontSize: 11,
  },
  // Empty State Dropzone
  emptyContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  emptyPrompt: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 16,
  },
  pickerButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  pickerButtonPressed: {
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
    borderColor: Colors.primary,
  },
  pickerButtonIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerButtonTextCol: {
    flex: 1,
  },
  pickerButtonTitle: {
    fontWeight: '600',
    fontSize: 13,
  },
  pickerButtonSubtitle: {
    fontSize: 10,
  },
});
