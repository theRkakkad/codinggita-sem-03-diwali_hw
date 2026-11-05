import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from '../ui/AppText';
import AppButton from '../ui/AppButton';
import PrescriptionAttachmentPicker from './PrescriptionAttachmentPicker';

// Available Medicine Types with their respective vector icon configurations
const MEDICINE_TYPES = [
  { label: 'Tablet', iconFamily: 'mci', icon: 'pill-multiple' },
  { label: 'Capsule', iconFamily: 'mci', icon: 'pill' },
  { label: 'Syrup', iconFamily: 'mci', icon: 'bottle-tonic-outline' },
  { label: 'Drops', iconFamily: 'ion', icon: 'water-outline' },
  { label: 'Injection', iconFamily: 'mci', icon: 'needle' },
  { label: 'Other', iconFamily: 'ion', icon: 'bandage-outline' },
];

// Frequency options per Phase 10 specification
const FREQUENCIES = [
  { label: 'Once daily', sublabel: '1 time per day', icon: 'sunny-outline', slots: 1 },
  { label: 'Twice daily', sublabel: '2 times per day', icon: 'partly-sunny-outline', slots: 2 },
  { label: 'Three times daily', sublabel: '3 times per day', icon: 'repeat-outline', slots: 3 },
  { label: 'As needed', sublabel: 'Take when needed (PRN)', icon: 'medical-outline', slots: 0 },
];

// Quick dosage presets for rapid selection
const DOSAGE_PRESETS = [
  '1 tablet',
  '2 tablets',
  '1 capsule',
  '2 capsules',
  '5 ml',
  '10 ml',
  '2 drops',
];

// Quick instruction presets
const INSTRUCTION_PRESETS = [
  'After food',
  'Before food',
  'With water',
  'At bedtime',
  'On empty stomach',
];

