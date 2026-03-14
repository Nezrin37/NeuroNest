import { Settings } from 'lucide-react';
import PatientSettingsPage from '../../pages/patient/settings/PatientSettingsPage';
import DoctorSettingsPage from '../../pages/doctor/settings/DoctorSettingsPage';
import SettingsPage from '../../pages/admin/SettingsPage';

const settingsModule = {
  key: 'settings',
  label: 'Settings',
  icon: Settings,
  route: '/settings',
  rolesAllowed: ['doctor', 'patient', 'admin'],
  group: 'Administration',
  enabledByDefault: true,
  componentsByRole: {
    patient: PatientSettingsPage,
    doctor:  DoctorSettingsPage,
    admin:   SettingsPage,
  },
  orderByRole: { doctor: 50, patient: 90, admin: 90 },
};

export default settingsModule;
