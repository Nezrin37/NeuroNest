import { BarChart3 } from 'lucide-react';
import ModuleComingSoon from '../../pages/shared/ModuleComingSoon';

const PerformanceAnalyticsPage = () =>
  ModuleComingSoon({
    title: 'Performance Analytics',
    description: 'Analytics module is prepared for phased enablement by role.',
  });

const performanceAnalyticsModule = {
  key: 'performanceAnalytics',
  label: 'Performance Analytics',
  icon: BarChart3,
  route: '/performance-analytics',
  rolesAllowed: ['doctor'],
  enabledByDefault: true,
  componentsByRole: {
    doctor: PerformanceAnalyticsPage,
  },
  showInSidebarByRole: ['doctor'],
  orderByRole: { doctor: 80 },
};

export default performanceAnalyticsModule;
