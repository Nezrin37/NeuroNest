import { useState, useEffect } from "react";
import { User, Calendar, Clock, FileText, Activity } from "lucide-react";
import { getDoctors, getAvailableSlots } from "../../api/appointments";
import "../../styles/appointments.css";

const AppointmentForm = ({ onSubmit, loading }) => {
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    doctor_id: "",
    doctor_name: "", // To show name in summary
    date: today,
    time: "",
    slot_id: "",
    reason: "",
    notes: "",
    priority_level: "routine",
  });

  const [doctorsList, setDoctorsList] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotHint, setSlotHint] = useState("");
  const [isDoctorPaused, setIsDoctorPaused] = useState(false);

  const toYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fetchAvailableSlots = async (doctorId, date, autoFindNext = true) => {
    if (!doctorId || !date) {
      setAvailableSlots([]);
      setSlotHint("");
      return;
    }
    setLoadingSlots(true);
    try {
      const response = await getAvailableSlots(doctorId, date);
      const normalized = Array.isArray(response?.slots) ? response.slots : [];
      const paused = response?.accepting_new_bookings === false;
      setIsDoctorPaused(paused);

      if (paused) {
        setAvailableSlots([]);
        setSlotHint(response?.message || "Doctor is not accepting new appointments currently.");
        return;
      }

      if (normalized.length > 0) {
        setAvailableSlots(normalized);
        setSlotHint("");
        return;
      }

      if (!autoFindNext) {
        setAvailableSlots([]);
        setSlotHint("No available slots on selected date.");
        return;
      }

      const start = new Date(`${date}T00:00:00`);
      for (let i = 1; i <= 30; i += 1) {
        const probe = new Date(start);
        probe.setDate(start.getDate() + i);
        const probeDate = toYMD(probe);
        const nextResp = await getAvailableSlots(doctorId, probeDate);
        if (nextResp?.accepting_new_bookings === false) {
          setAvailableSlots([]);
          setSlotHint(nextResp?.message || "Doctor is not accepting new appointments currently.");
          setIsDoctorPaused(true);
          return;
        }
        const nextNormalized = Array.isArray(nextResp?.slots) ? nextResp.slots : [];
        if (nextNormalized.length > 0) {
          setFormData((prev) => ({ ...prev, date: probeDate, slot_id: "", time: "" }));
          setAvailableSlots(nextNormalized);
          setSlotHint(`No slots on selected date. Showing next available: ${new Date(`${probeDate}T00:00:00`).toLocaleDateString("en-IN")}`);
          return;
        }
      }

      setAvailableSlots([]);
      setSlotHint("No available slots in the next 30 days.");
    } catch (err) {
      console.error("Failed to fetch slots:", err);
      setAvailableSlots([]);
      setSlotHint("Unable to load slots right now.");
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await getDoctors();
        setDoctorsList(data);
        if (Array.isArray(data) && data.length === 1) {
          const onlyDoctor = data[0];
          setFormData((prev) => ({
            ...prev,
            doctor_id: String(onlyDoctor.id),
            doctor_name: onlyDoctor.full_name || "",
          }));
          fetchAvailableSlots(String(onlyDoctor.id), today, true);
        }
      } catch (err) {
        console.error("Failed to fetch doctors:", err);
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "doctor_id") {
      setIsDoctorPaused(false);
      const selectedDoc = doctorsList.find(d => d.id === parseInt(value));
      setFormData({ 
        ...formData, 
        doctor_id: value, 
        doctor_name: selectedDoc ? selectedDoc.full_name : "",
        slot_id: "",
        time: "",
      });
      if (formData.date) fetchAvailableSlots(value, formData.date, true);
    } else if (name === "date") {
      setFormData({ ...formData, [name]: value, slot_id: "", time: "" });
      if (formData.doctor_id) fetchAvailableSlots(formData.doctor_id, value, true);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSlotSelect = (slot) => {
    const time = new Date(slot.slot_start_utc).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
    setFormData((prev) => ({
      ...prev,
      slot_id: String(slot.id),
      time,
    }));
  };

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    console.log("Manual Submit Triggered test", formData); // Debug
    // Manual validation
    if (!formData.doctor_id || !formData.date || !formData.slot_id || !formData.reason) {
        alert("Please fill in all required fields.");
        return;
    }
    setShowConfirm(true);
  };

  const handleFinalSubmit = () => {
    onSubmit(formData);
    setShowConfirm(false);
  };

  useEffect(() => {
    if (!formData.doctor_id || !formData.date) return;
    const timer = setInterval(() => {
      fetchAvailableSlots(formData.doctor_id, formData.date, false);
    }, 30000);
    return () => clearInterval(timer);
  }, [formData.doctor_id, formData.date]);

  return (
    <>
      <div className="booking-wrapper-card">
        {/* INTERNAL HEADER */}
        <div className="booking-header-internal">
            <h2>Book Appointment</h2>
            <p>Schedule your consultation with our specialists</p>
        </div>

        {/* MAIN GRID LAYOUT */}
        <div className="book-appointment-layout">
          {/* Left Side: Booking Form */}
          <div className="booking-form-section">
            <div className="book-appointment-card compact-card">
              
                
                <span className="form-section-title">Appointment Details</span>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Select Doctor</label>
                    <select
                      name="doctor_id"
                      value={formData.doctor_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">
                        {loadingDoctors ? "Loading specialists..." : "Choose a specialist..."}
                      </option>
                      {doctorsList.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.full_name} - {doc.specialization}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      name="date"
                      min={today}
                      value={formData.date}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Select Slot</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: "12px", marginTop: "8px" }}>
                      {loadingSlots ? (
                        <span style={{ fontSize: "12px", color: "#64748b" }}>Loading slots...</span>
                      ) : isDoctorPaused ? (
                        <span style={{ fontSize: "12px", color: "#ef4444" }}>
                          Doctor is not accepting new appointments currently.
                        </span>
                      ) : !formData.doctor_id ? (
                        <span style={{ fontSize: "12px", color: "#64748b" }}>Select doctor first</span>
                      ) : !formData.date ? (
                        <span style={{ fontSize: "12px", color: "#64748b" }}>Select date first</span>
                      ) : availableSlots.length === 0 ? (
                        <span style={{ fontSize: "12px", color: "#64748b" }}>No available slots</span>
                      ) : (
                        availableSlots.map((slot) => {
                          const slotLabel = new Date(slot.slot_start_utc).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                            timeZone: "Asia/Kolkata",
                          });
                          const selected = String(slot.id) === String(formData.slot_id);
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => handleSlotSelect(slot)}
                              className={`slot-select-btn ${selected ? "selected" : ""}`}
                            >
                              {slotLabel}
                            </button>
                          );
                        })
                      )}
                    </div>
                    {slotHint && <span style={{ fontSize: "12px", color: "#64748b", marginTop: "8px", display: "inline-block" }}>{slotHint}</span>}
                  </div>
                </div>


                <span className="form-section-title" style={{ marginTop: '20px' }}>Clinical Priority</span>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Urgency Level</label>
                    <select
                      name="priority_level"
                      value={formData.priority_level}
                      onChange={handleChange}
                      className="priority-select"
                    >
                      <option value="routine">Routine Checkup</option>
                      <option value="urgent">Urgent Attention (e.g. Fever, Pain)</option>
                      <option value="emergency">Emergency (Severe Condition)</option>
                    </select>
                  </div>
                </div>

                <span className="form-section-title" style={{ marginTop: '20px' }}>Consultation Details</span>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Reason</label>
                    <input
                      type="text"
                      name="reason"
                      placeholder="e.g., Follow-up..."
                      value={formData.reason}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      placeholder="Any symptoms?"
                      value={formData.notes}
                      onChange={handleChange}
                      className="compact-textarea"
                    />
                  </div>
                </div>

                {/* Mobile Only Submit Button */}
                <div className="mobile-submit-btn">
                  <button type="submit" className="submit-btn" disabled={loading}>
                    Review & Confirm
                  </button>
                </div>
              
            </div>
          </div>

          {/* Right Side: Sticky Summary */}
          <div className="booking-summary-section">
            <div className="summary-card">
              <h3>Booking Summary</h3>
              <div className="summary-details">
                <div className="summary-row">
                  <span className="label"><User size={16} /> Doctor</span>
                  <span className="value">{formData.doctor_name || "—"}</span>
                </div>
                <div className="summary-row">
                  <span className="label"><Calendar size={16} /> Date</span>
                  <span className="value">{formData.date ? new Date(formData.date).toLocaleDateString() : "—"}</span>
                </div>
                <div className="summary-row">
                  <span className="label"><Clock size={16} /> Slot</span>
                  <span className="value">
                    {formData.time
                      ? new Date(`1970-01-01T${formData.time}:00`).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "—"}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="label"><FileText size={16} /> Reason</span>
                  <span className="value">{formData.reason || "—"}</span>
                </div>
                <div className="summary-row">
                  <span className="label"><Activity size={16} /> Urgency</span>
                  <span className="value" style={{ 
                    color: formData.priority_level === 'routine' ? '#10b981' : formData.priority_level === 'urgent' ? '#f59e0b' : '#ef4444',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}>{formData.priority_level}</span>
                </div>
              </div>

              <button 
                type="button"
                className="submit-btn" 
                onClick={handleInitialSubmit}
                disabled={loading}
              >
                {loading ? "Processing..." : "Confirm Appointment"}
              </button>
              <p className="terms-text">By booking, you agree to our policies.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal-overlay-backdrop" style={{ zIndex: 9999 }}>
          <div className="premium-modal-card">
            <div className="pm-header">
              <div className="pm-title-stack">
                <h3>Confirm Booking</h3>
                <span className="pm-subtitle">Please review your appointment details</span>
              </div>
              <button onClick={() => setShowConfirm(false)} className="pm-close-btn">&times;</button>
            </div>

            <div className="pm-divider"></div>
            
            <div className="confirm-summary">
              
              <div className="pm-doctor-card">
                 <div className="pm-doctor-avatar">
                    {formData.doctor_name ? formData.doctor_name.charAt(0) : "D"}
                 </div>
                 <div className="pm-doctor-info">
                    <span className="pm-doctor-name">{formData.doctor_name}</span>
                    <span className="pm-doctor-spec">Specialist</span>
                 </div>
              </div>

              <div className="pm-slot-comparison" style={{ justifyContent: 'center', gap: '40px' }}>
                 <div className="pm-slot-box" style={{ alignItems: 'center', textAlign: 'center' }}>
                    <span className="pm-slot-label">Date</span>
                    <span className="pm-date">{formData.date ? new Date(formData.date).toLocaleDateString() : "--"}</span>
                 </div>
                 <div className="pm-slot-box" style={{ alignItems: 'center', textAlign: 'center' }}>
                    <span className="pm-slot-label">Slot</span>
                    <span className="pm-date">
                      {formData.time
                        ? new Date(`1970-01-01T${formData.time}:00`).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "--"}
                    </span>
                 </div>
              </div>

              <div className="reason-box" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="pm-slot-label">Priority</span>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 900, 
                      padding: '2px 8px', 
                      borderRadius: '6px',
                      background: formData.priority_level === 'routine' ? '#10b98120' : formData.priority_level === 'urgent' ? '#f59e0b20' : '#ef444420',
                      color: formData.priority_level === 'routine' ? '#10b981' : formData.priority_level === 'urgent' ? '#f59e0b' : '#ef4444'
                    }}>{formData.priority_level.toUpperCase()}</span>
                 </div>
                 <span className="pm-slot-label" style={{ display: 'block', marginBottom: '6px' }}>Reason for Visit</span>
                 <p style={{ color: '#334155', fontSize: '14px', margin: 0 }}>{formData.reason}</p>
              </div>

            </div>

            <div className="pm-actions">
              <button onClick={() => setShowConfirm(false)} className="pm-btn-secondary">Edit Details</button>
              <button onClick={handleFinalSubmit} className="pm-btn-primary">
                {loading ? <span className="spinner-loader"></span> : "Confirm Booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppointmentForm;
