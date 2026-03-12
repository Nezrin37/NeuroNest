import { MessageSquareHeart } from 'lucide-react';
import DoctorFeedbackPage from './DoctorFeedbackPage';
import PatientFeedbackPage from './PatientFeedbackPage';

const feedbackReviewsModule = {
  key: 'feedbackReviews',
  label: 'Reviews',
  icon: MessageSquareHeart,
  route: '/feedback-reviews',
  rolesAllowed: ['doctor', 'patient'],
  enabledByDefault: true,
  componentsByRole: {
    doctor: DoctorFeedbackPage,
    patient: PatientFeedbackPage,
  },
  orderByRole: { doctor: 40, patient: 82 },
};

export default feedbackReviewsModule;
