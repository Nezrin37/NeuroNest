import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Loader2, ArrowUpDown, UserPlus, SlidersHorizontal, UserX, MessageSquare, ExternalLink } from 'lucide-react';
import { getPatients } from '../../api/doctor';
import { toAssetUrl } from '../../utils/media';
import "../../styles/my-patients.css";
import { useTheme } from "../../context/ThemeContext";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileJson, FileText, ChevronDown } from 'lucide-react';

const MyPatients = () => {
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("recent");
    const [showExportMenu, setShowExportMenu] = useState(false);
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

    const handleExport = () => {
        if (filteredPatients.length === 0) return;

        const headers = ["Full Name", "Email", "Status", "Last Visit", "Next Appointment"];
        const rows = filteredPatients.map(p => [
            p.full_name,
            p.email,
            p.status || 'Active',
            p.last_visit ? new Date(p.last_visit).toLocaleDateString() : 'N/A',
            p.next_appointment ? new Date(p.next_appointment).toLocaleDateString() : 'N/A'
        ]);

        const csvString = [headers, ...rows].map(row => row.join(",")).join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `NeuroNest_Clinical_Roster_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowExportMenu(false);
    };

    const handleExportPDF = () => {
        if (filteredPatients.length === 0) return;

        const doc = new jsPDF();
        
        // Add Header
        doc.setFontSize(18);
        doc.setTextColor(43, 112, 255); // NeuroNest Primary
        doc.text("NEURONEST - CLINICAL ROSTER", 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 26);
        doc.text(`Total Patients: ${filteredPatients.length}`, 14, 32);

        // Define Table
        const tableColumn = ["Patient Name", "Email", "Status", "Last Visit", "Upcoming"];
        const tableRows = filteredPatients.map(p => [
            p.full_name,
            p.email,
            p.status || 'Active',
            p.last_visit ? new Date(p.last_visit).toLocaleDateString() : 'N/A',
            p.next_appointment ? new Date(p.next_appointment).toLocaleDateString() : 'N/A'
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'striped',
            headStyles: { fillColor: [43, 112, 255], textColor: 255 },
            styles: { fontSize: 9 }
        });

        doc.save(`NeuroNest_Clinical_Roster_${new Date().toISOString().split('T')[0]}.pdf`);
        setShowExportMenu(false);
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
            <div className="d-flex flex-row gap-2 align-items-center justify-content-between mb-4">
                <div className="position-relative flex-grow-1" style={{ maxWidth: '400px' }}>
                    <Search className="position-absolute text-secondary" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)' }} size={16} />
                    <input 
                        type="text"
                        placeholder="Search roster by name or email..."
                        className="form-control rounded-pill border-0 shadow-sm"
                        style={{ paddingLeft: '44px', height: '48px', fontSize: '0.9rem', backgroundColor: 'var(--nn-surface)' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="d-flex align-items-center gap-2 justify-content-end" style={{ flexShrink: 0 }}>
                    
                    {/* Status Dropdown */}
                    <div className="input-group shadow-sm border-0 rounded-pill overflow-hidden" style={{ minWidth: '160px', backgroundColor: 'var(--nn-surface)' }}>
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
                    <div className="input-group shadow-sm border-0 rounded-pill overflow-hidden" style={{ minWidth: '160px', backgroundColor: 'var(--nn-surface)' }}>
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

                    {/* Export Dropdown */}
                    <div className="position-relative">
                        <button 
                            className="btn btn-dark rounded-pill d-flex align-items-center shadow-sm fw-bold px-4 gap-2" 
                            style={{ height: '48px', fontSize: '0.8rem' }}
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            disabled={filteredPatients.length === 0}
                        >
                            <Users size={14} />
                            Export
                            <ChevronDown size={14} className={showExportMenu ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
                        </button>

                        {showExportMenu && (
                            <>
                                <div 
                                    className="position-fixed top-0 start-0 w-100 h-100" 
                                    style={{ zIndex: 998 }}
                                    onClick={() => setShowExportMenu(false)}
                                />
                                <div 
                                    className="position-absolute end-0 mt-2 p-2 rounded-4 shadow-lg border" 
                                    style={{ 
                                        zIndex: 999, 
                                        minWidth: '200px', 
                                        transformOrigin: 'top right', 
                                        animation: 'fadeInScale 0.2s ease-out',
                                        backgroundColor: isDark ? 'var(--nn-surface-secondary)' : 'var(--nn-surface)',
                                        borderColor: isDark ? 'var(--nn-border)' : 'var(--nn-surface-secondary)'
                                    }}
                                >
                                    <button 
                                        className="w-100 text-start btn border-0 d-flex align-items-center gap-3 p-3 rounded-3 mb-1 export-item"
                                        style={{ color: isDark ? 'var(--nn-text-secondary)' : 'var(--nn-text-main)', fontWeight: '600', fontSize: '0.85rem' }}
                                        onClick={handleExport}
                                    >
                                        <div className="bg-success bg-opacity-10 p-2 rounded-3 text-success">
                                            <FileJson size={16} />
                                        </div>
                                        Download CSV
                                    </button>
                                    <button 
                                        className="w-100 text-start btn border-0 d-flex align-items-center gap-3 p-3 rounded-3 export-item"
                                        style={{ color: isDark ? 'var(--nn-text-secondary)' : 'var(--nn-text-main)', fontWeight: '600', fontSize: '0.85rem' }}
                                        onClick={handleExportPDF}
                                    >
                                        <div className="bg-danger bg-opacity-10 p-2 rounded-3 text-danger">
                                            <FileText size={16} />
                                        </div>
                                        Download PDF
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
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
                    <div className="nn-table-wrapper">
                        <table className="nn-table">
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
                                                backgroundColor: patient.status === 'Active'
                                                    ? 'color-mix(in srgb, var(--nn-success) 12%, transparent)'
                                                    : 'color-mix(in srgb, var(--nn-text-muted) 12%, transparent)',
                                                color: patient.status === 'Active' ? 'var(--nn-success)' : 'var(--nn-text-muted)',
                                                border: `1px solid ${patient.status === 'Active'
                                                    ? 'color-mix(in srgb, var(--nn-success) 22%, transparent)'
                                                    : 'color-mix(in srgb, var(--nn-text-muted) 22%, transparent)'}`
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
                                                    onClick={() => navigate(`/doctor/patient-hub?patientId=${patient.id}`)}
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
