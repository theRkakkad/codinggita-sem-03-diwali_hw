import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from '../ui/AppText';
import AppButton from '../ui/AppButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Fullscreen Image Viewer Modal (Phase 11)
 * Allows users to inspect prescription photo attachments with high contrast and clarity.
 */
export default function PrescriptionImageViewerModal({
  visible,
  imageUri,
  downloadUrl = null,
  fileName = 'Prescription Image',
  fileSizeText = null,
  onClose,
}) {
  const hasValidUri = Boolean(imageUri && typeof imageUri === 'string');
  const targetDownloadUrl = downloadUrl || (hasValidUri && imageUri.startsWith('http') ? imageUri : null);

  const handleDownload = async () => {
    if (!targetDownloadUrl) return;
    try {
      await Linking.openURL(targetDownloadUrl);
    } catch (err) {
      Alert.alert('Download Failed', 'Could not open prescription file URL.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          {/* Top Bar Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <View style={styles.tagBadge}>
                <Ionicons name="image" size={12} color={Colors.primary} style={{ marginRight: 4 }} />
                <AppText variant="caption" color={Colors.primary} style={styles.tagText}>
                  PRESCRIPTION PREVIEW
                </AppText>
              </View>
              <AppText
                variant="body"
                color={Colors.textPrimary}
                numberOfLines={1}
                ellipsizeMode="middle"
                style={styles.fileNameText}
              >
                {fileName}
              </AppText>
              {fileSizeText ? (
                <AppText variant="caption" color={Colors.textMuted}>
                  {fileSizeText}
                </AppText>
              ) : null}
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityLabel="Close image preview"
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </Pressable>
          </View>

          {/* Main Image Display Area */}
          <View style={styles.imageContainer}>
            {hasValidUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="contain"
                accessibilityLabel={`Prescription preview for ${fileName}`}
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <View style={styles.placeholderIconBox}>
                  <MaterialCommunityIcons
                    name="image-filter-frames"
                    size={48}
                    color={Colors.primary}
                  />
                </View>
                <AppText variant="h3" style={styles.placeholderTitle}>
                  Prescription Image Attachment
                </AppText>
                <AppText
                  variant="secondary"
                  color={Colors.textSecondary}
                  style={styles.placeholderDesc}
                >
                  {fileName}
                </AppText>
                <AppText
                  variant="caption"
                  color={Colors.textMuted}
                  style={styles.placeholderNote}
                >
                  This sample record references an image file. Images selected directly from your device photo library will render in full high resolution here.
                </AppText>
              </View>
            )}
          </View>

          {/* Bottom Actions Bar */}
          <View style={styles.footer}>
            <View style={styles.footerInfo}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.success} style={{ marginRight: 6 }} />
              <AppText variant="caption" color={Colors.textSecondary}>
                Protected medical document
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {targetDownloadUrl ? (
                <AppButton
                  title="Open / Download"
                  variant="outline"
                  size="sm"
                  icon={<Ionicons name="download-outline" size={14} color={Colors.primary} />}
                  onPress={handleDownload}
                  style={{ marginRight: Spacing.xs }}
                />
              ) : null}

              <AppButton
                title="Close"
                variant="secondary"
                size="sm"
                onPress={onClose}
                style={styles.footerCloseBtn}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 15, 14, 0.96)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: 'rgba(23, 26, 25, 0.95)',
  },
  titleContainer: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    marginBottom: 2,
  },
  tagText: {
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  fileNameText: {
    fontWeight: '600',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  image: {
    width: SCREEN_WIDTH - Spacing.screenHorizontal * 2,
    height: SCREEN_HEIGHT * 0.7,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    maxWidth: 420,
  },
  placeholderIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(230, 162, 60, 0.25)',
  },
  placeholderTitle: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  placeholderDesc: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  placeholderNote: {
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: 'rgba(23, 26, 25, 0.95)',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerCloseBtn: {
    minWidth: 120,
  },
});
