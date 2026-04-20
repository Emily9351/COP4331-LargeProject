import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuthUser, isAuthenticated } from '../lib/auth';

export function ProtectedRoute({
  children,
  allowedRole,
}: {
  children: ReactElement;
  allowedRole?: 'student' | 'professor';
}) {
  const user = getAuthUser();

  if (!isAuthenticated() || !user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'professor' ? '/professor-dashboard' : '/dashboard'} replace />;
  }

  return children;
}

export function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const user = getAuthUser();

  if (isAuthenticated() && user) {
    return <Navigate to={user.role === 'professor' ? '/professor-dashboard' : '/dashboard'} replace />;
  }

  return children;
}
