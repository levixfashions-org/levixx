import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { authService, friendlyAuthError } from '../services/authService';
import { AuthCard, AuthError, authButton, authInput, authLabel, authLink } from '../components/AuthCard';

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
    <AuthCard
      title="Reset your password"
      subtitle="We'll email you a secure link to set a new one."
      footer={
        <Link to="/login" className={authLink}>
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="mt-7 px-4 py-4 rounded-[16px] bg-green-50/90 border border-green-200 text-green-800 text-[13px] space-y-1.5">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Check your inbox
          </p>
          <p className="text-green-700/90">
            If an account exists for <b>{email}</b>, a reset link is on its way. Please also check your spam folder.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-7 space-y-3.5">
          {errorMsg && <AuthError>{errorMsg}</AuthError>}
          <div>
            <label htmlFor="fp-email" className={authLabel}>Email</label>
            <input id="fp-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className={authInput} />
          </div>
          <button type="submit" disabled={loading} className={authButton}>
            <span>{loading ? 'Sending…' : 'Send reset link'}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      )}
    </AuthCard>
  );
};
