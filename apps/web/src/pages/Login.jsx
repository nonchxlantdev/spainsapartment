// apps/web/src/pages/Login.jsx — password gate shown before the app loads.
import { useState } from 'react';
import logo from '../assets/logo.png';
import { IconEye, IconEyeOff, IconMoon, IconShield, IconSun } from '../icons.jsx';
import { btnPrimary, focusRing, inputClass } from '../ui.js';

export default function Login({ onAuthenticated, theme, onToggleTheme }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const isDark = theme !== 'light';

  function handleSubmit(e) {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);

    // A direct fetch here (not the shared apiPost helper) on purpose: a
    // wrong-password 401 should show an inline error, not trigger the
    // shared helper's global "session expired, reload" behavior.
    fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Incorrect password');
        }
        return res.json();
      })
      .then(() => onAuthenticated())
      .catch(err => setError(err.message || 'Incorrect password'))
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(245,158,11,0.12), transparent 40%), radial-gradient(circle at 80% 70%, rgba(34,211,238,0.12), transparent 40%)'
        }}
      />

      <button
        type="button"
        onClick={onToggleTheme}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`absolute top-4 right-4 w-9 h-9 inline-flex items-center justify-center border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 transition-colors duration-150 ${focusRing}`}
      >
        {isDark ? <IconSun className="w-4 h-4" /> : <IconMoon className="w-4 h-4" />}
      </button>

      <form onSubmit={handleSubmit} className="hud-panel relative w-full max-w-[380px] p-7 animate-row-in">
        <div className="flex flex-col items-center text-center mb-6">
          <img src={logo} alt="Spain's Apartment logo" className="w-16 h-16 object-contain mb-3" />
          <h1 className="text-[18px] font-bold tracking-wide text-foreground m-0 uppercase">Building Control</h1>
          <p className="text-[11px] text-mutedfg mt-1 mb-0 font-mono uppercase tracking-[0.2em]">Access Terminal</p>
        </div>

        <label
          htmlFor="login-password"
          className="block text-[11px] font-semibold uppercase tracking-wider text-amber-500 mb-1.5"
        >
          Password
        </label>
        <div className="relative mb-2">
          <IconShield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/70" />
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            className={`${inputClass} pl-9 pr-9`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            title={showPassword ? 'Hide password' : 'Show password'}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-mutedfg hover:text-foreground transition-colors duration-150 ${focusRing}`}
          >
            {showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <p className="text-[12px] text-red-400 font-medium mb-3" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !password}
          className={`${btnPrimary} w-full justify-center mt-3 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {submitting ? 'Authenticating…' : 'Unlock'}
        </button>

        <p className="text-[10.5px] text-mutedfg text-center mt-5 mb-0 uppercase tracking-[0.18em]">
          Spain&apos;s Apartment · Building Control
        </p>
      </form>
    </div>
  );
}
