import React, { useState, useEffect } from "react";
import { User, Calendar, Bell, Shield, Wallet, Loader2 } from "lucide-react";
import { getAllDoctorSettings } from "../../../api/doctor";
import AccountSettings from "./components/AccountSettings";
import ScheduleSettings from "./components/ScheduleSettings";
import ConsultationSettings from "./components/ConsultationSettings";
import NotificationSettings from "./components/NotificationSettings";
import PrivacySettings from "./components/PrivacySettings";
import "../../../styles/doctor-settings.css";

const TABS = [
  { id: "account", label: "Account Settings", icon: User },
  { id: "schedule", label: "Schedule Configuration", icon: Calendar },
  { id: "consultation", label: "Consultation Terms", icon: Wallet },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy & Visibility", icon: Shield },
];

const DoctorSettingsPage = () => {
    const [activeTab, setActiveTab] = useState("account");
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch settings from API
        const loadSettings = async () => {
            try {
                const data = await getAllDoctorSettings();
                setSettings(data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load settings:", err);
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const renderTabContent = () => {
        if (loading) return null;
        switch (activeTab) {
            case "account": return (
                <AccountSettings
                    data={settings?.account}
                    onSaveSuccess={(newData) => setSettings(prev => ({...prev, account: newData}))}
                />
            );
            case "schedule": return (
                <ScheduleSettings 
                    data={settings?.schedule} 
                    onSaveSuccess={(newData) => setSettings(prev => ({...prev, schedule: newData}))} 
                />
            );
            case "consultation": return (
                <ConsultationSettings 
                    data={settings?.consultation} 
                    onSaveSuccess={(newData) => setSettings(prev => ({...prev, consultation: newData}))} 
                />
            );
            case "notifications": return (
                <NotificationSettings 
                    data={settings?.notifications} 
                    onSaveSuccess={(newData) => setSettings(prev => ({...prev, notifications: newData}))} 
                />
            );
            case "privacy": return (
                <PrivacySettings 
                    data={settings?.privacy} 
                    onSaveSuccess={(newData) => setSettings(prev => ({...prev, privacy: newData}))} 
                />
            );
            default: return null;
        }
    };

    return (
        <div className="doc-settings-root">

            <div className="doc-settings-layout">
                {/* Horizontal Navigation System */}
                <div className="doc-settings-tabs-topbar">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button 
                                key={tab.id}
                                className={`doc-tab-button-top ${activeTab === tab.id ? "active" : ""}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <Icon size={18} strokeWidth={2.5} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Main Dynamic Content Canvas */}
                <div className="doc-settings-content">
                    {loading ? (
                        <div className="loading-state-vault">
                            <Loader2 size={32} className="animate-spin text-blue-500 mb-4 mx-auto" />
                            <p>Loading Preferences...</p>
                        </div>
                    ) : renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default DoctorSettingsPage;
