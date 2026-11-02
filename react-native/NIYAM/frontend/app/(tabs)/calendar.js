import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from '../../components/ui/AppText';
import {
  calculateMonthStats,
  MONTH_NAMES_FULL,
} from '../../constants/adherenceData';
import AdherenceCalendarGrid from '../../components/adherence/AdherenceCalendarGrid';
import DailyDoseHistoryCard from '../../components/adherence/DailyDoseHistoryCard';
import MonthlyStatisticsCard from '../../components/adherence/MonthlyStatisticsCard';
import { doseEventService } from '../../services/doseEventService';

/**
 * Helper to build YYYY-MM-DD date key from Date object
 */
function toDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * NIYAM Adherence & History Screen (Phase 12 & Phase 19 Live Integration)
 * Complete adherence interface with interactive monthly calendar,
 * date-driven dose history, evaluated compliance rates, and monthly statistics connected to MongoDB.
 */
export default function CalendarScreen() {
  const today = useMemo(() => new Date(), []);

  // Calendar month & date selection local state
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));

  // Live dose event state
  const [liveEvents, setLiveEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Current month label for the screen header
  const currentMonthLabel = MONTH_NAMES_FULL[currentMonth] || '';

  // Fetch month dose events from MongoDB
  const loadMonthEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setApiError(null);

    try {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const startDate = `${currentYear}-${monthStr}-01`;
      const endDate = `${currentYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

      const events = await doseEventService.getDoseEvents({ startDate, endDate });
      setLiveEvents(events);
    } catch (err) {
      console.warn('Load calendar dose events error:', err.message);
      setApiError(err.message || 'Unable to load adherence records from server.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    loadMonthEvents();
  }, [loadMonthEvents]);

  // Group events by YYYY-MM-DD date key
  const activeRecords = useMemo(() => {
    const map = {};
    for (const ev of liveEvents) {
      if (!ev.scheduledAt) continue;
      const dateKey = typeof ev.scheduledAt === 'string'
        ? ev.scheduledAt.split('T')[0]
        : toDateKey(new Date(ev.scheduledAt));

      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(ev);
    }
    return map;
  }, [liveEvents]);

  // Get daily dose records for currently selected date
  const selectedDayDoses = useMemo(() => {
    return activeRecords[selectedDate] || [];
  }, [activeRecords, selectedDate]);

  // Compute monthly statistics dynamically for currently viewed month
  const monthStats = useMemo(() => {
    return calculateMonthStats(currentYear, currentMonth, activeRecords);
  }, [currentYear, currentMonth, activeRecords]);

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      const newYear = currentYear - 1;
      const newMonth = 11;
      setCurrentYear(newYear);
      setCurrentMonth(newMonth);
      updateSelectedDateForNewMonth(newYear, newMonth);
    } else {
      const newMonth = currentMonth - 1;
      setCurrentMonth(newMonth);
      updateSelectedDateForNewMonth(currentYear, newMonth);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      const newYear = currentYear + 1;
      const newMonth = 0;
      setCurrentYear(newYear);
      setCurrentMonth(newMonth);
      updateSelectedDateForNewMonth(newYear, newMonth);
    } else {
      const newMonth = currentMonth + 1;
      setCurrentMonth(newMonth);
      updateSelectedDateForNewMonth(currentYear, newMonth);
    }
  };

  // Jump back to today handler
  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(toDateKey(now));
  };

  // When month changes, keep selected date if within that month; otherwise select day 1
  const updateSelectedDateForNewMonth = (year, monthIndex) => {
    const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    if (!selectedDate.startsWith(monthPrefix)) {
      setSelectedDate(`${monthPrefix}-01`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadMonthEvents(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* 1. SCREEN HEADER (Phase 12 Requirement A) */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerLabelRow}>
              <Ionicons name="fitness-outline" size={13} color={Colors.primary} style={{ marginRight: 4 }} />
              <AppText variant="label" color={Colors.primary}>
                HEALTH ADHERENCE
              </AppText>
            </View>

            <AppText variant="h1" style={styles.title}>
              Adherence
            </AppText>

            <AppText variant="secondary" color={Colors.textSecondary} style={styles.subtitle}>
              Your progress, one dose at a time.
            </AppText>
          </View>

          {/* Current Month & Year Header Badge */}
          <View style={styles.headerMonthBadge}>
            <Ionicons name="calendar-outline" size={14} color={Colors.primary} style={{ marginRight: 5 }} />
            <AppText variant="caption" color={Colors.textPrimary} style={styles.headerMonthText}>
              {currentMonthLabel} {currentYear}
            </AppText>
          </View>
        </View>

        {/* API Error Feedback Banner */}
        {apiError && (
          <View style={styles.apiErrorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} style={{ marginRight: 8 }} />
            <AppText variant="caption" color={Colors.danger} style={{ flex: 1 }}>
              {apiError}
            </AppText>
            <Pressable onPress={() => loadMonthEvents()} style={styles.retryChip}>
              <AppText variant="caption" color={Colors.primary} style={{ fontWeight: '600' }}>
                Retry
              </AppText>
            </Pressable>
          </View>
        )}

        {/* 2. MONTHLY CALENDAR (Phase 12 Requirement B) */}
        <AdherenceCalendarGrid
          currentYear={currentYear}
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onTodayPress={handleJumpToToday}
          records={activeRecords}
        />

        {/* 3. SELECTED DAY SUMMARY & DAILY DOSE HISTORY (Phase 12 Requirement C & D) */}
        <DailyDoseHistoryCard
          selectedDate={selectedDate}
          doses={selectedDayDoses}
        />

        {/* 4. MONTHLY STATISTICS (Phase 12 Requirement 4) */}
        <MonthlyStatisticsCard monthStats={monthStats} />
      </ScrollView>
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
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  headerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    marginTop: 2,
    marginBottom: 2,
  },
  subtitle: {
    lineHeight: 20,
  },
  headerMonthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginTop: 4,
  },
  headerMonthText: {
    fontWeight: '700',
    fontSize: 11,
  },
  // Error Feedback Banner
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
});
