import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Loader2, ArrowUpDown, UserPlus, SlidersHorizontal, UserX, MessageSquare, ExternalLink } from 'lucide-react';
import { getPatients } from '../../api/doctor';
import { toAssetUrl } from '../../utils/media';
import "../../styles/my-patients.css";
import { useTheme } from "../../context/ThemeContext";

const MyPatients = () => {
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("recent");
    const navigate = useNavigate();

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            const data = await getPatients();
            setPatients(data);
            setFilteredPatients(data);
        } catch (error) {
            console.error("Failed to load clinical roster:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (value) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
        });
    };

    useEffect(() => {
        let results = patients.filter(patient =>
            patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.email.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Apply Status Filter
        if (statusFilter !== "all") {
            results = results.filter(p => p.status?.toLowerCase() === statusFilter.toLowerCase());
        }

        // Apply Sorting
        results.sort((a, b) => {
            if (sortBy === "name") {
                return a.full_name.localeCompare(b.full_name);
            } else if (sortBy === "recent") {
                const dateA = a.last_visit ? new Date(a.last_visit).getTime() : 0;
                const dateB = b.last_visit ? new Date(b.last_visit).getTime() : 0;
                return dateB - dateA; // Descending (newest first)
            } else if (sortBy === "upcoming") {
                const dateA = a.next_appointment ? new Date(a.next_appointment).getTime() : Infinity;
                const dateB = b.next_appointment ? new Date(b.next_appointment).getTime() : Infinity;
                return dateA - dateB; // Ascending (closest first)
            }
            return 0;
        });

        setFilteredPatients(results);
    }, [searchTerm, statusFilter, sortBy, patients]);

    const stats = {
        total: patients.length,
        active: patients.filter(p => p.status === 'Active').length,
        inactive: patients.filter(p => p.status === 'Inactive').length
    };

    const { isDark } = useTheme();

    return (
        <div className={`roster-page-wrapper ${isDark ? 'dark' : ''}`}>
            <div className="roster-main-card">
            
            <div className="mb-4">
                 <h1 className="roster-title">Clinical Roster</h1>
                 <p className="roster-subtitle">Manage and access all your patient dossiers and history</p>
            </div>

            {/* PREMIUM METRIC GRID */}
            <div className="row g-4 mb-4">
                {/* Total Patients */}
                <div className="col-12 col-md-4">
                    <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative" style={{ transition: 'transform 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.transform='translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform='translateY(0)'}>
                        <div className="card-body p-3">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <div className="rounded-3 bg-primary bg-opacity-10 d-flex align-items-center justify-content-center text-primary" style={{ width: '44px', height: '44px' }}>
                                    <Users size={20} strokeWidth={2.5} />
                                </div>
                                <span className="fs-2 fw-bolder text-dark m-0">{stats.total}</span>
                            </div>
                            <h6 className="text-muted text-uppercase fw-bold m-0" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Total Patients</h6>
                        </div>
                    </div>
                </div>

                {/* Active Patients */}
                <div className="col-12 col-md-4">
                    <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative" style={{ transition: 'transform 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.transform='translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform='translateY(0)'}>
                        <div className="card-body p-3">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <div className="rounded-3 bg-success bg-opacity-10 d-flex align-items-center justify-content-center text-success" style={{ width: '44px', height: '44px' }}>
                                    <UserPlus size={20} strokeWidth={2.5} />
                                </div>
                                <span className="fs-2 fw-bolder text-dark m-0">{stats.active}</span>
                            </div>
                            <h6 className="text-muted text-uppercase fw-bold m-0" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Active Status</h6>
                        </div>
                    </div>
                </div>

                {/* Inactive Patients */}
                <div className="col-12 col-md-4">
                    <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative" style={{ transition: 'transform 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.transform='translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform='translateY(0)'}>
                        <div className="card-body p-3">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <div className="rounded-3 bg-warning bg-opacity-10 d-flex align-items-center justify-content-center text-warning" style={{ width: '44px', height: '44px' }}>
                                    <UserX size={20} strokeWidth={2.5} />
                                </div>
                                <span className="fs-2 fw-bolder text-dark m-0">{stats.inactive}</span>
                            </div>
                            <h6 className="text-muted text-uppercase fw-bold m-0" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Inactive / Archived</h6>
                        </div>
                    </div>
                </div>
            </div>

            {/* FUNCTIONAL CONTROL BAR */}
            {/* FUNCTIONAL CONTROL BAR */}
            <div className="d-flex flex-column flex-md-row gap-3 align-items-center justify-content-between mb-4">
                <div className="position-relative flex-grow-1" style={{ maxWidth: '500px', width: '100%' }}>
                    <Search className="position-absolute text-secondary" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)' }} size={16} />
                    <input 
                        type="text"
                        placeholder="Search roster by name or email..."
                        className="form-control rounded-pill border-0 shadow-sm"
                        style={{ paddingLeft: '44px', height: '48px', fontSize: '0.9rem', backgroundColor: '#fff' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="d-flex align-items-center gap-2 overflow-auto" style={{ width: '100%', maxWidth: '100%', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                    
                    {/* Status Dropdown */}
                    <div className="input-group shadow-sm border-0 rounded-pill overflow-hidden" style={{ minWidth: '160px', backgroundColor: '#fff' }}>
                        <span className="input-group-text bg-white border-0 text-secondary pe-1 ps-3">
                            <Filter size={14} />
                        </span>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="form-select border-0 bg-white shadow-none fw-bold text-secondary"
                            style={{ fontSize: '0.8rem', cursor: 'pointer', height: '48px' }}
                        >
                            <option value="all">Every Patient</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="input-group shadow-sm border-0 rounded-pill overflow-hidden" style={{ minWidth: '160px', backgroundColor: '#fff' }}>
                        <span className="input-group-text bg-white border-0 text-secondary pe-1 ps-3">
                            <ArrowUpDown size={14} />
                        </span>
                        <select 
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="form-select border-0 bg-white shadow-none fw-bold text-secondary"
                            style={{ fontSize: '0.8rem', cursor: 'pointer', height: '48px' }}
                        >
                            <option value="recent">Recent Visit</option>
                            <option value="upcoming">Upcoming Visit</option>
                            <option value="name">Alphabetical</option>
                        </select>
                    </div>

                    {/* Export Button */}
                    <button className="btn btn-dark rounded-pill d-flex align-items-center shadow-sm fw-bold px-4" style={{ height: '48px', fontSize: '0.8rem' }}>
                        <Users size={14} className="me-2" />
                        Export
                    </button>
                </div>
            </div>

            {/* PATIENT LIST AREA */}
            <div className="mt-2">
                {loading ? (
                    <div className="d-flex flex-column align-items-center justify-content-center py-5 my-5">
                       <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                         <span className="visually-hidden">Loading...</span>
                       </div>
                       <p className="text-secondary small fw-bold text-uppercase" style={{ letterSpacing: '2px' }}>Compiling Patient Identities...</p>
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <div className="text-center py-5 my-5 bg-white rounded-5 border border-dashed border-2 shadow-sm d-flex flex-column align-items-center justify-content-center p-5">
                        <div className="bg-light rounded-circle d-flex align-items-center justify-content-center mb-4" style={{ width: '90px', height: '90px' }}>
                             <Users size={40} className="text-secondary" />
                        </div>
                        <h3 className="fw-bolder text-dark mb-2">No Clinical Bonds Found</h3>
                        <p className="text-secondary small mx-auto" style={{ maxWidth: '350px' }}>
                            Patients will automatically populate your roster once they complete appointments or get their requests approved.
                        </p>
                    </div>
                ) : (
                    <div className="roster-table-container">
                        <table className="roster-table">
                            <thead>
                                <tr>
                                    <th>Patient Identity</th>
                                    <th>Latest Visit</th>
                                    <th>Upcoming Action</th>
                                    <th>Status</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPatients.map(patient => (
                                    <tr key={patient.id}>
                                        <td>
                                            <div className="roster-patient-identity">
                                                <div className="roster-avatar-mini">
                                                    {patient.patient_image ? (
                                                        <img src={toAssetUrl(patient.patient_image)} alt="" className="w-100 h-100 object-fit-cover" />
                                                    ) : (
                                                        patient.full_name?.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="roster-patient-name">{patient.full_name}</p>
                                                    <p className="roster-patient-email">{patient.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="roster-visit-cell">
                                                <span className="roster-visit-label">History</span>
                                                <span className="roster-visit-val">{formatDate(patient.last_visit)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="roster-visit-cell">
                                                <span className="roster-visit-label">Schedule</span>
                                                <span className="roster-visit-val">{patient.next_appointment ? formatDate(patient.next_appointment) : 'None'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge rounded-pill px-3 py-1 text-uppercase fw-bold`} style={{ 
                                                fontSize: '0.65rem', 
                                                backgroundColor: patient.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                                color: patient.status === 'Active' ? '#10b981' : '#64748b',
                                                border: `1px solid ${patient.status === 'Active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)'}`
                                            }}>
                                                {patient.status || 'Active'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center justify-content-end gap-2">
                                                <button 
                                                    className="roster-btn-sm"
                                                    onClick={() => navigate(`/doctor/chat?patientId=${patient.id}`)}
                                                    title="Message"
                                                >
                                                    <MessageSquare size={16} />
                                                </button>
                                                <button 
                                                    className="roster-btn-sm"
                                                    onClick={() => navigate(`/doctor/patient-records?patientId=${patient.id}`)}
                                                    title="Profile"
                                                >
                                                    <ExternalLink size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
          </div>
        </div>
    );
};

export default MyPatients;
