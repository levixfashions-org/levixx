import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { authService, friendlyAuthError } from '../services/authService';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await authService.resetPassword(email);
      setSent(true);
    } catch (err: any) {
      // Don't reveal whether an account exists.
      if (err?.code === 'auth/user-not-found') setSent(true);
      else setErrorMsg(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-black">Reset Password</h1>
        <p className="text-xs text-neutral-600">We'll email you a secure link to set a new password.</p>
      </div>

      {sent ? (
        <div className="p-5 bg-green-50 border border-green-300 text-green-900 text-xs space-y-2">
          <div className="flex items-center space-x-2 font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Check your inbox</span>
          </div>
          <p>If an account exists for <b>{email}</b>, a password reset link has been sent. Please also check your spam folder.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div role="alert" className="p-3.5 bg-red-100 border border-red-300 text-red-800 text-xs font-semibold">{errorMsg}</div>
          )}
          <div>
            <label htmlFor="fp-email" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">Email Address</label>
            <input
              id="fp-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full bg-white border border-black/20 p-3 text-sm focus:border-black focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3.5 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? 'Sending...' : 'Send Reset Link'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      <div className="pt-4 text-center text-xs text-neutral-600 border-t border-black/10">
        <Link to="/login" className="font-bold text-black uppercase underline">Back to Sign In</Link>
      </div>
    </div>
  );
};
