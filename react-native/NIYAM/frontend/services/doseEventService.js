import api from './api';

/**
 * Format a Date object or ISO string into "hh:mm A" (e.g., "09:00 AM")
 * @param {string|Date} dateInput
 * @returns {string}
 */
export const formatTime = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const strHours = String(hours).padStart(2, '0');
  return `${strHours}:${minutes} ${ampm}`;
};

/**
 * Normalizes a backend dose event MongoDB document for frontend views
 * @param {object} event
 * @returns {object}
 */
export const normalizeDoseEvent = (event) => {
  if (!event) return null;

  const id = event._id || event.id;
  const med = typeof event.medicineId === 'object' && event.medicineId !== null ? event.medicineId : {};

  const status = (event.status || 'pending').toLowerCase();
  const timeFormatted = formatTime(event.scheduledAt);
  const actualTimeFormatted = event.takenAt ? formatTime(event.takenAt) : undefined;

  const type = med.type || event.type || 'Tablet';
  const category =
    type === 'Capsule' || type === 'Tablet' ? 'Prescription' : type || 'Medication';

  return {
    ...event,
    id,
    _id: id,
    medicineId: med._id || (typeof event.medicineId === 'string' ? event.medicineId : event.medicineId),
    name: med.name || event.name || 'Medication',
    dosage: med.dosage || event.dosage || '',
    type,
    instructions: med.instructions || event.instructions || '',
    frequency: med.frequency || event.frequency || '',
    status,
    scheduledAt: event.scheduledAt,
    scheduledTime: timeFormatted,
    time: timeFormatted,
    takenAt: event.takenAt,
    actualTime: actualTimeFormatted,
    category,
    notes: event.notes || null,
    missedReason: event.missedReason || null,
  };
};

/**
 * Service for Dose Event fetching and status transitions
 */
export const doseEventService = {
  /**
   * Get dose events with optional filters
   * GET /api/dose-events
   * @param {object} [params]
   * @param {string} [params.date] 'YYYY-MM-DD'
   * @param {string} [params.startDate]
   * @param {string} [params.endDate]
   * @param {string} [params.status]
   * @param {string} [params.medicineId]
   * @returns {Promise<Array>}
   */
  async getDoseEvents(params = {}) {
    const enrichedParams = { ...params };
    if (enrichedParams.date && enrichedParams.timezoneOffset === undefined) {
      enrichedParams.timezoneOffset = new Date().getTimezoneOffset();
    }
    const response = await api.get('/api/dose-events', { params: enrichedParams });
    const events = response.data?.doseEvents || [];
    return events.map(normalizeDoseEvent);
  },

  /**
   * Get single dose event by ID
   * GET /api/dose-events/:id
   * @param {string} id
   * @returns {Promise<object>}
   */
  async getDoseEventById(id) {
    const response = await api.get(`/api/dose-events/${id}`);
    return normalizeDoseEvent(response.data?.doseEvent);
  },

  /**
   * Create a scheduled dose event
   * POST /api/dose-events
   * @param {object} payload
   * @param {string} payload.medicineId
   * @param {string|Date} payload.scheduledAt
   * @param {string} [payload.notes]
   * @returns {Promise<object>}
   */
  async createDoseEvent(payload) {
    const response = await api.post('/api/dose-events', payload);
    return normalizeDoseEvent(response.data?.doseEvent);
  },

  /**
   * Mark a dose as taken
   * PATCH /api/dose-events/:id/taken
   * @param {string} id
   * @param {string|Date} [takenAt]
   * @returns {Promise<object>}
   */
  async markDoseAsTaken(id, takenAt = null) {
    const body = takenAt ? { takenAt } : {};
    const response = await api.patch(`/api/dose-events/${id}/taken`, body);
    return normalizeDoseEvent(response.data?.doseEvent);
  },

  /**
   * Mark a dose as skipped
   * PATCH /api/dose-events/:id/skipped
   * @param {string} id
   * @param {string} [reason]
   * @returns {Promise<object>}
   */
  async markDoseAsSkipped(id, reason = null) {
    const body = reason ? { reason } : {};
    const response = await api.patch(`/api/dose-events/${id}/skipped`, body);
    return normalizeDoseEvent(response.data?.doseEvent);
  },

  /**
   * Explicitly confirm a dose as missed
   * PATCH /api/dose-events/:id/missed
   * @param {string} id
   * @param {string} [missedReason]
   * @returns {Promise<object>}
   */
  async confirmDoseAsMissed(id, missedReason = null) {
    const body = missedReason ? { missedReason } : {};
    const response = await api.patch(`/api/dose-events/${id}/missed`, body);
    return normalizeDoseEvent(response.data?.doseEvent);
  },

  /**
   * Mark a dose as unconfirmed
   * PATCH /api/dose-events/:id/unconfirmed
   * @param {string} id
   * @returns {Promise<object>}
   */
  async markDoseAsUnconfirmed(id) {
    const response = await api.patch(`/api/dose-events/${id}/unconfirmed`);
    return normalizeDoseEvent(response.data?.doseEvent);
  },

  /**
   * Rollover past pending doses to unconfirmed status
   * POST /api/dose-events/rollover
   * @param {string|Date} [beforeDate]
   * @returns {Promise<{ success: boolean, modifiedCount: number }>}
   */
  async rolloverPastPendingDoses(beforeDate = null) {
    const body = beforeDate ? { beforeDate: typeof beforeDate === 'string' ? beforeDate : beforeDate.toISOString() } : {};
    const response = await api.post('/api/dose-events/rollover', body);
    return response.data;
  },

  /**
   * Synchronize and fetch scheduled dose events for a given date from active medicines
   * POST /api/dose-events/sync
   * @param {string} [date] 'YYYY-MM-DD'
   * @returns {Promise<Array>}
   */
  async syncDailyDoses(date = null, timezoneOffset = null) {
    const tz = typeof timezoneOffset === 'number' ? timezoneOffset : new Date().getTimezoneOffset();
    const body = { ...(date ? { date } : {}), timezoneOffset: tz };
    const response = await api.post('/api/dose-events/sync', body);
    const events = response.data?.doseEvents || [];
    return events.map(normalizeDoseEvent);
  },

  /**
   * Delete a dose event
   * DELETE /api/dose-events/:id
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteDoseEvent(id) {
    const response = await api.delete(`/api/dose-events/${id}`);
    return response.data?.success || true;
  },
};

export default doseEventService;
