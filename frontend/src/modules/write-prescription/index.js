import { FilePenLine } from 'lucide-react';
import WritePrescription from '../../pages/doctor/WritePrescription';

const writePrescriptionModule = {
  key: 'writePrescription',
  label: 'Write Prescription',
  icon: FilePenLine,
  route: '/write-prescription',
  rolesAllowed: ['doctor', 'admin'],
  enabledByDefault: true,
  componentsByRole: {
    doctor: WritePrescription,
  },
  showInSidebarByRole: ['admin', 'doctor'],
  orderByRole: { doctor: 60, admin: 70 },
};

export default writePrescriptionModule;
