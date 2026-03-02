import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Plus, Trash2, Calendar, Clock, AlertCircle } from 'lucide-react';
import { addAvailabilitySlot, deleteAvailabilitySlot } from '../../services/doctorProfileService';
import { useTheme } from '../../context/ThemeContext';

const toMinutes = (value = '') => {
    if (!value) return null;
    const normalized = String(value).trim();
    const parts = normalized.split(':');
    if (parts.length < 2) return null;
    const hour = Number(parts[0]);
    const minute = Number(parts[1]);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return (hour * 60) + minute;
};

const formatTimeCompact = (value = '') => {
    const mins = toMinutes(value);
    if (mins === null) return String(value || '--');
    const hour24 = Math.floor(mins / 60) % 24;
    const minute = mins % 60;
    return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const AvailabilityModal = ({ isOpen, onClose, availability, onUpdate }) => {
    const { isDark } = useTheme();
    const [day, setDay] = useState('Monday');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const startMins = toMinutes(startTime);
    const endMins = toMinutes(endTime);
    const hasInvalidRange = startMins === null || endMins === null || startMins >= endMins;
    const overlapsExisting = !hasInvalidRange && Boolean(
        availability && availability.some((slot) => {
            if (slot.day_of_week !== day) return false;
            const existingStart = toMinutes(slot.start_time);
            const existingEnd = toMinutes(slot.end_time);
            if (existingStart === null || existingEnd === null) return false;
            return startMins < existingEnd && endMins > existingStart;
        }),
    );
    const validationMessage = startMins !== null && endMins !== null && startMins >= endMins
        ? 'End time must be after start time.'
        : overlapsExisting
            ? 'Time range overlaps with existing availability.'
            : '';
    const totalMinutes = hasInvalidRange ? 0 : (endMins - startMins);
    const estimatedSlots = Math.floor(totalMinutes / 40);

    const handleAdd = async () => {
        // Basic validation
        if (startMins === null || endMins === null) {
            alert("Invalid time format");
            return;
        }
        if (startMins >= endMins) {
            alert("End time must be after start time");
            return;
        }

        // Check for overlaps
        // (StartA < EndB) and (EndA > StartB)
        const isOverlapping = availability && availability.some((availabilityRange) => {
            if (availabilityRange.day_of_week !== day) return false;

            const existingStart = toMinutes(availabilityRange.start_time);
            const existingEnd = toMinutes(availabilityRange.end_time);
            if (existingStart === null || existingEnd === null) return false;

            return startMins < existingEnd && endMins > existingStart;
        });

        if (isOverlapping) {
            alert(`This availability range overlaps with existing availability on ${day}`);
            return;
        }

        setLoading(true);
        try {
            const updatedProfile = await addAvailabilitySlot({
                day_of_week: day,
                start_time: startTime,
                end_time: endTime
            });
            onUpdate(updatedProfile);
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || "Failed to add availability";
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this availability range?")) return;
        setLoading(true);
        try {
            const updatedProfile = await deleteAvailabilitySlot(id);
            onUpdate(updatedProfile);
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || "Failed to delete availability";
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Group slots by day
    const slotsByDay = {};
    days.forEach(d => slotsByDay[d] = []);
    if (availability) {
        availability.forEach(slot => {
            if (slotsByDay[slot.day_of_week]) {
                slotsByDay[slot.day_of_week].push(slot);
            }
        });
    }

    // Portal to body to avoid clipping or stacking context issues
    return ReactDOM.createPortal(
        <div
    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
    style={{
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 2000
    }}
            tabIndex="-1" 
            onClick={onClose}
        >
            <div
                className="w-100 d-flex flex-column"
                style={{
                    maxWidth: '1100px',
                    width: '92%',
                    maxHeight: '92vh'
                }}
                onClick={e => e.stopPropagation()}
            >
               <div
                    className={`shadow-lg overflow-hidden d-flex flex-column flex-grow-1 ${isDark ? 'text-light' : 'text-dark'}`}
                    style={{
                        borderRadius: '20px',
                        maxHeight: '100%',
                        background: isDark
                            ? 'linear-gradient(145deg, #111827, #1f2937)'
                            : 'linear-gradient(145deg, #ffffff, #f8fafc)',
                        border: isDark
                            ? '1px solid rgba(255,255,255,0.05)'
                            : '1px solid rgba(0,0,0,0.05)'
                    }}
                >
                    
                    {/* Header */}
                    <div
                        className="px-4 py-3 d-flex justify-content-between align-items-center"
                        style={{
                            borderBottom: isDark
                                ? '1px solid rgba(255,255,255,0.05)'
                                : '1px solid rgba(0,0,0,0.06)'
                        }}
                    >
                        <div className="modal-title d-flex align-items-center gap-3">
                            <div className="bg-primary bg-opacity-10 p-2 rounded-2 text-primary">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h5 className={`fw-bold mb-0 ${isDark ? 'text-white' : 'text-dark'}`}>Weekly Schedule</h5>
                                <span className={`small ${isDark ? 'text-secondary' : 'text-muted'}`}>Manage your time blocks and availability</span>
                            </div>
                        </div>
                        <button onClick={onClose} className={`btn-close shadow-none opacity-50 transition-all ${isDark ? 'btn-close-white' : ''}`} style={{ fontSize: '12px' }}></button>
                    </div>

                    <div className="modal-body p-0 d-flex flex-column flex-md-row" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                        {/* Left: Time Builder */}
                        <div
                            className="col-12 col-md-5 col-lg-4 d-flex flex-column"
                                style={{
                                    borderRight: isDark
                                        ? '1px solid rgba(255,255,255,0.05)'
                                        : '1px solid rgba(0,0,0,0.06)',
                                    background: 'transparent',
                                    overflowY: 'auto' // ensure builder scrolls on very small screens
                                }}
                            >
                                <div className="p-4">
                                <h6 className={`fw-bold mb-4 text-uppercase small ${isDark ? 'text-secondary' : 'text-muted'}`} style={{ letterSpacing: '0.8px' }}>Build Time Slot</h6>
                                
                                <div className="mb-4">
                                    <label className="form-label small fw-bold text-secondary mb-2">Select Day</label>
                                    <select 
                                        className={`form-select shadow-none py-2 px-3 fw-medium ${isDark ? 'bg-dark text-light border-secondary' : 'bg-light border-0'}`}
                                        value={day}
                                        onChange={(e) => setDay(e.target.value)}
                                        style={{ borderRadius: '0.5rem' }}
                                    >
                                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                
                                <div className="row g-3 mb-2">
                                    <div className="col-6">
                                        <label className="form-label small fw-bold text-secondary mb-2">Start</label>
                                        <input 
                                            type="time" 
                                            className={`form-control shadow-none py-2 px-2 px-sm-3 fw-medium w-100 ${validationMessage ? 'border-danger text-danger' : isDark ? 'bg-dark text-light border-secondary' : 'bg-light border-0'}`}
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            style={{ borderRadius: '0.5rem', fontSize: '0.9rem' }}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label small fw-bold text-secondary mb-2">End</label>
                                        <input 
                                            type="time" 
                                            className={`form-control shadow-none py-2 px-2 px-sm-3 fw-medium w-100 ${validationMessage ? 'border-danger text-danger' : isDark ? 'bg-dark text-light border-secondary' : 'bg-light border-0'}`}
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            style={{ borderRadius: '0.5rem', fontSize: '0.9rem' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ minHeight: '24px' }} className="mb-3 mt-1">
                                    {validationMessage && (
                                        <div className="small text-danger fw-medium d-flex align-items-center gap-1 opacity-75">
                                            <AlertCircle size={14} /> {validationMessage}
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={handleAdd}
                                    disabled={loading || Boolean(validationMessage)}
                                    className="btn btn-primary w-100 py-2 px-3 fw-medium rounded-3 d-flex align-items-center justify-content-center gap-2 mb-4 shadow-sm"
                                    style={{ transition: 'all 0.2s' }}
                                >
                                    {loading ? <span className="spinner-border spinner-border-sm"></span> : <Plus size={16} />}
                                    Add Slot
                                </button>

                                <div className={`p-3 rounded-3 d-flex align-items-center gap-3 ${isDark ? 'bg-dark border border-secondary' : 'bg-light border-0'}`}>
                                    <div className={`p-2 rounded-2 ${isDark ? 'bg-secondary bg-opacity-25 text-primary' : 'bg-white shadow-sm text-primary'}`}>
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <p className="small text-secondary fw-bold text-uppercase mb-0" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>Capacity Preview</p>
                                        <p className={`fw-bold mb-0 ${hasInvalidRange ? 'text-muted' : isDark ? 'text-white' : 'text-dark'}`} style={{ fontSize: '0.9rem' }}>
                                            {hasInvalidRange ? '--' : `${estimatedSlots} Appointments`}
                                        </p>
                                    </div>
                                </div>
                                </div>
                            </div>

                        {/* Right: Calendar Grid */}
                        <div className="col-12 col-md-7 col-lg-8 d-flex flex-column" style={{ 
                            backgroundColor: isDark ? '#111' : '#f8f9fa',
                            overflowY: 'auto', // Independent scroll for schedule
                            minHeight: 0,
                            position: 'relative'
                        }}>
                            <div className="p-3 p-md-4 py-lg-4 d-flex flex-column">
                                {/* Fully enclosed glass container */}
                                <div 
                                    className="p-4 p-xl-5 d-flex flex-column flex-grow-1"
                                    style={{ 
                                        background: isDark ? 'linear-gradient(145deg, #111827 0%, #1f2937 100%)' : 'linear-gradient(145deg, #e0e7ff 0%, #bfdbfe 100%)',
                                        position: 'relative',
                                        borderRadius: '1.5rem',
                                        border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.4)',
                                        boxShadow: isDark ? '0 10px 40px -10px rgba(0,0,0,0.5)' : '0px 10px 40px -10px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {/* Inner Title matching the reference aesthetic */}
                                <div className="mb-4 ps-2">
                                    <h3 className={`fw-bolder mb-1 ${isDark ? 'text-white' : 'text-dark'}`} style={{ letterSpacing: '-0.5px' }}>Consultation Schedule</h3>
                                </div>

                                <div className="position-relative py-2 ps-3">
                                    {/* Continuous vertical timeline line */}
                                    <div
    className="position-absolute"
    style={{
        left: '32px',
        top: '20px',
        bottom: '20px',
        width: '2px',
        backgroundColor: isDark
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(0,0,0,0.08)',
        borderRadius: '2px'
    }}
/>
                                    
                                    <div className="d-flex flex-column gap-3 position-relative" style={{ zIndex: 2 }}>
                                        {days.map(d => {
                                            const slots = slotsByDay[d].sort((a, b) => (toMinutes(a.start_time) ?? 0) - (toMinutes(b.start_time) ?? 0));
                                            const hasSlots = slots.length > 0;
                                            
                                            return (
                                                <div key={d} className="d-flex align-items-stretch">
                                                    {/* Timeline Node & Day Label */}
                                                    <div className="d-flex align-items-start justify-content-between position-relative pt-3" style={{ width: '64px', flexShrink: 0 }}>
                                                        <div className={`fw-bold text-uppercase ${hasSlots ? (isDark ? 'text-white' : 'text-dark') : 'text-secondary opacity-50'}`} style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                                                            {d.substring(0, 3)}
                                                        </div>
                                                        <div 
                                                            className={`rounded-circle position-absolute ${hasSlots ? 'bg-primary shadow-sm' : (isDark ? 'bg-secondary' : 'bg-white border')}`} 
                                                            style={{ 
                                                                right: '10px', // exact alignment on the line
                                                                top: '22px', // align beautifully with the card
                                                                width: '14px', 
                                                                height: '14px',
                                                                border: hasSlots ? `3px solid ${isDark ? '#111' : '#f8f9fa'}` : 'none',
                                                                zIndex: 3
                                                            }} 
                                                        />
                                                    </div>

                                                    {/* Right side translucent card */}
                                                    <div className={`flex-grow-1 ms-4 p-3 rounded-4 mb-1 transition-all`} 
                                                        style={{ 
                                                            background: hasSlots ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.45)') : 'transparent',
                                                            backdropFilter: hasSlots ? 'blur(12px)' : 'none',
                                                            border: hasSlots ? (isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.6)') : (isDark ? '1px dashed rgba(255,255,255,0.1)' : '1px dashed rgba(255,255,255,0.4)'),
                                                            boxShadow: hasSlots ? '0 8px 32px 0 rgba(31, 38, 135, 0.05)' : 'none',
                                                            WebkitBackdropFilter: hasSlots ? 'blur(12px)' : 'none'
                                                        }}>
                                                        {!hasSlots ? (
                                                            <div className="d-flex align-items-center h-100 px-2 py-1">
                                                                <span className={`small fw-medium ${isDark ? 'text-secondary' : 'text-muted'}`}>No availability set</span>
                                                            </div>
                                                        ) : (
                                                            <div className="d-flex flex-column gap-2">
                                                                {slots.map(slot => (
                                                                    <div key={slot.id} className="d-flex align-items-center gap-3 py-1 position-relative" style={{ transition: 'all 0.2s' }}>
                                                                        <span className={`fw-medium font-monospace opacity-75 ${isDark ? 'text-light' : 'text-dark'}`} style={{ fontSize: '0.8rem', minWidth: '130px', fontStyle: 'italic' }}>
                                                                            {formatTimeCompact(slot.start_time)} - {formatTimeCompact(slot.end_time)}
                                                                        </span>
                                                                        <div className="d-flex align-items-center flex-grow-1 gap-2">
                                                                            <span className={`fw-bold text-truncate ${isDark ? 'text-white' : 'text-dark'}`} style={{ fontSize: '0.85rem' }}>
                                                                                Available Block
                                                                            </span>
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => handleDelete(slot.id)}
                                                                            className="btn btn-sm text-danger p-1 rounded-circle hover-bg-danger hover-text-white transition-all text-decoration-none d-flex align-items-center justify-content-center"
                                                                            style={{ width: '28px', height: '28px', backgroundColor: isDark ? 'rgba(220,53,69,0.1)' : 'rgba(220,53,69,0.05)' }}
                                                                            title="Remove time slot"
                                                                        >
                                                                            <Trash2 size={13} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>,
        document.body
    );
};

export default AvailabilityModal;
