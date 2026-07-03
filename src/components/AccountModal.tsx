import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/auth';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = 'signin' | 'signup' | 'forgot';

/** Traduit les erreurs Supabase les plus courantes ; générique sinon */
function errorKey(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'account.errInvalidCredentials';
  if (m.includes('already registered')) return 'account.errAlreadyRegistered';
  if (m.includes('at least 6 characters')) return 'account.errWeakPassword';
  if (m.includes('email not confirmed')) return 'account.errNotConfirmed';
  if (m.includes('email') && m.includes('invalid')) return 'account.errInvalidEmail';
  if (m.includes('rate limit') || m.includes('too many')) return 'account.errRateLimit';
  return 'account.errGeneric';
}

export default function AccountModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!open) return null;

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    setInfo(null);
  };

  const run = async (action: () => Promise<void>, successInfo?: string) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await action();
      if (successInfo) setInfo(successInfo);
      else onClose();
    } catch (e) {
      setError(t(errorKey(e instanceof Error ? e.message : '')));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'signin') {
      run(() => auth.signIn(email, password));
    } else if (tab === 'signup') {
      run(() => auth.signUp(email, password), t('account.checkInbox'));
    } else {
      run(() => auth.resetPassword(email), t('account.resetSent'));
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal account-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t(tab === 'signup' ? 'account.createTitle' : tab === 'forgot' ? 'account.forgotTitle' : 'account.signInTitle')}</h2>
          <button type="button" onClick={onClose} aria-label={t('settings.close')}>
            ✕
          </button>
        </div>

        {tab !== 'forgot' && (
          <>
            <button
              type="button"
              className="google-btn"
              disabled={busy}
              onClick={() => run(() => auth.signInWithGoogle())}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              {t('account.continueWithGoogle')}
            </button>
            <div className="account-divider">
              <span>{t('account.or')}</span>
            </div>
          </>
        )}

        <form onSubmit={submit} className="account-form">
          <label>
            <span>{t('account.email')}</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
            />
          </label>

          {tab !== 'forgot' && (
            <label>
              <span>{t('account.password')}</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
          )}

          {error && (
            <p className="account-error" role="alert">
              {error}
              {error === t('account.errNotConfirmed') && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => run(() => auth.resendConfirmation(email), t('account.checkInbox'))}
                >
                  {t('account.resend')}
                </button>
              )}
            </p>
          )}
          {info && <p className="account-info">{info}</p>}

          <button type="submit" className="account-submit" disabled={busy}>
            {busy
              ? '…'
              : t(tab === 'signup' ? 'account.createBtn' : tab === 'forgot' ? 'account.resetBtn' : 'account.signInBtn')}
          </button>
        </form>

        <div className="account-links">
          {tab === 'signin' && (
            <>
              <button type="button" className="link-btn" onClick={() => switchTab('signup')}>
                {t('account.noAccount')}
              </button>
              <button type="button" className="link-btn" onClick={() => switchTab('forgot')}>
                {t('account.forgotLink')}
              </button>
            </>
          )}
          {tab !== 'signin' && (
            <button type="button" className="link-btn" onClick={() => switchTab('signin')}>
              {t('account.haveAccount')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
