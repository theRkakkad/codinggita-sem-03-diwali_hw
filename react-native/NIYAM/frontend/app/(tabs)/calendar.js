import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from '../../components/ui/AppText';
import {
  ADHERENCE_RECORDS,
  calculateMonthStats,
  MONTH_NAMES_FULL,
} from '../../constants/adherenceData';
import AdherenceCalendarGrid from '../../components/adherence/AdherenceCalendarGrid';
import DailyDoseHistoryCard from '../../components/adherence/DailyDoseHistoryCard';
import MonthlyStatisticsCard from '../../components/adherence/MonthlyStatisticsCard';

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
 * NIYAM Adherence & History Screen (Phase 12)
 * Complete adherence interface with interactive monthly calendar,
 * date-driven dose history, evaluated compliance rates, and monthly statistics.
 */
export default function CalendarScreen() {
  const today = useMemo(() => new Date(), []);

  // Calendar month & date selection local state
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed (10 = November)
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));

  // Current month label for the screen header
  const currentMonthLabel = MONTH_NAMES_FULL[currentMonth] || '';

  // Get daily dose records for currently selected date
  const selectedDayDoses = useMemo(() => {
    return ADHERENCE_RECORDS[selectedDate] || [];
  }, [selectedDate]);

  // Compute monthly statistics dynamically for currently viewed month
  const monthStats = useMemo(() => {
    return calculateMonthStats(currentYear, currentMonth, ADHERENCE_RECORDS);
  }, [currentYear, currentMonth]);

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

        {/* 2. MONTHLY CALENDAR (Phase 12 Requirement B) */}
        <AdherenceCalendarGrid
          currentYear={currentYear}
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onTodayPress={handleJumpToToday}
          records={ADHERENCE_RECORDS}
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
});
