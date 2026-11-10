// NIYAM Dashboard Sample Data & Types (Phase 08)
// Represents realistic daily medication schedule and adherence statistics.

export const INITIAL_USER = {
  name: 'Rachit',
  greeting: 'Good morning,',
  subtitle: "Let's stay consistent today.",
};

// 4 Scheduled doses: 2 Taken, 1 Pending (Next dose), 1 Missed => 50% Adherence
export const INITIAL_DOSES = [
  {
    id: 'dose-1',
    name: 'Vitamin D3',
    dosage: '1 capsule',
    time: '02:00 PM',
    status: 'pending', // Active Next Dose
    instructions: 'Take 1 capsule with food after lunch.',
    category: 'Bone & Immunity',
    iconName: 'pill',
  },
  {
    id: 'dose-2',
    name: 'Paracetamol',
    dosage: '1 tablet',
    time: '09:00 AM',
    status: 'taken',
    instructions: 'Take 1 tablet with warm water after breakfast.',
    category: 'Pain Relief',
    iconName: 'medical',
  },
  {
    id: 'dose-3',
    name: 'Omega-3',
    dosage: '1 capsule',
    time: '08:00 PM',
    status: 'taken',
    instructions: 'Take 1 capsule with water after evening meal.',
    category: 'Heart Health',
    iconName: 'fish',
  },
  {
    id: 'dose-4',
    name: 'Vitamin C',
    dosage: '1 tablet',
    time: '10:00 AM',
    status: 'missed',
    instructions: 'Daily immunity supplement taken before noon.',
    category: 'Daily Vitamins',
    iconName: 'shield',
  },
];

// Helper to format dynamic current date without hardcoding
export function getDynamicDateString(date = new Date()) {
  const now = date instanceof Date ? date : new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

// Dynamic real-time greeting based on hour of day
export function getTimeAwareGreeting(date = new Date()) {
  const now = date instanceof Date ? date : new Date();
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning,';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon,';
  }
  if (hour >= 17 && hour < 22) {
    return 'Good evening,';
  }
  return 'Good night,';
}
