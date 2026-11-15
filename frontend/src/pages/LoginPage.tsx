import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { authService, friendlyAuthError } from '../services/authService';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PasswordInput } from '../components/PasswordInput';
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

  // Sign-in itself is done by Firebase; only the role check talks to our server.
  // Never let a slow server keep the button stuck on "Signing in…" — move on after a few seconds.
  const goAfterLogin = async () => {
    let role: string | undefined;
    try {
      const res: any = await Promise.race([
        apiClient.get('/auth/profile'),
        new Promise((resolve) => setTimeout(() => resolve(null), 4000))
      ]);
      role = res?.data?.user?.role;
    } catch {
      /* profile load failure shouldn't block login */
    }
    refreshProfile().catch(() => undefined); // keep the app's copy fresh, in the background
    if (role === 'ADMIN') {
      navigate(from && from.startsWith('/admin') ? from : '/admin', { replace: true });
      return;
    }
    navigate(from || '/account', { replace: true });
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
    <div className="lx-login relative min-h-[calc(100svh-64px)] flex items-center justify-center px-4 py-12 sm:py-16 overflow-hidden">
      <div className="lx-login-wallpaper" aria-hidden="true" />
      <div className="lx-login-card relative w-full max-w-[400px] px-6 py-8 sm:px-9 sm:py-10">
        <div className="flex flex-col items-center text-center">
          <span className="lx-app-icon w-[60px] h-[60px] rounded-[17px] flex items-center justify-center">
            <svg viewBox="0 0 230 255" className="w-[24px] h-[27px]" aria-hidden="true">
              <defs>
                <linearGradient id="lxLoginOr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#FF8A45" />
                  <stop offset="1" stopColor="#FF5400" />
                </linearGradient>
              </defs>
              <g fill="url(#lxLoginOr)">
                <path d="M0 0H51V203H230V255H0Z" />
                <path d="M65 38H111L184 203H138Z" />
                <path d="M144 38H190L116 203H70Z" />
              </g>
            </svg>
          </span>
          <h1 className="mt-5 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-[#0b0b0f]">Welcome back</h1>
          <p className="mt-1 text-[13.5px] text-[#6e6e73]">Sign in to your LEVIX account</p>
        </div>

        {errorMsg && (
          <div role="alert" className="mt-6 px-3.5 py-3 rounded-[14px] bg-red-50/90 border border-red-200 text-red-700 text-[12.5px] font-medium">
            {errorMsg}
          </div>
        )}

        <div className="mt-7 lx-login-google">
          <GoogleSignInButton onClick={handleGoogle} disabled={loading} />
        </div>

        <div className="my-6 flex items-center gap-3 text-[12px] text-[#8e8e93]">
          <span className="h-px flex-1 bg-black/[0.08]" />
          or
          <span className="h-px flex-1 bg-black/[0.08]" />
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-3.5">
          <div>
            <label htmlFor="login-email" className="block text-[12.5px] font-medium text-[#3a3a3f] mb-1.5 pl-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="lx-field w-full h-12 px-4 text-[15px]"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5 px-1">
              <label htmlFor="login-password" className="block text-[12.5px] font-medium text-[#3a3a3f]">
                Password
              </label>
              <Link to="/forgot-password" className="text-[12.5px] text-[#ff5400] hover:text-[#d94800] font-medium">
                Forgot?
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="lx-field w-full h-12 px-4 text-[15px]"
            />
          </div>

          <button type="submit" disabled={loading} className="lx-btn-primary w-full h-12 mt-2 flex items-center justify-center gap-2 text-[15px] font-semibold disabled:opacity-60">
            <span>{loading ? 'Signing in…' : 'Sign in'}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="mt-7 text-center text-[13px] text-[#6e6e73]">
          New to LEVIX?{' '}
          <Link to="/register" state={location.state} className="font-semibold text-[#0b0b0f] hover:text-[#ff5400]">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};
