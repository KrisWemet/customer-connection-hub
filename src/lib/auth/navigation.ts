import type { UserRole } from '@/types/auth';

export function getRoleDefaultRoute(role: UserRole): string {
  return role === 'admin' ? '/' : '/portal';
}
