import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Stethoscope, ShieldCheck, CheckCircle2, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'reviewer' | 'admin'>('reviewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      try {
        await register(name.trim(), email.trim(), password, role, role === 'admin' ? 'Revenue Assurance Lead' : 'Claims Team');
        navigate(from, { replace: true });
      } catch (err: any) {
        setError(
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to create account. Please check your details.'
        );
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await login(email.trim(), password);
        navigate(from, { replace: true });
      } catch (err: any) {
        setError(
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Invalid email or password. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setError(null);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-bg-app">
      {/* Clean Brand Column (Left) */}
      <div className="hidden lg:flex lg:col-span-6 bg-sidebar-bg text-white p-16 flex-col justify-between relative overflow-hidden border-r border-sidebar-border">
        {/* Subtle ambient lighting */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-brand/10 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/20 text-brand flex items-center justify-center shadow-md border border-brand/30">
            <Stethoscope size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight block">CareSure</span>
            <span className="text-[10px] font-bold tracking-widest text-sidebar-text uppercase block">
              Revenue Assurance
            </span>
          </div>
        </div>

        {/* Minimal Uncluttered Hero Statement */}
        <div className="relative z-10 max-w-md my-auto py-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand border border-brand/20 text-xs font-semibold mb-6">
            <Sparkles size={13} />
            <span>Hospital Claim Verification</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white mb-4">
            Clinical Revenue Integrity, Simplified.
          </h1>

          <p className="text-sidebar-text text-sm leading-relaxed mb-8">
            Pre-submission claim validation, unbilled procedure recovery, and explainable AI audit signals for healthcare teams.
          </p>

          <div className="space-y-3.5">
            {[
              { title: 'Automated Tariff Matching', desc: 'Cross-checks encounter billing against hospital tariff book' },
              { title: 'Hybrid Risk Scoring', desc: 'Deterministic rules paired with Random Forest & Isolation Forest' },
              { title: 'Forensic Audit Trail', desc: 'Tamper-resistant compliance logging for every claim action' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3 text-xs">
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={13} />
                </div>
                <div>
                  <span className="font-bold text-white block">{f.title}</span>
                  <span className="text-sidebar-text text-[11px]">{f.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="relative z-10 text-xs text-sidebar-text/70 flex items-center justify-between border-t border-sidebar-border/60 pt-6">
          <span>Enterprise Healthcare Platform</span>
          <span>HIPAA & DPDP Ready</span>
        </div>
      </div>

      {/* Auth Card Column (Right) */}
      <div className="col-span-1 lg:col-span-6 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-bg-surface border border-border-subtle rounded-2xl p-8 sm:p-10 shadow-lg">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-border-subtle mb-6">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all flex-1 text-center ${
                mode === 'signin'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all flex-1 text-center ${
                mode === 'signup'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-text-main">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-xs text-text-muted mt-1">
              {mode === 'signin'
                ? 'Sign in to access your hospital claim verification workspace.'
                : 'Join your hospital revenue assurance and audit team.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-risk-high-bg text-risk-high-text text-xs flex items-center gap-2.5 border border-red-200 dark:border-red-900/30">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Dr. Priya Sharma"
                  className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-text-main placeholder:text-text-muted outline-none focus:border-brand transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@hospital.com"
                className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-text-main placeholder:text-text-muted outline-none focus:border-brand transition-colors"
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('reviewer')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      role === 'reviewer'
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border-subtle bg-bg-subtle text-text-secondary hover:border-brand/40'
                    }`}
                  >
                    Claim Reviewer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      role === 'admin'
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border-subtle bg-bg-subtle text-text-secondary hover:border-brand/40'
                    }`}
                  >
                    Lead Auditor
                  </button>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-text-secondary">
                  Password
                </label>
                {mode === 'signin' && (
                  <span className="text-[11px] text-text-muted">
                    Min. 6 chars
                  </span>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-text-main outline-none focus:border-brand transition-colors"
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-text-main outline-none focus:border-brand transition-colors"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-brand text-text-onbrand text-xs font-bold hover:bg-brand-hover active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span>{loading ? (mode === 'signup' ? 'Creating Account...' : 'Signing in...') : (mode === 'signup' ? 'Create Account' : 'Sign In to Workspace')}</span>
              <ChevronRight size={15} />
            </button>
          </form>

          {/* Clean Toggle Link */}
          <div className="mt-6 pt-5 border-t border-border-subtle text-center">
            {mode === 'signin' ? (
              <p className="text-xs text-text-muted">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-brand font-bold hover:underline"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p className="text-xs text-text-muted">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-brand font-bold hover:underline"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
