import { ClipboardCheck } from 'lucide-react';
import AppointmentRequests from '../../pages/doctor/AppointmentRequests';

const appointmentRequestsModule = {
  key: 'appointmentRequests',
  label: 'Appointment Requests',
  icon: ClipboardCheck,
  route: '/appointment-requests',
  rolesAllowed: ['doctor', 'admin'],
  showInSidebarByRole: ['admin', 'doctor'],
  enabledByDefault: true,
  componentsByRole: {
    doctor: AppointmentRequests,
  },
  orderByRole: { doctor: 30, admin: 40 },
};

export default appointmentRequestsModule;
