import { Users } from 'lucide-react';
import MyPatients from '../../pages/doctor/MyPatients';

const myPatientsModule = {
  key: 'myPatients',
  label: 'Patients',
  icon: Users,
  route: '/patients',
  rolesAllowed: ['doctor', 'admin'],
  enabledByDefault: true,
  componentsByRole: {
    doctor: MyPatients,
  },
  orderByRole: { doctor: 30, admin: 60 },
};

export default myPatientsModule;
