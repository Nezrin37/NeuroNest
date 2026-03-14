import { CalendarDays } from 'lucide-react';
import TodaySchedule from '../../pages/doctor/TodaySchedule';

const todayScheduleModule = {
  key: 'todaySchedule',
  label: "Appointments",
  icon: CalendarDays,
  route: '/schedule',
  rolesAllowed: ['doctor', 'admin'],
  enabledByDefault: true,
  componentsByRole: {
    doctor: TodaySchedule,
  },
  orderByRole: { doctor: 20, admin: 50 },
};

export default todayScheduleModule;
