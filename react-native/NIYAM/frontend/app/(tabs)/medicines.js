import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';
import {
  FILTER_OPTIONS,
} from '../../constants/medicinesData';
import MedicineFormModal from '../../components/medicines/MedicineFormModal';
import PrescriptionImageViewerModal from '../../components/medicines/PrescriptionImageViewerModal';
import { formatFileSize } from '../../components/medicines/PrescriptionAttachmentPicker';
import { medicineService } from '../../services/medicineService';

// NIYAM Medication Management Screen (Phase 09 & Phase 19 Integration)
// Provides searchable, filterable prescription list with interactive details, pause/resume, and delete actions connected to MongoDB.
export default function MedicinesScreen() {
  // Local state for medicines list and UI controls
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [feedbackBanner, setFeedbackBanner] = useState(null);

  // Form modal states (Phase 10)
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formMode, setFormMode] = useState('add'); // 'add' | 'edit'
  const [editingMedicine, setEditingMedicine] = useState(null);

  // Prescription image preview viewer state (Phase 11)
  const [viewerAttachment, setViewerAttachment] = useState(null);

  // Active medicine count
  const activeCount = useMemo(
    () => medicines.filter((m) => m.status === 'Active').length,
    [medicines]
  );

  // Counts by filter
  const filterCounts = useMemo(() => {
    return {
      All: medicines.length,
      Active: medicines.filter((m) => m.status === 'Active').length,
      Paused: medicines.filter((m) => m.status === 'Paused').length,
      Completed: medicines.filter((m) => m.status === 'Completed').length,
    };
  }, [medicines]);

  // Live filter and search logic
  const filteredMedicines = useMemo(() => {
    return medicines.filter((item) => {
      // Status filter
      if (activeFilter !== 'All' && item.status !== activeFilter) {
        return false;
      }

      // Case-insensitive search query matching name, dosage, or type
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDosage = item.dosage.toLowerCase().includes(query);
        const matchesType = item.type.toLowerCase().includes(query);
        return matchesName || matchesDosage || matchesType;
      }

      return true;
    });
  }, [medicines, activeFilter, searchQuery]);

  // Load medicines from MongoDB via medicineService
  const loadMedicines = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setApiError(null);

    try {
      const data = await medicineService.getMedicines();
      setMedicines(data);
    } catch (err) {
      console.warn('Load medicines error:', err.message);
      setApiError(err.message || 'Unable to load medicines from server.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMedicines();
  }, [loadMedicines]);

  // Add Medicine handler (Phase 10)
  const handleAddMedicine = () => {
    setFormMode('add');
    setEditingMedicine(null);
    setIsFormVisible(true);
  };

  // Edit Medicine handler (Phase 10)
  const handleEditMedicine = () => {
    if (!selectedMedicine) return;
    setFormMode('edit');
    setEditingMedicine(selectedMedicine);
    setIsFormVisible(true);
  };

  // Save handler for Add / Edit flows connected to backend
  const handleSaveMedicine = async (savedData) => {
    try {
      if (formMode === 'add') {
        const created = await medicineService.createMedicine(savedData);
        setMedicines((prev) => [created, ...prev]);
        setFeedbackBanner(`Added ${created.name} (${created.dosage}) to your medicines.`);
      } else {
        const id = savedData.id || savedData._id;
        const updated = await medicineService.updateMedicine(id, savedData);
        setMedicines((prev) =>
          prev.map((item) => ((item.id === id || item._id === id) ? updated : item))
        );

        if (selectedMedicine && (selectedMedicine.id === id || selectedMedicine._id === id)) {
          setSelectedMedicine(updated);
        }
        setFeedbackBanner(`Updated ${updated.name} successfully.`);
      }

      setIsFormVisible(false);
      setTimeout(() => setFeedbackBanner(null), 3500);
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Failed to save medication.');
    }
  };

  // Pause / Resume handler connected to backend
  const handleTogglePause = async (medId) => {
    const med = medicines.find((m) => m.id === medId || m._id === medId);
    if (!med) return;

    const id = med.id || med._id;
    const newStatus = med.status === 'Active' ? 'Paused' : 'Active';

    try {
      const updated = await medicineService.updateMedicine(id, { status: newStatus });
      setMedicines((prev) =>
        prev.map((item) => ((item.id === id || item._id === id) ? updated : item))
      );

      if (selectedMedicine && (selectedMedicine.id === id || selectedMedicine._id === id)) {
        setSelectedMedicine(updated);
      }

      setFeedbackBanner(
        newStatus === 'Paused'
          ? `Paused ${med.name}. Daily dose reminders suspended.`
          : `Resumed ${med.name}. Daily routine activated.`
      );
      setTimeout(() => setFeedbackBanner(null), 3500);
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Failed to update medication status.');
    }
  };

  // Delete Medicine handler with confirmation connected to backend
  const handleDeleteMedicine = (medId) => {
    const med = medicines.find((m) => m.id === medId || m._id === medId);
    if (!med) return;

    const id = med.id || med._id;

    Alert.alert(
      'Delete Medicine',
      `Are you sure you want to remove ${med.name} from your medication list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await medicineService.deleteMedicine(id);
              setMedicines((prev) => prev.filter((item) => item.id !== id && item._id !== id));
              setSelectedMedicine(null);
              setFeedbackBanner(`Removed ${med.name} from your list.`);
              setTimeout(() => setFeedbackBanner(null), 3500);
            } catch (err) {
              Alert.alert('Delete Failed', err.message || 'Failed to delete medicine.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadMedicines(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* 1. SCREEN HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <AppText variant="label" color={Colors.primary}>
              YOUR HEALTH, ORGANIZED
            </AppText>
            <AppText variant="h1" style={styles.headerTitle}>
              My medicines
            </AppText>
            <AppText variant="secondary" color={Colors.textSecondary} style={styles.headerSubtitle}>
              Keep track of your daily routine.
            </AppText>

            {/* Active Count Pill */}
            <View style={styles.activePill}>
              <View style={styles.activeDot} />
              <AppText variant="caption" color={Colors.success} style={styles.activePillText}>
                {activeCount} Active Prescriptions
              </AppText>
            </View>
          </View>

          {/* Add Medicine Action */}
          <AppButton
            title="Add"
            variant="primary"
            size="sm"
            icon={<Ionicons name="add" size={16} color="#171A19" />}
            onPress={handleAddMedicine}
            style={styles.addButton}
          />
        </View>

        {/* API Error Banner */}
        {apiError && (
          <View style={styles.apiErrorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} style={{ marginRight: 8 }} />
            <AppText variant="caption" color={Colors.danger} style={{ flex: 1 }}>
              {apiError}
            </AppText>
            <Pressable onPress={() => loadMedicines()} style={styles.retryChip}>
              <AppText variant="caption" color={Colors.primary} style={{ fontWeight: '600' }}>
                Retry
              </AppText>
            </Pressable>
          </View>
        )}

        {/* Temporary Feedback Banner */}
        {feedbackBanner && (
          <View style={styles.feedbackBanner}>
            <Ionicons name="information-circle" size={16} color={Colors.primary} style={styles.feedbackIcon} />
            <AppText variant="secondary" color={Colors.textPrimary} style={styles.feedbackText}>
              {feedbackBanner}
            </AppText>
          </View>
        )}

        {/* 2. SEARCH BAR */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search medicines..."
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={10}
              style={styles.clearSearchButton}
              accessibilityLabel="Clear search text"
            >
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* 3. FILTER CHIPS */}
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((filter) => {
            const isSelected = activeFilter === filter;
            const count = filterCounts[filter] || 0;

            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                ]}
                accessibilityLabel={`Filter by ${filter}, ${count} medicines`}
              >
                <AppText
                  variant="caption"
                  color={isSelected ? Colors.primary : Colors.textSecondary}
                  style={[styles.filterText, isSelected && styles.filterTextActive]}
                >
                  {filter} ({count})
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* 4. MEDICATION LIST */}
        <View style={styles.listContainer}>
          {isLoading && medicines.length === 0 ? (
            /* Loading State */
            <AppCard style={styles.emptyCard}>
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginBottom: Spacing.sm }} />
              <AppText variant="body" color={Colors.textSecondary}>
                Loading your medication routines...
              </AppText>
            </AppCard>
          ) : filteredMedicines.length === 0 ? (
            /* Empty State */
            <AppCard style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="search-outline" size={28} color={Colors.textMuted} />
              </View>
              <AppText variant="h3" style={styles.emptyTitle}>
                {medicines.length === 0 ? 'No medicines yet' : 'No medicines found'}
              </AppText>
              <AppText variant="secondary" color={Colors.textSecondary} style={styles.emptySubtitle}>
                {medicines.length === 0
                  ? 'Tap "Add" above to record your first prescribed routine.'
                  : searchQuery.trim().length > 0
                  ? `No results matching "${searchQuery}". Check the spelling or try a different filter.`
                  : `You have no medications categorized as ${activeFilter}.`}
              </AppText>
              {medicines.length === 0 ? (
                <AppButton
                  title="Add Your First Medicine"
                  variant="primary"
                  size="sm"
                  onPress={handleAddMedicine}
                  style={styles.resetButton}
                />
              ) : (searchQuery.trim().length > 0 || activeFilter !== 'All') ? (
                <AppButton
                  title="Reset Filters"
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    setSearchQuery('');
                    setActiveFilter('All');
                  }}
                  style={styles.resetButton}
                />
              ) : null}
            </AppCard>
          ) : (
            filteredMedicines.map((item) => {
              const isActive = item.status === 'Active';
              const isPaused = item.status === 'Paused';
              const isCompleted = item.status === 'Completed';

              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedMedicine(item)}
                  style={({ pressed }) => [
                    styles.medCard,
                    pressed && styles.medCardPressed,
                  ]}
                  accessibilityLabel={`${item.name}, ${item.dosage}, ${item.frequency}, status ${item.status}`}
                >
                  {/* Left Pill Icon Box */}
                  <View
                    style={[
                      styles.medIconBox,
                      isActive && styles.iconBoxActive,
                      isPaused && styles.iconBoxPaused,
                      isCompleted && styles.iconBoxCompleted,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.type === 'Capsule' ? 'pill' : 'pill-multiple'}
                      size={22}
                      color={isActive ? Colors.primary : isPaused ? Colors.warning : Colors.textMuted}
                    />
                  </View>

                  {/* Main Information */}
                  <View style={styles.medMainInfo}>
                    <View style={styles.medTitleRow}>
                      <AppText variant="body" style={styles.medNameText}>
                        {item.name}
                      </AppText>
                      {/* Status Tag Badge */}
                      <View
                        style={[
                          styles.statusBadge,
                          isActive && styles.badgeActive,
                          isPaused && styles.badgePaused,
                          isCompleted && styles.badgeCompleted,
                        ]}
                      >
                        <AppText
                          variant="caption"
                          style={[
                            styles.statusBadgeText,
                            isActive && { color: Colors.success },
                            isPaused && { color: Colors.warning },
                            isCompleted && { color: Colors.textMuted },
                          ]}
                        >
                          {item.status}
                        </AppText>
                      </View>
                    </View>

                    {/* Dosage and Type */}
                    <AppText variant="caption" color={Colors.textSecondary} style={styles.dosageRow}>
                      {item.dosage} • {item.type}
                    </AppText>

                    {/* Schedule & Time */}
                    <View style={styles.scheduleRow}>
                      <Ionicons name="time-outline" size={12} color={Colors.textMuted} style={styles.scheduleIcon} />
                      <AppText variant="caption" color={Colors.textMuted}>
                        {item.frequency} • {item.time}
                      </AppText>
                    </View>
                  </View>

                  {/* Right Tap Chevron */}
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={styles.chevron} />
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 5. MEDICATION DETAILS MODAL */}
      <Modal
        visible={!!selectedMedicine}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedMedicine(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedMedicine(null)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {selectedMedicine && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleBlock}>
                    <AppText variant="label" color={Colors.primary}>
                      {selectedMedicine.category}
                    </AppText>
                    <AppText variant="h1" style={styles.modalTitle}>
                      {selectedMedicine.name}
                    </AppText>
                  </View>
                  <Pressable
                    onPress={() => setSelectedMedicine(null)}
                    hitSlop={12}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={Colors.textMuted} />
                  </Pressable>
                </View>

                {/* Prescription Details Grid */}
                <View style={styles.modalBodyRows}>
                  <View style={styles.modalRow}>
                    <AppText variant="secondary" color={Colors.textMuted}>Dosage:</AppText>
                    <AppText variant="secondary" color={Colors.textPrimary} style={styles.boldText}>
                      {selectedMedicine.dosage} ({selectedMedicine.type})
                    </AppText>
                  </View>

                  <View style={styles.modalRow}>
                    <AppText variant="secondary" color={Colors.textMuted}>Frequency:</AppText>
                    <AppText variant="secondary" color={Colors.textPrimary} style={styles.boldText}>
                      {selectedMedicine.frequency}
                    </AppText>
                  </View>

                  <View style={styles.modalRow}>
                    <AppText variant="secondary" color={Colors.textMuted}>Scheduled Time:</AppText>
                    <AppText variant="secondary" color={Colors.textPrimary} style={styles.boldText}>
                      {selectedMedicine.time}
                    </AppText>
                  </View>

                  <View style={styles.modalRow}>
                    <AppText variant="secondary" color={Colors.textMuted}>Start Date:</AppText>
                    <AppText variant="secondary" color={Colors.textPrimary} style={styles.boldText}>
                      {selectedMedicine.startDate}
                    </AppText>
                  </View>

                  {selectedMedicine.endDate ? (
                    <View style={styles.modalRow}>
                      <AppText variant="secondary" color={Colors.textMuted}>End Date:</AppText>
                      <AppText variant="secondary" color={Colors.textPrimary} style={styles.boldText}>
                        {selectedMedicine.endDate}
                      </AppText>
                    </View>
                  ) : null}

                  <View style={styles.modalRow}>
                    <AppText variant="secondary" color={Colors.textMuted}>Status:</AppText>
                    <View
                      style={[
                        styles.statusBadge,
                        selectedMedicine.status === 'Active' && styles.badgeActive,
                        selectedMedicine.status === 'Paused' && styles.badgePaused,
                        selectedMedicine.status === 'Completed' && styles.badgeCompleted,
                      ]}
                    >
                      <AppText
                        variant="caption"
                        style={[
                          styles.statusBadgeText,
                          selectedMedicine.status === 'Active' && { color: Colors.success },
                          selectedMedicine.status === 'Paused' && { color: Colors.warning },
                          selectedMedicine.status === 'Completed' && { color: Colors.textMuted },
                        ]}
                      >
                        {selectedMedicine.status}
                      </AppText>
                    </View>
                  </View>

                  {/* Neutral Instructions Placeholder */}
                  <View style={styles.instructionsBlock}>
                    <AppText variant="caption" color={Colors.textMuted} style={styles.instructionsLabel}>
                      Usage Instructions:
                    </AppText>
                    <AppText variant="secondary" color={Colors.textSecondary} style={styles.instructionsContent}>
                      {selectedMedicine.instructions}
                    </AppText>
                  </View>

                  {/* Prescription Attachment (Phase 11) */}
                  {(() => {
                    const attachment =
                      selectedMedicine.attachment ||
                      (selectedMedicine.rxDocument
                        ? {
                            name: selectedMedicine.rxDocument,
                            type: /\.(jpg|jpeg|png|webp|heic)$/i.test(
                              selectedMedicine.rxDocument
                            )
                              ? 'image'
                              : 'pdf',
                            mimeType: /\.(jpg|jpeg|png|webp|heic)$/i.test(
                              selectedMedicine.rxDocument
                            )
                              ? 'image/jpeg'
                              : 'application/pdf',
                            size: null,
                            uri: null,
                          }
                        : null);

                    if (!attachment) {
                      return (
                        <View style={styles.noAttachmentCard}>
                          <Ionicons
                            name="document-outline"
                            size={18}
                            color={Colors.textMuted}
                            style={styles.docIcon}
                          />
                          <View style={styles.docInfo}>
                            <AppText variant="secondary" color={Colors.textMuted}>
                              No prescription document attached
                            </AppText>
                          </View>
                        </View>
                      );
                    }

                    const isImg = attachment.type === 'image';
                    const sizeLabel = formatFileSize(attachment.size);

                    return (
                      <Pressable
                        style={({ pressed }) => [
                          styles.attachmentCard,
                          pressed && styles.attachmentCardPressed,
                        ]}
                        onPress={() => {
                          if (isImg) {
                            setViewerAttachment(attachment);
                          } else {
                            Alert.alert(
                              'Prescription Document',
                              `File: ${attachment.name}\n${
                                sizeLabel ? `Size: ${sizeLabel}\n` : ''
                              }Format: PDF Document\n\nDirect in-app PDF rendering is not supported on this platform. This prescription file remains safely attached to your medication record for personal reference.`,
                              [{ text: 'Close', style: 'default' }]
                            );
                          }
                        }}
                        accessibilityLabel={`Prescription attachment: ${attachment.name}`}
                      >
                        {isImg ? (
                          <View style={styles.detailThumbnailBox}>
                            {attachment.uri ? (
                              <Image
                                source={{ uri: attachment.uri }}
                                style={styles.detailThumbnail}
                                resizeMode="cover"
                              />
                            ) : (
                              <MaterialCommunityIcons
                                name="image-outline"
                                size={22}
                                color={Colors.primary}
                              />
                            )}
                            <View style={styles.detailZoomIcon}>
                              <Ionicons name="expand-outline" size={10} color="#FFFFFF" />
                            </View>
                          </View>
                        ) : (
                          <View style={styles.detailPdfBox}>
                            <MaterialCommunityIcons
                              name="file-pdf-box"
                              size={24}
                              color={Colors.primary}
                            />
                          </View>
                        )}

                        <View style={styles.docInfo}>
                          <AppText
                            variant="secondary"
                            color={Colors.textPrimary}
                            numberOfLines={1}
                            ellipsizeMode="middle"
                            style={styles.boldText}
                          >
                            {attachment.name}
                          </AppText>
                          <View style={styles.docSubRow}>
                            <AppText variant="caption" color={Colors.textMuted}>
                              {isImg ? 'Image attachment' : 'PDF document'}
                              {sizeLabel ? ` • ${sizeLabel}` : ''}
                            </AppText>
                            <AppText
                              variant="caption"
                              color={Colors.primary}
                              style={styles.viewLinkText}
                            >
                              {isImg ? 'Tap to view' : 'Tap for info'}
                            </AppText>
                          </View>
                        </View>

                        <Ionicons
                          name={isImg ? 'eye-outline' : 'information-circle-outline'}
                          size={18}
                          color={Colors.primary}
                          style={{ marginLeft: 6 }}
                        />
                      </Pressable>
                    );
                  })()}
                </View>

                {/* Modal Action Controls */}
                <View style={styles.modalActions}>
                  {/* Pause / Resume Button */}
                  <AppButton
                    title={selectedMedicine.status === 'Active' ? 'Pause Medicine' : 'Resume Medicine'}
                    variant={selectedMedicine.status === 'Active' ? 'secondary' : 'primary'}
                    size="md"
                    icon={
                      <Ionicons
                        name={selectedMedicine.status === 'Active' ? 'pause-outline' : 'play-outline'}
                        size={16}
                        color={selectedMedicine.status === 'Active' ? Colors.textPrimary : '#171A19'}
                      />
                    }
                    onPress={() => handleTogglePause(selectedMedicine.id)}
                    style={styles.modalActionBtn}
                  />

                  {/* Edit Medicine (Placeholder) */}
                  <AppButton
                    title="Edit Medicine"
                    variant="outline"
                    size="md"
                    icon={<Ionicons name="create-outline" size={16} color={Colors.primary} />}
                    onPress={handleEditMedicine}
                    style={styles.modalActionBtn}
                  />

                  {/* Delete Medicine (With Confirmation) */}
                  <AppButton
                    title="Delete Medicine"
                    variant="outline"
                    size="md"
                    icon={<Ionicons name="trash-outline" size={16} color={Colors.danger} />}
                    onPress={() => handleDeleteMedicine(selectedMedicine.id)}
                    style={[styles.modalActionBtn, styles.deleteBtn]}
                    textStyle={{ color: Colors.danger }}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* 6. REUSABLE ADD / EDIT MEDICATION FORM MODAL (PHASE 10) */}
      <MedicineFormModal
        visible={isFormVisible}
        mode={formMode}
        initialData={editingMedicine}
        onClose={() => setIsFormVisible(false)}
        onSave={handleSaveMedicine}
      />

      {/* 7. PRESCRIPTION IMAGE LIGHTBOX MODAL (PHASE 11) */}
      <PrescriptionImageViewerModal
        visible={!!viewerAttachment}
        imageUri={viewerAttachment?.uri}
        fileName={viewerAttachment?.name || 'Prescription Image'}
        fileSizeText={formatFileSize(viewerAttachment?.size)}
        onClose={() => setViewerAttachment(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.screenVertical,
    paddingBottom: 110, // Safe-area clearance for floating glass bottom navigation dock
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  headerTitle: {
    marginTop: 2,
    marginBottom: 2,
  },
  headerSubtitle: {
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(127, 168, 137, 0.12)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(127, 168, 137, 0.25)',
    marginTop: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: 6,
  },
  activePillText: {
    fontWeight: '600',
    fontSize: 11,
  },
  addButton: {
    marginTop: Spacing.xs,
  },
  // Feedback Banner
  apiErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    borderRadius: Radius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  retryChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
    borderRadius: Radius.sm,
    marginLeft: Spacing.xs,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230, 162, 60, 0.3)',
    borderRadius: Radius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  feedbackIcon: {
    marginRight: Spacing.xs,
  },
  feedbackText: {
    flex: 1,
    fontWeight: '500',
  },
  // Search Bar
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    height: 46,
    marginBottom: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: Spacing.xxs,
  },
  // Filter Chips
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
    borderColor: Colors.primary,
  },
  filterText: {
    fontWeight: '500',
    fontSize: 12,
  },
  filterTextActive: {
    fontWeight: '700',
  },
  // Medication List
  listContainer: {
    gap: Spacing.sm,
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  medCardPressed: {
    backgroundColor: Colors.surfaceSecondary,
  },
  medIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  iconBoxActive: {
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
  },
  iconBoxPaused: {
    backgroundColor: 'rgba(230, 162, 60, 0.08)',
  },
  iconBoxCompleted: {
    backgroundColor: 'rgba(133, 138, 132, 0.1)',
  },
  medMainInfo: {
    flex: 1,
  },
  medTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  medNameText: {
    fontWeight: '600',
  },
  dosageRow: {
    marginBottom: 4,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleIcon: {
    marginRight: 4,
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  badgeActive: {
    backgroundColor: 'rgba(127, 168, 137, 0.15)',
  },
  badgePaused: {
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
  },
  badgeCompleted: {
    backgroundColor: 'rgba(133, 138, 132, 0.15)',
  },
  statusBadgeText: {
    fontWeight: '600',
    fontSize: 11,
  },
  chevron: {
    marginLeft: Spacing.xs,
  },
  // Empty State
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  resetButton: {
    marginTop: Spacing.xs,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.cardPaddingLarge,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  modalTitleBlock: {
    flex: 1,
  },
  modalTitle: {
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: Spacing.xxs,
  },
  modalBodyRows: {
    gap: Spacing.xs,
    marginVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boldText: {
    fontWeight: '600',
  },
  instructionsBlock: {
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
  },
  instructionsLabel: {
    fontWeight: '600',
    marginBottom: 2,
  },
  instructionsContent: {
    lineHeight: 18,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 162, 60, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(230, 162, 60, 0.25)',
    borderRadius: Radius.md,
    padding: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  attachmentCardPressed: {
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
  },
  noAttachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  detailThumbnailBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.xs,
    backgroundColor: Colors.surfaceSecondary,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  detailThumbnail: {
    width: '100%',
    height: '100%',
  },
  detailZoomIcon: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 3,
    padding: 1,
  },
  detailPdfBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.xs,
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(230, 162, 60, 0.3)',
  },
  docSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  viewLinkText: {
    fontWeight: '700',
    fontSize: 10,
  },
  docIcon: {
    marginRight: Spacing.xs,
  },
  docInfo: {
    flex: 1,
  },
  modalActions: {
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  modalActionBtn: {
    width: '100%',
  },
  deleteBtn: {
    borderColor: 'rgba(216, 121, 112, 0.4)',
  },
});
