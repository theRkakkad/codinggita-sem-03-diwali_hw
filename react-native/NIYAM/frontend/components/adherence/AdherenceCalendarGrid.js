import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from '../ui/AppText';
import {
  MONTH_NAMES_FULL,
  WEEKDAYS_SHORT,
  calculateDayStats,
  ADHERENCE_RECORDS,
} from '../../constants/adherenceData';

/**
 * AdherenceCalendarGrid (Phase 12)
 * Interactive monthly calendar with month navigation, day selection,
 * and adherence state indicators (Green, Amber, Muted Red, Grey).
 */
export default function AdherenceCalendarGrid({
  currentYear,
  currentMonth,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onTodayPress,
  records = ADHERENCE_RECORDS,
}) {
  const monthName = MONTH_NAMES_FULL[currentMonth] || '';
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 6 = Sat

  // Today reference for highlighting today's date
  const now = new Date();
  const isViewingCurrentMonth =
    now.getFullYear() === currentYear && now.getMonth() === currentMonth;
  const todayDateNumber = now.getDate();

  // Generate calendar days grid including padding empty cells for weekday alignment
  const calendarCells = [];

  // Padding cells before day 1
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarCells.push({ key: `pad-prev-${i}`, dayNumber: null });
  }

  // Days 1 through daysInMonth
  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateKey = `${currentYear}-${monthStr}-${dayStr}`;

    const dayDoses = records[dateKey] || [];
    const stats = calculateDayStats(dayDoses);

    calendarCells.push({
      key: dateKey,
      dayNumber: day,
      dateKey,
      isToday: isViewingCurrentMonth && day === todayDateNumber,
      isSelected: selectedDate === dateKey,
      stats,
      hasActivity: dayDoses.length > 0,
    });
  }

  // Helper to render indicator dot based on Phase 12 visual specifications
  const renderIndicator = (stats, isSelected) => {
    if (!stats || stats.total === 0) {
      return <View style={styles.emptyDotPlaceholder} />;
    }

    let dotColor = Colors.textMuted;
    if (stats.indicatorState === 'all_taken') {
      dotColor = Colors.success; // Green: All scheduled doses taken
    } else if (stats.indicatorState === 'pending_or_skipped') {
      dotColor = Colors.warning; // Amber: Some doses remain pending or skipped
    } else if (stats.indicatorState === 'missed') {
      dotColor = Colors.danger; // Muted red: At least one user-confirmed missed dose
    } else if (stats.indicatorState === 'unconfirmed') {
      dotColor = Colors.textMuted; // Grey: Unconfirmed history
    }

    return (
      <View
        style={[
          styles.indicatorDot,
          { backgroundColor: dotColor },
          isSelected && styles.indicatorDotSelected,
        ]}
      />
    );
  };

  return (
    <View style={styles.cardContainer}>
      {/* 1. MONTH NAVIGATION BAR */}
      <View style={styles.navBar}>
        <Pressable
          onPress={onPrevMonth}
          hitSlop={10}
          style={({ pressed }) => [
            styles.navArrowBtn,
            pressed && styles.navArrowPressed,
          ]}
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
        </Pressable>

        <View style={styles.monthTitleBlock}>
          <AppText variant="h2" style={styles.monthTitleText}>
            {monthName} {currentYear}
          </AppText>
          {!isViewingCurrentMonth && (
            <Pressable
              onPress={onTodayPress}
              hitSlop={6}
              style={styles.todayPill}
              accessibilityLabel="Jump to today"
            >
              <AppText variant="caption" color={Colors.primary} style={styles.todayPillText}>
                Jump to Today
              </AppText>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={onNextMonth}
          hitSlop={10}
          style={({ pressed }) => [
            styles.navArrowBtn,
            pressed && styles.navArrowPressed,
          ]}
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
        </Pressable>
      </View>

      {/* 2. WEEKDAY HEADER LABELS */}
      <View style={styles.weekdaysRow}>
        {WEEKDAYS_SHORT.map((dayName, idx) => {
          const isWeekend = idx === 0 || idx === 6;
          return (
            <View key={dayName} style={styles.weekdayCol}>
              <AppText
                variant="caption"
                color={isWeekend ? Colors.textMuted : Colors.textSecondary}
                style={styles.weekdayText}
              >
                {dayName}
              </AppText>
            </View>
          );
        })}
      </View>

      {/* 3. CALENDAR DAYS GRID */}
      <View style={styles.gridContainer}>
        {calendarCells.map((cell) => {
          if (!cell.dayNumber) {
            return <View key={cell.key} style={styles.emptyDayCell} />;
          }

          const { isToday, isSelected, stats } = cell;

          return (
            <Pressable
              key={cell.key}
              onPress={() => onSelectDate(cell.dateKey)}
              style={({ pressed }) => [
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isToday && !isSelected && styles.dayCellToday,
                pressed && styles.dayCellPressed,
              ]}
              accessibilityLabel={`${monthName} ${cell.dayNumber}, ${currentYear}. ${
                stats.total > 0
                  ? `${stats.taken} of ${stats.total} taken.`
                  : 'No scheduled doses.'
              }`}
            >
              <AppText
                variant="body"
                color={
                  isSelected
                    ? '#171A19' // Dark high-contrast text on bright amber selection
                    : isToday
                    ? Colors.primary
                    : Colors.textPrimary
                }
                style={[
                  styles.dayNumberText,
                  isSelected && styles.dayNumberSelected,
                  isToday && !isSelected && styles.dayNumberToday,
                ]}
              >
                {cell.dayNumber}
              </AppText>

              {/* Status Indicator Dot */}
              {renderIndicator(stats, isSelected)}
            </Pressable>
          );
        })}
      </View>

      {/* 4. VISUAL LEGEND */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
          <AppText variant="caption" color={Colors.textMuted} style={styles.legendLabel}>
            All Taken
          </AppText>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
          <AppText variant="caption" color={Colors.textMuted} style={styles.legendLabel}>
            Pending / Skipped
          </AppText>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} />
          <AppText variant="caption" color={Colors.textMuted} style={styles.legendLabel}>
            Missed (Confirmed)
          </AppText>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.textMuted }]} />
          <AppText variant="caption" color={Colors.textMuted} style={styles.legendLabel}>
            Unconfirmed / Idle
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.cardPadding,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  // Month Navigation
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  monthTitleBlock: {
    alignItems: 'center',
  },
  monthTitleText: {
    fontWeight: '700',
    fontSize: 18,
  },
  todayPill: {
    marginTop: 2,
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(230, 162, 60, 0.25)',
  },
  todayPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  navArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowPressed: {
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
    borderColor: Colors.primary,
  },
  // Weekday Headers
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  weekdayCol: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontWeight: '600',
    fontSize: 11,
  },
  // Calendar Days Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emptyDayCell: {
    width: '14.28%',
    height: 48,
  },
  dayCell: {
    width: '14.28%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(230, 162, 60, 0.08)',
  },
  dayCellPressed: {
    opacity: 0.8,
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dayNumberSelected: {
    fontWeight: '800',
    color: '#171A19',
  },
  dayNumberToday: {
    fontWeight: '700',
    color: Colors.primary,
  },
  indicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 3,
  },
  indicatorDotSelected: {
    backgroundColor: '#171A19',
  },
  emptyDotPlaceholder: {
    width: 5,
    height: 5,
    marginTop: 3,
  },
  // Legend
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
