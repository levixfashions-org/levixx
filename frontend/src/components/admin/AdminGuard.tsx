import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/** Only lets the verified store owner through. The API enforces this too — this just keeps the UI tidy. */
export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading || (user && !profile)) {
    return <div className="py-24 text-center font-mono text-xs uppercase tracking-widest text-neutral-500">Checking access...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <h2 className="font-display font-black text-2xl uppercase text-black">Admin Only</h2>
        <p className="text-xs text-neutral-600">
          This area is restricted to the store owner. If you are the owner, sign in with your verified owner Google account.
        </p>
      </div>
    );
  }
  return <>{children}</>;
};
