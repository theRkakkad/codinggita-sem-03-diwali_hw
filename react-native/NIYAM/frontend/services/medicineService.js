import { Platform } from 'react-native';
import api, { getApiBaseUrl } from './api';
import { authStorage } from './authStorage';

/**
 * Normalizes a backend medicine MongoDB document for consistent frontend consumption.
 * @param {object} item
 * @returns {object}
 */
export const normalizeMedicine = (item) => {
  if (!item) return null;

  const id = item._id || item.id;
  const reminderTimes = Array.isArray(item.reminderTimes) ? item.reminderTimes : [];
  const time =
    item.time ||
    (reminderTimes.length > 0 ? reminderTimes.join(', ') : 'As prescribed');

  // Format dates for UI display
  let startDate = item.startDate;
  if (startDate && typeof startDate === 'string' && startDate.includes('T')) {
    try {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        startDate = `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
      }
    } catch (e) {
      // keep raw string
    }
  }

  let endDate = item.endDate;
  if (endDate && typeof endDate === 'string' && endDate.includes('T')) {
    try {
      const d = new Date(endDate);
      if (!isNaN(d.getTime())) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        endDate = `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
      }
    } catch (e) {
      // keep raw string
    }
  }

  const prescription = item.prescription;
  const attachment = prescription
    ? {
        name: prescription.fileName,
        type: prescription.fileType,
        mimeType: prescription.mimeType,
        size: prescription.fileSize,
        uri: prescription.fileUrl,
        uploadedAt: prescription.uploadedAt,
      }
    : item.attachment || null;

  return {
    ...item,
    id,
    _id: item._id || item.id,
    time,
    reminderTimes,
    startDate,
    endDate,
    status: item.status || 'Active',
    category:
      item.category ||
      (item.type === 'Capsule' || item.type === 'Tablet' ? 'Prescription' : item.type),
    attachment,
    rxDocument: prescription?.fileName || item.rxDocument || null,
  };
};

/**
 * Service for Medicine CRUD and prescription attachment operations.
 */
