import axios from "./axios";

export const getAppointmentRequests = async () => {
  const response = await axios.get("/doctor/appointment-requests");
  return response.data;
};

export const approveAppointment = async (id) => {
  const response = await axios.patch(`/doctor/appointments/${id}/approve`);
  return response.data;
};

export const rejectAppointment = async (id) => {
  const response = await axios.patch(`/doctor/appointments/${id}/reject`);
  return response.data;
};

export const rescheduleAppointment = async (id, date, time) => {
  const response = await axios.patch(`/doctor/appointments/${id}/reschedule`, {
    appointment_date: date,
    appointment_time: time
  });
  return response.data;
};

export const getSchedule = async (date = null, status = 'all') => {
  let url = "/doctor/schedule";
  const params = new URLSearchParams();
  if (date) params.append("date", date);
  if (status) params.append("status", status);
  if (params.toString()) url += `?${params.toString()}`;
  
  const response = await axios.get(url);
  return response.data;
};

export const getScheduleSlots = async (date) => {
  const response = await axios.get(`/doctor/schedule/slots?date=${date}`);
  return response.data;
};

export const generateScheduleSlots = async (horizonDays = 60) => {
  const response = await axios.post("/doctor/schedule/generate", { horizon_days: horizonDays });
  return response.data;
};

export const getScheduleSettings = async () => {
  const response = await axios.get("/doctor/schedule/settings");
  return response.data;
};

export const updateScheduleSettings = async (payload) => {
  const response = await axios.put("/doctor/schedule/settings", payload);
  return response.data;
};

export const blockSlot = async (slotId) => {
  const response = await axios.patch(`/doctor/slots/${slotId}/block`);
  return response.data;
};

export const unblockSlot = async (slotId) => {
  const response = await axios.patch(`/doctor/slots/${slotId}/unblock`);
  return response.data;
};

export const extendAppointment = async (appointmentId, minutes) => {
  const response = await axios.post(`/doctor/appointments/${appointmentId}/extend`, { minutes });
  return response.data;
};

export const completeAppointment = async (id) => {
  const response = await axios.patch(`/doctor/appointments/${id}/complete`);
  return response.data;
};

export const cancelAppointment = async (id) => {
  const response = await axios.patch(`/doctor/appointments/${id}/cancel`);
  return response.data;
};

export const markNoShow = async (id) => {
  const response = await axios.patch(`/doctor/appointments/${id}/no-show`);
  return response.data;
};

export const getAppointmentHistory = async () => {
  const response = await axios.get("/doctor/appointments/history");
  return response.data;
};

export const getDoctorStats = async () => {
  const response = await axios.get("/doctor/stats");
  return response.data;
};

export const getPatients = async () => {
  const response = await axios.get("/doctor/patients");
  return response.data;
};

export const getPatientRecords = async (patientId) => {
  const response = await axios.get(`/doctor/patients/${patientId}/records`);
  return response.data;
};

export const getPatientDossier = async (patientId) => {
  const response = await axios.get(`/doctor/patients/${patientId}/dossier`);
  return response.data;
};

export const saveClinicalRemark = async (patientId, content) => {
  const response = await axios.post(`/doctor/patients/${patientId}/remarks`, { content });
  return response.data;
};

export const getClinicalRemarks = async (patientId) => {
  const response = await axios.get(`/doctor/patients/${patientId}/remarks`);
  return response.data;
};

// ============================================
// DOCTOR SETTINGS API (New Refactored Routes)
// ============================================

export const getAllDoctorSettings = async () => {
  const response = await axios.get("/api/doctor/settings/");
  return response.data;
};

export const updateDoctorScheduleConfig = async (payload) => {
  const response = await axios.put("/api/doctor/settings/schedule", payload);
  return response.data;
};

export const updateDoctorNotificationSettings = async (payload) => {
  const response = await axios.put("/api/doctor/settings/notifications", payload);
  return response.data;
};

export const updateDoctorPrivacySettings = async (payload) => {
  const response = await axios.put("/api/doctor/settings/privacy", payload);
  return response.data;
};

export const updateDoctorConsultationSettings = async (payload) => {
  const response = await axios.put("/api/doctor/settings/consultation", payload);
  return response.data;
};

export const updateDoctorAccount = async (payload) => {
  const response = await axios.put("/api/doctor/settings/account", payload);
  return response.data;
};

export const changeDoctorPassword = async (payload) => {
  const response = await axios.post("/api/doctor/settings/change-password", payload);
  return response.data;
};

// ============================================
// CLINICAL PINS API
// ============================================

export const getClinicalPins = async () => {
  const response = await axios.get("/doctor/pins");
  return response.data;
};

export const createClinicalPin = async (payload) => {
  const response = await axios.post("/doctor/pins", payload);
  return response.data;
};

export const updateClinicalPin = async (id, payload) => {
  const response = await axios.patch(`/doctor/pins/${id}`, payload);
  return response.data;
};

export const deleteClinicalPin = async (id) => {
  const response = await axios.delete(`/doctor/pins/${id}`);
  return response.data;
};
