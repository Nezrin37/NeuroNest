import { User } from 'lucide-react';
import PatientProfile from '../../pages/patient/Profile';
import DoctorProfile from '../../pages/doctor/Profile';

const profileModule = {
  key: 'profile',
  label: 'Profile',
  icon: User,
  route: '/profile',
  rolesAllowed: ['patient', 'doctor'],
  showInSidebarByRole: ['patient', 'doctor'],
  enabledByDefault: true,
  componentsByRole: {
    patient: PatientProfile,
    doctor: DoctorProfile,
  },
  orderByRole: { patient: 20, doctor: 20 },
};

export default profileModule;