export const medicineService = {
  /**
   * Fetch all medicines for the authenticated user
   * GET /api/medicines
   * @param {object} [params]
   * @param {string} [params.status] 'Active' | 'Paused' | 'Completed'
   * @param {string} [params.search]
   * @returns {Promise<Array>}
   */
  async getMedicines(params = {}) {
    const query = {};
    if (params.status && params.status !== 'All') {
      query.status = params.status;
    }
    if (params.search && params.search.trim().length > 0) {
      query.search = params.search.trim();
    }

    const response = await api.get('/api/medicines', { params: query });
    const medicines = response.data?.medicines || [];
    return medicines.map(normalizeMedicine);
  },

  /**
   * Fetch a single medicine by ID
   * GET /api/medicines/:id
   * @param {string} id
   * @returns {Promise<object>}
   */
  async getMedicineById(id) {
    const response = await api.get(`/api/medicines/${id}`);
    return normalizeMedicine(response.data?.medicine);
  },

  /**
   * Create a new medicine
   * POST /api/medicines
   * @param {object} medicineData
   * @returns {Promise<object>}
   */
  async createMedicine(medicineData) {
    // Format reminderTimes array based on frequency if passed as string
    let reminderTimes = medicineData.reminderTimes;
    if (!reminderTimes && medicineData.time) {
      if (medicineData.frequency === 'As needed') {
        reminderTimes = [];
      } else {
        reminderTimes = medicineData.time
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    // Convert date strings to ISO dates if necessary
    let startDate = medicineData.startDate;
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        startDate = d.toISOString();
      }
    } else {
      startDate = new Date().toISOString();
    }

    let endDate = medicineData.endDate;
    if (endDate && endDate.trim().length > 0) {
      const d = new Date(endDate);
      if (!isNaN(d.getTime())) {
        endDate = d.toISOString();
      } else {
        endDate = undefined;
      }
    } else {
      endDate = undefined;
    }

    const payload = {
      name: medicineData.name?.trim(),
      dosage: medicineData.dosage?.trim(),
      type: medicineData.type,
      instructions: medicineData.instructions?.trim() || '',
      frequency: medicineData.frequency,
      reminderTimes: reminderTimes || [],
      startDate,
      endDate,
      status: medicineData.status || 'Active',
    };

    const response = await api.post('/api/medicines', payload);
    const createdMedicine = response.data?.medicine;

    // If an attachment file was provided, upload it to /api/medicines/:id/prescription
    if (medicineData.attachment && (medicineData.attachment.uri || medicineData.attachment.file)) {
      try {
        const uploadedWithRx = await this.uploadPrescription(
          createdMedicine._id,
          medicineData.attachment
        );
        return normalizeMedicine(uploadedWithRx.medicine || createdMedicine);
      } catch (attachErr) {
        console.warn('Prescription upload warning on create:', attachErr.message);
        const err = new Error(
          `Medicine "${createdMedicine.name}" was saved, but prescription upload failed: ${attachErr.message}`
        );
        err.createdMedicine = normalizeMedicine(createdMedicine);
        throw err;
      }
    }

    return normalizeMedicine(createdMedicine);
  },

  /**
   * Update an existing medicine
   * PUT /api/medicines/:id
   * @param {string} id
   * @param {object} updates
   * @returns {Promise<object>}
   */
  async updateMedicine(id, updates) {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.dosage !== undefined) payload.dosage = updates.dosage.trim();
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.instructions !== undefined) payload.instructions = updates.instructions.trim();
    if (updates.frequency !== undefined) payload.frequency = updates.frequency;
    if (updates.status !== undefined) payload.status = updates.status;

    if (updates.reminderTimes !== undefined) {
      payload.reminderTimes = updates.reminderTimes;
    } else if (updates.time && updates.frequency) {
      if (updates.frequency === 'As needed') {
        payload.reminderTimes = [];
      } else {
        payload.reminderTimes = updates.time
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    if (updates.startDate) {
      const d = new Date(updates.startDate);
      if (!isNaN(d.getTime())) payload.startDate = d.toISOString();
    }

    if (updates.endDate !== undefined) {
      if (updates.endDate && updates.endDate.trim().length > 0) {
        const d = new Date(updates.endDate);
        if (!isNaN(d.getTime())) payload.endDate = d.toISOString();
      } else {
        payload.endDate = null;
      }
    }

    const response = await api.put(`/api/medicines/${id}`, payload);
    let updatedMedicine = response.data?.medicine;

    // Check if attachment was newly selected, replaced, or removed
    const isNewAttachment = Boolean(
      updates.attachment &&
        (updates.attachment.isNew ||
          (updates.attachment.uri &&
            (updates.attachment.uri.startsWith('file:') ||
              updates.attachment.uri.startsWith('blob:') ||
              updates.attachment.uri.startsWith('content:') ||
              updates.attachment.uri.startsWith('data:'))) ||
          updates.attachment.file)
    );

    if (isNewAttachment) {
      try {
        const uploaded = await this.uploadPrescription(id, updates.attachment);
        updatedMedicine = uploaded.medicine || updatedMedicine;
      } catch (rxErr) {
        console.warn('Prescription upload warning on update:', rxErr.message);
        throw rxErr;
      }
    } else if (updates.attachment === null && updates.hadAttachment) {
      try {
        await this.deletePrescription(id);
        if (updatedMedicine) {
          updatedMedicine.prescription = undefined;
        }
      } catch (rxErr) {
        console.warn('Prescription deletion warning on update:', rxErr.message);
        throw rxErr;
      }
    }

    return normalizeMedicine(updatedMedicine);
  },

  /**
   * Delete a medicine
   * DELETE /api/medicines/:id
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteMedicine(id) {
    const response = await api.delete(`/api/medicines/${id}`);
    return response.data?.success || true;
  },

  /**
   * Upload prescription file to medicine
   * POST /api/medicines/:id/prescription
   * @param {string} id
   * @param {object} file
   * @returns {Promise<object>}
   */
  async uploadPrescription(id, file) {
    const formData = new FormData();
    const fileName = file.name || (file.type === 'pdf' ? 'prescription.pdf' : 'prescription.jpg');
    const mimeType = file.mimeType || (file.type === 'pdf' ? 'application/pdf' : 'image/jpeg');

    if (Platform.OS === 'web' && file.file instanceof File) {
      formData.append('prescription', file.file, fileName);
    } else if (Platform.OS === 'web' && file.uri && file.uri.startsWith('blob:')) {
      try {
        const blobRes = await fetch(file.uri);
        const blob = await blobRes.blob();
        formData.append('prescription', blob, fileName);
      } catch (e) {
        formData.append('prescription', {
          uri: file.uri,
          name: fileName,
          type: mimeType,
        });
      }
    } else {
      formData.append('prescription', {
        uri: file.uri,
        name: fileName,
        type: mimeType,
      });
    }

    const headers = {};
    if (Platform.OS !== 'web') {
      headers['Content-Type'] = 'multipart/form-data';
    }

    const response = await api.post(`/api/medicines/${id}/prescription`, formData, {
      headers,
    });

    return response.data;
  },

  /**
   * Delete prescription file from medicine
   * DELETE /api/medicines/:id/prescription
   * @param {string} id
   * @returns {Promise<object>}
   */
  async deletePrescription(id) {
    const response = await api.delete(`/api/medicines/${id}/prescription`);
    return response.data;
  },

  /**
   * Resolve authenticated streaming or download URL for prescription
   * @param {string} id
   * @param {boolean} [download=false]
   * @returns {Promise<string>}
   */
  async getPrescriptionUrl(id, download = false) {
    const token = await authStorage.getToken();
    const baseUrl = getApiBaseUrl();
    const query = [];
    if (download) query.push('download=true');
    if (token) query.push(`token=${encodeURIComponent(token)}`);
    const qStr = query.length > 0 ? `?${query.join('&')}` : '';
    return `${baseUrl}/api/medicines/${id}/prescription${qStr}`;
  },
};

export default medicineService;
