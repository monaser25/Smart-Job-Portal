import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ROUTES, getRoleRedirect, normalizeRole } from '../../utils/constants';
import PublicNavBar from '../../components/PublicNavBar';
import { useToast } from '../../components/useToast';
import { useAuth } from '../../context/useAuth';
import { normalizeApiError } from '../../utils/apiError';
import Stagger from '../../motion/Stagger';
import Reveal from '../../motion/Reveal';
import Typewriter from '../../motion/Typewriter';
import { SPRING_PRESS, EASE } from '../../motion/variants';
import icon from '../../assets/icon.png';

const isRedirectAllowedForRole = (target, role) => {
  if (!target || target === ROUTES.UNAUTHORIZED || target === '/403') return false;

  const normalizedRole = normalizeRole(role);
  if (target.startsWith('/admin')) return normalizedRole === 'admin';
  if (target.startsWith('/company')) return normalizedRole === 'company';
  if (target.startsWith('/seeker')) return normalizedRole === 'job_seeker';
  return true;
};

const safePostLoginRedirect = (role, candidates) => {
  const target = candidates.find((candidate) => isRedirectAllowedForRole(candidate, role));
  return target || getRoleRedirect(role) || ROUTES.HOME;
};

const authInputClass = (hasError) => [
  'mt-unit w-full rounded-2xl border py-3 ps-11 pe-stack-md text-on-surface outline-none transition-all duration-300 ease-out placeholder:text-on-surface-variant hover:border-secondary/40 focus:border-secondary focus:ring-2 focus:ring-secondary/25',
  hasError ? 'border-error bg-error-container/20' : 'border-outline-variant/80 bg-surface-container-lowest/85 shadow-sm',
].join(' ');

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const reduce = useReducedMotion();
  const { t } = useTranslation();
  const translatedTypingPhrases = t('auth.login.heroTypingPhrases', { returnObjects: true });
  const heroTypingPhrases = Array.isArray(translatedTypingPhrases)
    ? translatedTypingPhrases
    : [t('auth.login.heroTitle')];

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // 1. التوجيه هيحصل هنا بس! لما الـ user state تتحدث فعلياً
  useEffect(() => {
    if (user) {
      // Priority: explicit router state (ProtectedRoute) > sessionStorage
      // (axios 401 interceptor stash) > role default. The sessionStorage
      // entry is consumed once and then cleared.
      const fromLocation = location.state?.from;
      const fromState = fromLocation?.pathname
        ? `${fromLocation.pathname}${fromLocation.search || ''}`
        : null;
      let stashed = null;
      try {
        stashed = sessionStorage.getItem('postLoginRedirect');
        if (stashed) sessionStorage.removeItem('postLoginRedirect');
      } catch {
        // sessionStorage unavailable — fall through to defaults.
      }
      const target = safePostLoginRedirect(user.role, [fromState, stashed]);
      navigate(target, { replace: true });
    }
  }, [user, navigate, location]);

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = t('auth.login.errors.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t('auth.login.errors.emailInvalid');
    if (!form.password) e.password = t('auth.login.errors.passwordRequired');
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }

    setLoading(true);
    setServerError('');

    try {
      // 2. بننده دالة اللوجين من الكونتكست، والمفروض الدالة دي بتعمل setUser
      await login(form);
      addToast({ title: t('auth.login.toastTitle'), message: t('auth.login.toastMessage'), type: 'success' });

      // شيلنا الـ navigate من هنا عشان ميعملش تضارب مع الـ useEffect
      // شيلنا الـ flushSync لأن ملهاش لازمة هنا وكانت ممكن تعمل مشاكل

    } catch (err) {
      setServerError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stitch-page flex min-h-screen flex-col bg-background text-on-background font-body-md text-body-md antialiased">
      <PublicNavBar showAuthActions={false} />

      <main className="relative isolate grid flex-1 overflow-hidden bg-gradient-to-br from-background via-surface-container-low/50 to-background lg:grid-cols-2">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-180px] top-[-160px] h-[460px] w-[460px] rounded-full bg-secondary/10 blur-3xl lg:hidden"
          animate={reduce ? undefined : { y: [0, -16, 0], opacity: [0.65, 0.9, 0.65] }}
          transition={reduce ? undefined : { duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />

        <Reveal as="section" className="relative hidden overflow-hidden border-e border-outline-variant/70 bg-surface-container-low/70 p-margin-desktop lg:flex lg:flex-col lg:items-center lg:justify-center">
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full bg-secondary/10 blur-3xl"
            animate={reduce ? undefined : { y: [0, -14, 0] }}
            transition={reduce ? undefined : { duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -right-32 h-[520px] w-[520px] rounded-full bg-tertiary/10 blur-3xl"
            animate={reduce ? undefined : { y: [0, 14, 0] }}
            transition={reduce ? undefined : { duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <Stagger className="relative z-10 max-w-lg text-center" delayChildren={0.1} staggerChildren={0.1}>
            <Stagger.Item className="mx-auto mb-stack-lg flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-outline-variant/70 bg-surface-container-lowest/80 p-3 shadow-hover backdrop-blur-xl">
              <img src={icon} alt={t('app.productName')} className="h-full w-full object-contain" />
            </Stagger.Item>
            <Stagger.Item as="h1" className="mb-stack-md font-h1 text-h1 text-primary">
              <Typewriter
                phrases={heroTypingPhrases}
                className="inline-block min-h-[1.05em]"
                caretClassName="text-secondary"
              />
            </Stagger.Item>
            <Stagger.Item as="p" className="font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
              <span>{t('auth.login.heroDescription')}</span>
            </Stagger.Item>
          </Stagger>
        </Reveal>

        <section className="relative z-10 flex items-center justify-center px-4 py-10 sm:px-gutter lg:px-margin-desktop lg:py-margin-desktop">
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-outline-variant/70 bg-surface-container-lowest/85 p-6 shadow-hover backdrop-blur-xl sm:p-8"
            initial={reduce ? false : { opacity: 0, scale: 0.95 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <div aria-hidden="true" className="absolute inset-px rounded-[1.95rem] bg-gradient-to-br from-white/70 via-transparent to-secondary/10 dark:from-white/5 dark:to-secondary/15" />
            <div aria-hidden="true" className="absolute end-8 top-8 h-24 w-24 rounded-full bg-secondary/10 blur-2xl" />

            <div className="relative mb-stack-lg text-center">
              <motion.div 
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-secondary/15 bg-secondary/10 text-secondary shadow-sm lg:hidden"
                initial={reduce ? false : { rotate: -8, opacity: 0, scale: 0.92 }}
                animate={reduce ? { opacity: 1 } : { rotate: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <img src={icon} alt={t('app.productName')} className="h-10 w-10 object-contain" />
              </motion.div>
              <h2 className="font-h1 text-h1 text-primary">{t('auth.login.welcomeBack')}</h2>
              <p className="mt-2 font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
                {t('auth.login.subtitle')}
              </p>
            </div>

            {serverError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="relative mb-stack-md flex items-start gap-stack-sm rounded-xl border border-error/20 bg-error-container p-stack-sm shadow-sm"
              >
                <span className="material-symbols-outlined shrink-0 text-error" style={{ fontVariationSettings: '"FILL" 1' }}>error</span>
                <p className="min-w-0 break-words font-body-md text-body-md text-on-error-container">{serverError}</p>
              </motion.div>
            )}

            <form className="relative flex flex-col gap-stack-md" onSubmit={handleSubmit}>
              <Stagger delayChildren={0.2} staggerChildren={0.05}>
                <Stagger.Item>
                  <label className="font-label-sm text-label-sm text-on-surface" htmlFor="email">{t('auth.login.emailLabel')}</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant transition-colors group-focus-within:text-secondary">mail</span>
                  <input
                    className={authInputClass(errors.email)}
                    id="email"
                    name="email"
                    placeholder={t('auth.login.emailPlaceholder')}
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                  />
                  </div>
                  {errors.email && <p className="mt-unit break-words font-body-md text-body-md text-sm text-error">{errors.email}</p>}
                </Stagger.Item>

                <Stagger.Item className="mt-4">
                  <div className="flex items-center justify-between">
                    <label className="font-label-sm text-label-sm text-on-surface" htmlFor="password">{t('auth.login.passwordLabel')}</label>
                    <Link className="font-label-sm text-label-sm text-secondary transition-colors hover:text-secondary-container hover:underline" to="/forgot-password">{t('auth.login.forgotPassword')}</Link>
                  </div>
                  <div className="relative group">
                    <span className="material-symbols-outlined pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant transition-colors group-focus-within:text-secondary">lock</span>
                  <input
                    className={authInputClass(errors.password)}
                    id="password"
                    name="password"
                    placeholder={t('auth.login.passwordPlaceholder')}
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                  />
                  </div>
                  {errors.password && <p className="mt-unit break-words font-body-md text-body-md text-sm text-error">{errors.password}</p>}
                </Stagger.Item>

                <Stagger.Item className="mt-8">
                  <motion.button
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-3 font-h3 text-h3 text-on-secondary shadow-sm transition-all duration-300 ease-out hover:bg-secondary-container hover:shadow-hover ${loading ? 'cursor-not-allowed opacity-60' : ''}`}
                    type="submit"
                    disabled={loading}
                    whileHover={reduce || loading ? undefined : { y: -2, transition: { duration: 0.2, ease: EASE } }}
                    whileTap={reduce || loading ? undefined : { scale: 0.97, transition: SPRING_PRESS }}
                  >
                    {loading && <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span>}
                    {loading ? t('auth.login.signingIn') : t('auth.login.submit')}
                  </motion.button>
                </Stagger.Item>
              </Stagger>
            </form>

            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.5 }}
              className="relative mt-stack-lg border-t border-outline-variant/70 pt-6 text-center"
            >
              <p className="font-body-md text-body-md text-on-surface-variant">
                {t('auth.login.newHere')}{' '}
                <Link className="font-semibold text-secondary transition-colors hover:text-secondary-container hover:underline" to={ROUTES.REGISTER}>{t('auth.login.createAccount')}</Link>
              </p>
            </motion.div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
