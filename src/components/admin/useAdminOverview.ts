import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import type { AdminOverviewResponse } from './adminTypes';

export default function useAdminOverview() {
  return useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api.get('/admin/overview').then(({ data }) => data as AdminOverviewResponse),
    staleTime: 30_000,
  });
}