// Quick time presets for each slot
const TIME_PRESETS = {
  slot0: ['07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '12:00 PM', '08:00 PM'],
  morning: ['07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM'],
  afternoon: ['12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM'],
  evening: ['06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM'],
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Helper to format a date object to "MMM DD, YYYY"
function formatDisplayDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const month = MONTH_NAMES[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

// Helper to add days to a date
function addDays(baseDate, days) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d;
}

// Reusable Add / Edit Medication Form Modal (Phase 10)
export default function MedicineFormModal({
  visible,
  mode = 'add',
  initialData = null,
  onClose,
  onSave,
}) {
  // Form input states
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [type, setType] = useState('Tablet');
  const [instructions, setInstructions] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [reminderTimes, setReminderTimes] = useState(['09:00 AM']);
  const [startDate, setStartDate] = useState(formatDisplayDate(new Date()));
  const [endDate, setEndDate] = useState('');
  const [attachment, setAttachment] = useState(null); // Phase 11: Prescription attachment metadata

  // Validation error states
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill or reset form whenever modal visibility or initialData changes
  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && initialData) {
        setName(initialData.name || '');
        setDosage(initialData.dosage || '');
        setType(initialData.type || 'Tablet');
        setInstructions(initialData.instructions || '');
        setFrequency(initialData.frequency || 'Once daily');
        setStartDate(initialData.startDate || formatDisplayDate(new Date()));
        setEndDate(initialData.endDate || '');

        // Populate existing prescription attachment if available (Phase 11)
        if (initialData.attachment) {
          setAttachment(initialData.attachment);
        } else if (initialData.rxDocument) {
          const isImg = /\.(jpg|jpeg|png|webp|heic)$/i.test(initialData.rxDocument);
          setAttachment({
            name: initialData.rxDocument,
            type: isImg ? 'image' : 'pdf',
            mimeType: isImg ? 'image/jpeg' : 'application/pdf',
            size: null,
            uri: null,
          });
        } else {
          setAttachment(null);
        }

        // Parse existing time string into slot array
        if (initialData.frequency === 'As needed') {
          setReminderTimes([]);
        } else if (initialData.time && initialData.time !== 'As prescribed') {
          const parts = initialData.time.split(',').map((s) => s.trim());
          if (initialData.frequency === 'Once daily') {
            setReminderTimes([parts[0] || '09:00 AM']);
          } else if (initialData.frequency === 'Twice daily') {
            setReminderTimes([
              parts[0] || '08:00 AM',
              parts[1] || '08:00 PM',
            ]);
          } else if (initialData.frequency === 'Three times daily') {
            setReminderTimes([
              parts[0] || '08:00 AM',
              parts[1] || '02:00 PM',
              parts[2] || '08:00 PM',
            ]);
          } else {
            setReminderTimes(parts.length > 0 ? parts : ['09:00 AM']);
          }
        } else {
          // Defaults if missing
          setReminderTimes(getDefaultTimes(initialData.frequency || 'Once daily'));
        }
      } else {
        // Reset to clean defaults for Add flow
        setName('');
        setDosage('');
        setType('Tablet');
        setInstructions('');
        setFrequency('Once daily');
        setReminderTimes(['09:00 AM']);
        setStartDate(formatDisplayDate(new Date()));
        setEndDate('');
        setAttachment(null); // Clean attachment state for new medicine
      }
      setErrors({});
      setApiError(null);
      setIsSubmitting(false);
    }
  }, [visible, mode, initialData]);

  // Default reminder times by frequency
  function getDefaultTimes(freq) {
    switch (freq) {
      case 'Once daily':
        return ['09:00 AM'];
      case 'Twice daily':
        return ['08:00 AM', '08:00 PM'];
      case 'Three times daily':
        return ['08:00 AM', '02:00 PM', '08:00 PM'];
      case 'As needed':
        return [];
      default:
        return ['09:00 AM'];
    }
  }

  // Handle frequency change
  const handleFrequencySelect = (selectedFreq) => {
    setFrequency(selectedFreq);
    setReminderTimes(getDefaultTimes(selectedFreq));

    // Clear frequency and reminder time validation errors
    if (errors.frequency || errors.times) {
      setErrors((prev) => ({ ...prev, frequency: null, times: null }));
    }
  };

  // Update a single reminder time slot
  const handleTimeSlotChange = (index, newTime) => {
    setReminderTimes((prev) => {
      const updated = [...prev];
      updated[index] = newTime;
      return updated;
    });
    if (errors.times) {
      setErrors((prev) => ({ ...prev, times: null }));
    }
  };

  // Comprehensive client-side form validation
  const validateForm = () => {
    const newErrors = {};

    // 1. Medicine name is required
    if (!name.trim()) {
      newErrors.name = 'Medicine name is required.';
    }

    // 2. Dosage is required
    if (!dosage.trim()) {
      newErrors.dosage = 'Dosage is required (e.g., 1 tablet, 500mg).';
    }

    // 3. Medicine type is required
    if (!type) {
      newErrors.type = 'Please select a medicine type.';
    }

    // 4. Frequency is required
    if (!frequency) {
      newErrors.frequency = 'Please select a frequency.';
    }

    // 5. Scheduled times are required for scheduled frequencies
    if (frequency !== 'As needed') {
      const expectedCount =
        frequency === 'Once daily' ? 1 : frequency === 'Twice daily' ? 2 : 3;
      if (
        reminderTimes.length < expectedCount ||
        reminderTimes.some((t) => !t || !t.trim())
      ) {
        newErrors.times = 'Please select a reminder time for each dose.';
      }
    }

    // 6. Start date is required
    if (!startDate.trim()) {
      newErrors.startDate = 'Start date is required.';
    }

    // 7. End date validation: must not be earlier than start date
    if (endDate.trim() && startDate.trim()) {
      const startTimestamp = Date.parse(startDate.trim());
      const endTimestamp = Date.parse(endDate.trim());

      if (!isNaN(startTimestamp) && !isNaN(endTimestamp)) {
        if (endTimestamp < startTimestamp) {
          newErrors.endDate = 'End date cannot be earlier than start date.';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save handler with duplicate submission guard
  const handleSave = async () => {
    if (isSubmitting) return;

    if (!validateForm()) {
      return;
    }

    setApiError(null);
    setIsSubmitting(true);

    try {
      // Format time representation
      let formattedTime = 'As prescribed';
      if (frequency !== 'As needed' && reminderTimes.length > 0) {
        formattedTime = reminderTimes.join(', ');
      }

      if (mode === 'add') {
        const newMedicine = {
          name: name.trim(),
          dosage: dosage.trim(),
          type,
          frequency,
          time: formattedTime,
          reminderTimes: frequency === 'As needed' ? [] : reminderTimes,
          status: 'Active', // Default status for newly created prescriptions
          startDate: startDate.trim(),
          endDate: endDate.trim() ? endDate.trim() : undefined,
          instructions:
            instructions.trim() || 'Take as prescribed by physician.',
          category:
            type === 'Capsule' || type === 'Tablet' ? 'Prescription' : type,
          attachment: attachment ? { ...attachment } : null,
          rxDocument: attachment ? attachment.name : null,
        };
        await onSave(newMedicine);
      } else {
        // In edit mode: preserve existing ID and current Active/Paused/Completed status
        const hadAttachment = Boolean(
          initialData?.attachment ||
            initialData?.prescription ||
            initialData?.rxDocument
        );
        const updatedMedicine = {
          ...initialData,
          name: name.trim(),
          dosage: dosage.trim(),
          type,
          frequency,
          time: formattedTime,
          reminderTimes: frequency === 'As needed' ? [] : reminderTimes,
          startDate: startDate.trim(),
          endDate: endDate.trim() ? endDate.trim() : undefined,
          instructions:
            instructions.trim() || 'Take as prescribed by physician.',
          id: initialData.id || initialData._id,
          status: initialData.status, // Preserve status strictly
          category: initialData.category || 'Prescription',
          attachment: attachment ? { ...attachment } : null,
          hadAttachment,
          rxDocument: attachment ? attachment.name : null,
        };
        await onSave(updatedMedicine);
      }
    } catch (err) {
      setApiError(err.message || 'Failed to save medication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render icon helper
  const renderTypeIcon = (item, isSelected) => {
    const iconColor = isSelected ? Colors.primary : Colors.textMuted;
    if (item.iconFamily === 'mci') {
      return <MaterialCommunityIcons name={item.icon} size={20} color={iconColor} />;
    }
    return <Ionicons name={item.icon} size={20} color={iconColor} />;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <AppText variant="label" color={Colors.primary}>
                {mode === 'add' ? 'NEW MEDICATION' : 'UPDATE PRESCRIPTION'}
              </AppText>
              <AppText variant="h2" style={styles.headerTitle}>
                {mode === 'add' ? 'Add medicine' : 'Edit medicine'}
              </AppText>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeButton}
              accessibilityLabel="Close medication form"
            >
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </Pressable>
          </View>

          {/* FORM SCROLL CONTENT */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. MEDICINE NAME */}
            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <AppText variant="secondary" color={Colors.textSecondary} style={styles.fieldLabel}>
                  Medicine name
                </AppText>
                <AppText variant="caption" color={Colors.primary}>
                  *
                </AppText>
              </View>

              <View
                style={[
                  styles.inputWrapper,
                  errors.name ? styles.inputWrapperError : null,
                ]}
              >
                <Ionicons
                  name="medkit-outline"
                  size={18}
                  color={Colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                  }}
                  placeholder="e.g., Amoxicillin, Metformin, Vitamin D3"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.textInput}
                  autoCapitalize="words"
                />
                {name.length > 0 && (
                  <Pressable
                    onPress={() => setName('')}
                    hitSlop={8}
                    style={styles.clearIcon}
                  >
                    <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                  </Pressable>
                )}
              </View>
              {errors.name && (
                <AppText variant="caption" color={Colors.danger} style={styles.errorText}>
                  {errors.name}
                </AppText>
              )}
            </View>

            {/* 2. DOSAGE */}
            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <AppText variant="secondary" color={Colors.textSecondary} style={styles.fieldLabel}>
                  Dosage
                </AppText>
                <AppText variant="caption" color={Colors.primary}>
                  *
                </AppText>
              </View>

              <View
                style={[
                  styles.inputWrapper,
                  errors.dosage ? styles.inputWrapperError : null,
                ]}
              >
                <MaterialCommunityIcons
                  name="scale"
                  size={18}
                  color={Colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={dosage}
                  onChangeText={(val) => {
                    setDosage(val);
                    if (errors.dosage) setErrors((prev) => ({ ...prev, dosage: null }));
                  }}
                  placeholder="e.g., 1 tablet, 500mg, 10ml, 2 drops"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.textInput}
                  autoCapitalize="none"
                />
                {dosage.length > 0 && (
                  <Pressable
                    onPress={() => setDosage('')}
                    hitSlop={8}
                    style={styles.clearIcon}
                  >
                    <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                  </Pressable>
                )}
              </View>

              {/* Dosage Presets */}
              <View style={styles.chipsWrap}>
                {DOSAGE_PRESETS.map((preset) => {
                  const isSelected = dosage === preset;
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => {
                        setDosage(preset);
                        if (errors.dosage) setErrors((prev) => ({ ...prev, dosage: null }));
                      }}
                      style={[
                        styles.presetChip,
                        isSelected && styles.presetChipActive,
                      ]}
                      accessibilityLabel={`Set dosage to ${preset}`}
                    >
                      <AppText
                        variant="caption"
                        color={isSelected ? Colors.primary : Colors.textSecondary}
                        style={isSelected && styles.presetChipTextActive}
                      >
                        {preset}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              {errors.dosage && (
                <AppText variant="caption" color={Colors.danger} style={styles.errorText}>
                  {errors.dosage}
                </AppText>
              )}
            </View>

            {/* 3. MEDICINE TYPE */}
            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <AppText variant="secondary" color={Colors.textSecondary} style={styles.fieldLabel}>
                  Medicine type
                </AppText>
                <AppText variant="caption" color={Colors.primary}>
                  *
                </AppText>
              </View>

              <View style={styles.typeGrid}>
                {MEDICINE_TYPES.map((item) => {
                  const isSelected = type === item.label;
                  return (
                    <Pressable
                      key={item.label}
                      onPress={() => {
                        setType(item.label);
                        if (errors.type) setErrors((prev) => ({ ...prev, type: null }));
                      }}
                      style={[
                        styles.typeCard,
                        isSelected && styles.typeCardActive,
                      ]}
                      accessibilityLabel={`Select ${item.label} type`}
                    >
                      <View style={[styles.typeIconBox, isSelected && styles.typeIconBoxActive]}>
                        {renderTypeIcon(item, isSelected)}
                      </View>
                      <AppText
                        variant="caption"
                        color={isSelected ? Colors.primary : Colors.textSecondary}
                        style={[styles.typeText, isSelected && styles.typeTextActive]}
                      >
                        {item.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
              {errors.type && (
                <AppText variant="caption" color={Colors.danger} style={styles.errorText}>
                  {errors.type}
                </AppText>
              )}
            </View>

            {/* 4. INSTRUCTIONS */}
            <View style={styles.fieldSection}>
              <AppText variant="secondary" color={Colors.textSecondary} style={styles.fieldLabel}>
                Instructions (Optional)
              </AppText>

              <View style={[styles.inputWrapper, styles.multilineInputWrapper]}>
                <TextInput
                  value={instructions}
                  onChangeText={setInstructions}
                  placeholder="e.g., Take after food with a full glass of water"
                  placeholderTextColor={Colors.textMuted}
                  style={[styles.textInput, styles.multilineTextInput]}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Instruction Presets */}
              <View style={styles.chipsWrap}>
                {INSTRUCTION_PRESETS.map((preset) => {
                  const isIncluded = instructions.includes(preset);
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => {
                        if (!instructions.trim()) {
                          setInstructions(preset);
                        } else if (!instructions.includes(preset)) {
                          setInstructions(`${instructions}, ${preset.toLowerCase()}`);
                        }
                      }}
                      style={[
                        styles.presetChip,
                        isIncluded && styles.presetChipActive,
                      ]}
                      accessibilityLabel={`Add instruction: ${preset}`}
                    >
                      <AppText
                        variant="caption"
                        color={isIncluded ? Colors.primary : Colors.textSecondary}
                        style={isIncluded && styles.presetChipTextActive}
                      >
                        {preset}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 5. FREQUENCY */}
            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <AppText variant="secondary" color={Colors.textSecondary} style={styles.fieldLabel}>
                  Frequency
                </AppText>
                <AppText variant="caption" color={Colors.primary}>
                  *
                </AppText>
              </View>

              <View style={styles.frequencyList}>
                {FREQUENCIES.map((item) => {
                  const isSelected = frequency === item.label;
                  return (
                    <Pressable
                      key={item.label}
                      onPress={() => handleFrequencySelect(item.label)}
                      style={[
                        styles.frequencyRow,
                        isSelected && styles.frequencyRowActive,
                      ]}
                      accessibilityLabel={`Frequency ${item.label}`}
                    >
                      <View style={styles.frequencyLeft}>
                        <View
                          style={[
                            styles.frequencyIconCircle,
                            isSelected && styles.frequencyIconCircleActive,
                          ]}
                        >
                          <Ionicons
                            name={item.icon}
                            size={18}
                            color={isSelected ? Colors.primary : Colors.textMuted}
                          />
                        </View>
                        <View>
                          <AppText
                            variant="body"
                            color={isSelected ? Colors.textPrimary : Colors.textSecondary}
                            style={[styles.frequencyTitle, isSelected && styles.frequencyTitleActive]}
                          >
                            {item.label}
                          </AppText>
                          <AppText variant="caption" color={Colors.textMuted}>
                            {item.sublabel}
                          </AppText>
                        </View>
                      </View>

                      {/* Radio Indicator */}
                      <View
                        style={[
                          styles.radioOuter,
                          isSelected && styles.radioOuterActive,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {errors.frequency && (
                <AppText variant="caption" color={Colors.danger} style={styles.errorText}>
                  {errors.frequency}
                </AppText>
              )}
            </View>

            {/* 6. DAILY REMINDER TIME(S) */}
            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <AppText variant="secondary" color={Colors.textSecondary} style={styles.fieldLabel}>
                  Daily reminder time(s)
                </AppText>
                {frequency !== 'As needed' && (
                  <AppText variant="caption" color={Colors.primary}>
                    *
                  </AppText>
                )}
              </View>

              {/* AS NEEDED FREQUENCY NOTE */}
              {frequency === 'As needed' ? (
                <View style={styles.infoBox}>
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={Colors.primary}
                    style={styles.infoIcon}
                  />
                  <View style={styles.infoTextContainer}>
                    <AppText variant="secondary" color={Colors.textPrimary} style={styles.infoTitle}>
                      No scheduled times required
                    </AppText>
                    <AppText variant="caption" color={Colors.textMuted} style={styles.infoDescription}>
                      This medicine is taken as needed (PRN). Reminders will not be scheduled on your daily timeline.
                    </AppText>
                  </View>
                </View>
              ) : (
                /* SCHEDULED TIME SELECTORS */
                <View style={styles.timeSlotsContainer}>
                  {reminderTimes.map((timeValue, idx) => {
                    const slotLabel =
                      frequency === 'Once daily'
                        ? 'Dose 1 (Daily Reminder)'
                        : frequency === 'Twice daily'
                        ? idx === 0
                          ? 'Dose 1 (Morning)'
                          : 'Dose 2 (Evening)'
                        : idx === 0
                        ? 'Dose 1 (Morning)'
                        : idx === 1
                        ? 'Dose 2 (Afternoon)'
                        : 'Dose 3 (Evening)';

                    const presetsForSlot =
                      frequency === 'Once daily'
                        ? TIME_PRESETS.slot0
                        : frequency === 'Twice daily'
                        ? idx === 0
                          ? TIME_PRESETS.morning
                          : TIME_PRESETS.evening
                        : idx === 0
                        ? TIME_PRESETS.morning
                        : idx === 1
                        ? TIME_PRESETS.afternoon
                        : TIME_PRESETS.evening;

                    return (
                      <View key={`slot-${idx}`} style={styles.timeSlotCard}>
                        {/* Slot Header */}
                        <View style={styles.timeSlotHeader}>
                          <AppText variant="caption" color={Colors.primary} style={styles.timeSlotLabel}>
                            {slotLabel}
                          </AppText>
                          <View style={styles.currentTimeBadge}>
                            <Ionicons name="time-outline" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                            <AppText variant="caption" color={Colors.primary} style={{ fontWeight: '700' }}>
                              {timeValue}
                            </AppText>
                          </View>
                        </View>

                        {/* Quick Preset Buttons */}
                        <View style={styles.timePresetRow}>
                          {presetsForSlot.map((preset) => {
                            const isTimeActive = timeValue === preset;
                            return (
                              <Pressable
                                key={preset}
                                onPress={() => handleTimeSlotChange(idx, preset)}
                                style={[
                                  styles.timeChip,
                                  isTimeActive && styles.timeChipActive,
                                ]}
                                accessibilityLabel={`Set ${slotLabel} to ${preset}`}
                              >
                                <AppText
                                  variant="caption"
                                  color={isTimeActive ? '#171A19' : Colors.textSecondary}
                                  style={[styles.timeChipText, isTimeActive && styles.timeChipTextActive]}
                                >
                                  {preset}
                                </AppText>
                              </Pressable>
                            );
                          })}
                        </View>

                        {/* Custom Time Manual Entry Input */}
                        <View style={styles.customTimeRow}>
                          <AppText variant="caption" color={Colors.textMuted} style={styles.customTimeLabel}>
                            Custom time:
                          </AppText>
                          <TextInput
                            value={timeValue}
                            onChangeText={(val) => handleTimeSlotChange(idx, val)}
                            placeholder="e.g., 08:30 AM"
                            placeholderTextColor={Colors.textMuted}
                            style={styles.customTimeInput}
                            autoCapitalize="characters"
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {errors.times && (
                <AppText variant="caption" color={Colors.danger} style={styles.errorText}>
                  {errors.times}
                </AppText>
              )}
            </View>

            {/* 7. START DATE & END DATE */}
            <View style={styles.dateSection}>
              {/* START DATE */}
              <View style={styles.dateField}>
                <View style={styles.labelRow}>
                  <AppText variant="secondary" color={Colors.textSecondary} style={styles.fieldLabel}>
                    Start date
                  </AppText>
                  <AppText variant="caption" color={Colors.primary}>
                    *
                  </AppText>
                </View>

                <View
                  style={[
                    styles.inputWrapper,
                    errors.startDate ? styles.inputWrapperError : null,
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={Colors.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={startDate}
                    onChangeText={(val) => {
                      setStartDate(val);
                      if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: null }));
                    }}
                    placeholder="e.g., Nov 02, 2026"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.textInput}
                  />
                </View>

                {/* Start Date Helper Chips */}
                <View style={styles.chipsWrap}>
                  <Pressable
                    onPress={() => setStartDate(formatDisplayDate(new Date()))}
                    style={styles.presetChip}
                  >
                    <AppText variant="caption" color={Colors.textSecondary}>
                      Today
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => setStartDate(formatDisplayDate(addDays(new Date(), 1)))}
                    style={styles.presetChip}
                  >
                    <AppText variant="caption" color={Colors.textSecondary}>
                      Tomorrow
                    </AppText>
                  </Pressable>
                </View>

                {errors.startDate && (
                  <AppText variant="caption" color={Colors.danger} style={styles.errorText}>
                    {errors.startDate}
                  </AppText>
                )}
              </View>

              {/* END DATE (OPTIONAL) */}
              <View style={styles.dateField}>
                <View style={styles.labelRow}>
                  <AppText variant="secondary" color={Colors.textSecondary} style={styles.fieldLabel}>
                    End date (Optional)
                  </AppText>
                </View>

                <View
                  style={[
                    styles.inputWrapper,
                    errors.endDate ? styles.inputWrapperError : null,
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={Colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={endDate}
                    onChangeText={(val) => {
                      setEndDate(val);
                      if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: null }));
                    }}
                    placeholder="e.g., Nov 16, 2026"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.textInput}
                  />
                  {endDate.length > 0 && (
                    <Pressable
                      onPress={() => setEndDate('')}
                      hitSlop={8}
                      style={styles.clearIcon}
                    >
                      <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                    </Pressable>
                  )}
                </View>

                {/* End Date Helper Chips */}
                <View style={styles.chipsWrap}>
                  <Pressable
                    onPress={() => setEndDate('')}
                    style={[styles.presetChip, !endDate && styles.presetChipActive]}
                  >
                    <AppText
                      variant="caption"
                      color={!endDate ? Colors.primary : Colors.textSecondary}
                    >
                      Ongoing
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => setEndDate(formatDisplayDate(addDays(new Date(), 7)))}
                    style={styles.presetChip}
                  >
                    <AppText variant="caption" color={Colors.textSecondary}>
                      +7 Days
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => setEndDate(formatDisplayDate(addDays(new Date(), 14)))}
                    style={styles.presetChip}
                  >
                    <AppText variant="caption" color={Colors.textSecondary}>
                      +14 Days
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => setEndDate(formatDisplayDate(addDays(new Date(), 30)))}
                    style={styles.presetChip}
                  >
                    <AppText variant="caption" color={Colors.textSecondary}>
                      +30 Days
                    </AppText>
                  </Pressable>
                </View>

                {errors.endDate && (
                  <AppText variant="caption" color={Colors.danger} style={styles.errorText}>
                    {errors.endDate}
                  </AppText>
                )}
              </View>
            </View>

            {/* 8. PRESCRIPTION DOCUMENT ATTACHMENT (PHASE 11) */}
            <View style={styles.fieldSection}>
              <PrescriptionAttachmentPicker
                attachment={attachment}
                onAttachmentChange={setAttachment}
              />
            </View>
          </ScrollView>

          {/* API ERROR BANNER */}
          {apiError ? (
            <View style={styles.apiErrorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} style={{ marginRight: 8 }} />
              <AppText variant="caption" color={Colors.danger} style={{ flex: 1 }}>
                {apiError}
              </AppText>
            </View>
          ) : null}

          {/* FOOTER ACTIONS */}
          <View style={styles.footer}>
            <AppButton
              title="Cancel"
              variant="secondary"
              size="md"
              onPress={onClose}
              disabled={isSubmitting}
              style={styles.cancelButton}
            />

            <AppButton
              title={mode === 'add' ? 'Add Medicine' : 'Save Changes'}
              variant="primary"
              size="md"
              icon={
                <Ionicons
                  name={mode === 'add' ? 'add' : 'checkmark'}
                  size={18}
                  color="#171A19"
                />
              }
              onPress={handleSave}
              disabled={isSubmitting}
              loading={isSubmitting}
              style={styles.saveButton}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalSafeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  apiErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(235, 87, 87, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(235, 87, 87, 0.3)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    marginTop: 2,
    fontSize: 22,
  },
  closeButton: {
    padding: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  fieldSection: {
    gap: Spacing.xxs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fieldLabel: {
    fontWeight: '600',
    fontSize: Typography.size.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    height: 48,
    paddingHorizontal: Spacing.sm,
    marginTop: 4,
  },
  multilineInputWrapper: {
    height: 72,
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  inputWrapperError: {
    borderColor: Colors.danger,
  },
  inputIcon: {
    marginRight: Spacing.xs,
  },
  textInput: {
    flex: 1,
    height: '100%',
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    paddingVertical: 0,
  },
  multilineTextInput: {
    textAlignVertical: 'top',
    height: '100%',
  },
  clearIcon: {
    padding: 4,
    marginLeft: 4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 6,
  },
  presetChip: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetChipActive: {
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
    borderColor: Colors.primary,
  },
  presetChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 4,
    marginLeft: 2,
  },
  // Type Grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 4,
  },
  typeCard: {
    width: '31%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardActive: {
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
    borderColor: Colors.primary,
  },
  typeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  typeIconBoxActive: {
    backgroundColor: 'rgba(230, 162, 60, 0.2)',
  },
  typeText: {
    fontWeight: '500',
    fontSize: 11,
  },
  typeTextActive: {
    fontWeight: '700',
  },
  // Frequency Rows
  frequencyList: {
    gap: Spacing.xs,
    marginTop: 4,
  },
  frequencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  frequencyRowActive: {
    backgroundColor: 'rgba(230, 162, 60, 0.08)',
    borderColor: Colors.primary,
  },
  frequencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  frequencyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyIconCircleActive: {
    backgroundColor: 'rgba(230, 162, 60, 0.2)',
  },
  frequencyTitle: {
    fontWeight: '600',
  },
  frequencyTitleActive: {
    color: Colors.primary,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  // Info Box for As Needed
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(230, 162, 60, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(230, 162, 60, 0.25)',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: 4,
  },
  infoIcon: {
    marginRight: Spacing.xs,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  infoDescription: {
    lineHeight: 18,
  },
  // Time Slot Cards
  timeSlotsContainer: {
    gap: Spacing.sm,
    marginTop: 4,
  },
  timeSlotCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  timeSlotLabel: {
    fontWeight: '700',
  },
  currentTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  timePresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  timeChip: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 5,
  },
  timeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeChipText: {
    fontWeight: '500',
    fontSize: 11,
  },
  timeChipTextActive: {
    fontWeight: '700',
  },
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceSecondary,
  },
  customTimeLabel: {
    marginRight: Spacing.xs,
  },
  customTimeInput: {
    flex: 1,
    height: 32,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.xs,
    color: Colors.textPrimary,
    fontSize: 12,
  },
  // Date Section
  dateSection: {
    gap: Spacing.md,
  },
  dateField: {
    gap: Spacing.xxs,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});
