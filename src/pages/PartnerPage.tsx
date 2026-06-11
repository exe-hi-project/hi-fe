import PartnerHubPage from '../components/partner/PartnerHubPage';
import { useAuthStore } from '../store/authStore';

export default function PartnerPage() {
  const gender = useAuthStore((state) => state.user?.gender);
  return <PartnerHubPage variant={gender === 'male' ? 'male' : 'female'} />;
}
