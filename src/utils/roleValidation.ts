import type { UserRole } from '../types';

const VALID_ROLES: readonly UserRole[] = ['doctor', 'patient'];

export const isValidUserRole = (role: string | null | undefined): role is UserRole =>
  typeof role === 'string' && VALID_ROLES.includes(role as UserRole);
