import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { authService, friendlyAuthError } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export const RegisterPage: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from: string | undefined = (location.state as any)?.from?.pathname || (location.state as any)?.from;

  const finish = async () => {
    await refreshProfile();
    navigate(from && !from.startsWith('/admin') ? from : '/account', { replace: true });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (password.length < 6) return setErrorMsg('Password should be at least 6 characters.');
    if (password !== confirm) return setErrorMsg('Passwords do not match.');
    setLoading(true);
    try {
      await authService.register(email, password, displayName);
      await finish();
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
      if (u) await finish();
    } catch (err: any) {
      setErrorMsg(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-white border border-black/20 p-3 text-sm focus:border-black focus:outline-none';
  const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1';

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-black">Create Account</h1>
        <p className="text-xs text-neutral-600">Track orders, save addresses and check out faster.</p>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3.5 bg-red-100 border border-red-300 text-red-800 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <GoogleSignInButton onClick={handleGoogle} disabled={loading} label="Sign up with Google" />

      <div className="relative flex items-center justify-center">
        <div className="border-t border-black/10 w-full" />
        <span className="absolute bg-[#EFEFEF] px-3 text-[10px] uppercase tracking-widest text-neutral-500 font-mono">Or with Email</span>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label htmlFor="reg-name" className={labelClass}>Full Name</label>
          <input id="reg-name" type="text" required autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="reg-email" className={labelClass}>Email Address</label>
          <input id="reg-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" className={inputClass} />
        </div>
        <div>
          <label htmlFor="reg-pass" className={labelClass}>Password</label>
          <input id="reg-pass" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className={inputClass} />
        </div>
        <div>
          <label htmlFor="reg-confirm" className={labelClass}>Confirm Password</label>
          <input id="reg-confirm" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" className={inputClass} />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3.5 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center space-x-2 shadow-md disabled:opacity-50 cursor-pointer"
        >
          <span>{loading ? 'Creating account...' : 'Create Account'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="pt-4 text-center text-xs text-neutral-600 border-t border-black/10">
        Already have an account?{' '}
        <Link to="/login" state={location.state} className="font-bold text-black uppercase underline ml-1">Sign In</Link>
      </div>
    </div>
  );
};
