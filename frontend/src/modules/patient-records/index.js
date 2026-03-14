import { FileSearch } from 'lucide-react';
import PatientRecords from '../../pages/doctor/PatientRecords';

const patientRecordsModule = {
  key: 'patientRecords',
  label: 'Patient Records',
  icon: FileSearch,
  route: '/patient-records',
  rolesAllowed: ['doctor', 'admin'],
  enabledByDefault: true,
  showInSidebarByRole: ['doctor'],
  componentsByRole: {
    doctor: PatientRecords,
  },
  orderByRole: { doctor: 999, admin: 999 },
};

export default patientRecordsModule;
