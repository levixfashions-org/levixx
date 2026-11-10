import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { authService, friendlyAuthError } from '../services/authService';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from: string | undefined = (location.state as any)?.from?.pathname || (location.state as any)?.from;

  const goAfterLogin = async () => {
    try {
      const res = await apiClient.get('/auth/profile');
      await refreshProfile();
      if (res.data?.user?.role === 'ADMIN') {
        navigate(from && from.startsWith('/admin') ? from : '/admin', { replace: true });
        return;
      }
    } catch {
      /* profile load failure shouldn't block login */
    }
    navigate(from && !from.startsWith('/admin') ? from : '/account', { replace: true });
  };

  // Already signed in (e.g. returning from a Google redirect) → move on.
  useEffect(() => {
    if (!authLoading && user && profile) {
      navigate(profile.role === 'ADMIN' ? '/admin' : from && !from.startsWith('/admin') ? from : '/account', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, profile]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await authService.login(email, password);
      await goAfterLogin();
    } catch (err: any) {
      setErrorMsg(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const u = await authService.loginWithGoogle();
      if (u) await goAfterLogin();
    } catch (err: any) {
      setErrorMsg(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-black">Login</h1>
        <p className="text-xs text-neutral-600">Sign in to your account</p>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3.5 bg-red-100 border border-red-300 text-red-800 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <GoogleSignInButton onClick={handleGoogle} disabled={loading} />

      <div className="relative flex items-center justify-center">
        <div className="border-t border-black/10 w-full" />
        <span className="absolute bg-[#EFEFEF] px-3 text-[10px] uppercase tracking-widest text-neutral-500 font-mono">
          Or with Email
        </span>
      </div>

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
            Email Address
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@domain.com"
            className="w-full bg-white border border-black/20 p-3 text-sm focus:border-black focus:outline-none"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="login-password" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
              Password
            </label>
            <Link to="/forgot-password" className="text-[11px] text-neutral-500 hover:text-black uppercase tracking-wider underline">
              Forgot?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-white border border-black/20 p-3 text-sm focus:border-black focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3.5 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center space-x-2 shadow-md disabled:opacity-50 cursor-pointer"
        >
          <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="pt-4 text-center text-xs text-neutral-600 border-t border-black/10">
        Don't have an account?{' '}
        <Link to="/register" state={location.state} className="font-bold text-black uppercase underline ml-1">
          Create Account
        </Link>
      </div>
    </div>
  );
};
