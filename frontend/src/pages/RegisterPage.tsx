import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { authService, friendlyAuthError } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { AuthCard, AuthDivider, AuthError, authButton, authInput, authLabel, authLink } from '../components/AuthCard';

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

  return (
    <AuthCard
      title="Create your account"
      subtitle="Track orders, save addresses and check out faster."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={location.state} className={authLink}>
            Sign in
          </Link>
        </>
      }
    >
      {errorMsg && <AuthError>{errorMsg}</AuthError>}

      <div className="mt-7 lx-login-google">
        <GoogleSignInButton onClick={handleGoogle} disabled={loading} label="Sign up with Google" />
      </div>

      <AuthDivider />

      <form onSubmit={handleRegister} className="space-y-3.5">
        <div>
          <label htmlFor="reg-name" className={authLabel}>Full name</label>
          <input id="reg-name" type="text" required autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className={authInput} />
        </div>
        <div>
          <label htmlFor="reg-email" className={authLabel}>Email</label>
          <input id="reg-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" className={authInput} />
        </div>
        <div>
          <label htmlFor="reg-pass" className={authLabel}>Password</label>
          <input id="reg-pass" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className={authInput} />
        </div>
        <div>
          <label htmlFor="reg-confirm" className={authLabel}>Confirm password</label>
          <input id="reg-confirm" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" className={authInput} />
        </div>
        <button type="submit" disabled={loading} className={authButton}>
          <span>{loading ? 'Creating account…' : 'Create account'}</span>
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>
    </AuthCard>
  );
};
