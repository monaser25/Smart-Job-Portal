import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../utils/constants';
import { authApi } from '../../api/authApi';
import Stagger from '../../motion/Stagger';
import { EASE, SPRING_PRESS } from '../../motion/variants';

export default function EmailVerificationResultPage() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [searchParams]);

  const resend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await authApi.resendVerification(email);
      alert(t('auth.emailVerification.resendSuccess'));
    } catch {
      alert(t('auth.emailVerification.resendFailed'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="stitch-page bg-surface text-on-surface min-h-screen flex flex-col font-body-md antialiased">
      <div>
        <nav className="bg-surface-container-lowest shadow-sm shadow-[0px_4px_20px_rgba(15,23,42,0.05)] sticky top-0 z-50 w-full">
          <div className="flex justify-between items-center w-full px-margin-desktop py-stack-md max-w-container-max-width mx-auto">
            <div className="font-h2 text-h2 font-bold text-primary">{t('app.productName')}</div>
            <div className="hidden md:flex items-center gap-stack-lg font-h3 text-h3 font-semibold">
              <Link className="text-on-surface-variant hover:text-secondary transition-colors pb-1" to={ROUTES.JOBS}>{t('nav.findJobs')}</Link>
              <Link className="text-on-surface-variant hover:text-secondary transition-colors pb-1" to={ROUTES.COMPANIES}>{t('nav.companies')}</Link>
              <Link className="text-on-surface-variant hover:text-secondary transition-colors pb-1" to={ROUTES.SALARY_GUIDE}>{t('nav.salaryGuide')}</Link>
            </div>
            <div className="flex items-center gap-stack-md">
              <Link className="font-h3 text-h3 font-semibold text-primary hover:bg-surface-container-low px-stack-md py-stack-sm rounded-lg" to={ROUTES.LOGIN}>{t('buttons.signIn')}</Link>
            </div>
          </div>
        </nav>

        <main className="flex-grow flex flex-col items-center justify-center p-margin-desktop gap-stack-lg max-w-container-max-width mx-auto w-full">
          <Stagger className="w-full text-center mb-stack-lg">
            <Stagger.Item as="h1" className="font-h1 text-h1 text-primary mb-stack-sm">{t('auth.emailVerification.pageTitle')}</Stagger.Item>
          </Stagger>

          {status === 'loading' && (
            <Stagger className="flex items-center gap-3">
              <Stagger.Item as="span" className="material-symbols-outlined animate-spin text-secondary text-4xl">progress_activity</Stagger.Item>
              <Stagger.Item as="p" className="text-on-surface-variant">{t('auth.emailVerification.verifying')}</Stagger.Item>
            </Stagger>
          )}

          {status === 'success' && (
            <Stagger className="bg-surface-container-lowest rounded-[16px] p-stack-lg shadow-sm flex flex-col items-center text-center border border-outline-variant/30 max-w-md w-full">
              <Stagger.Item>
                <motion.div
                  className="w-16 h-16 rounded-full bg-[#22C55E]/10 flex items-center justify-center mb-stack-md"
                  animate={reduce ? undefined : { y: [0, -8, 0], scale: [1, 1.04, 1] }}
                  transition={reduce ? undefined : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span className="material-symbols-outlined text-[#22C55E] text-4xl" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                </motion.div>
              </Stagger.Item>
              <Stagger.Item as="h2" className="font-h2 text-h2 text-primary mb-stack-sm">{t('auth.emailVerification.successTitle')}</Stagger.Item>
              <Stagger.Item as="p" className="font-body-md text-body-md text-on-surface-variant mb-stack-lg">
                {t('auth.emailVerification.successMessage')}
              </Stagger.Item>
              <Stagger.Item className="w-full">
                <motion.button
                  className="w-full bg-[#2563EB] text-white font-h3 text-h3 py-stack-sm px-stack-md rounded-lg hover:opacity-90 transition-opacity"
                  whileHover={reduce ? undefined : { y: -2, transition: { duration: 0.2, ease: EASE } }}
                  whileTap={reduce ? undefined : { scale: 0.97, transition: SPRING_PRESS }}
                  onClick={() => navigate(ROUTES.LOGIN)}
                >
                  {t('auth.emailVerification.continueToLogin')}
                </motion.button>
              </Stagger.Item>
            </Stagger>
          )}

          {status === 'error' && (
            <Stagger className="bg-surface-container-lowest rounded-[16px] p-stack-lg shadow-sm flex flex-col items-center text-center border border-outline-variant/30 max-w-md w-full">
              <Stagger.Item>
                <motion.div
                  className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center mb-stack-md"
                  animate={reduce ? undefined : { y: [0, -8, 0], scale: [1, 1.04, 1] }}
                  transition={reduce ? undefined : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span className="material-symbols-outlined text-error text-4xl" style={{ fontVariationSettings: '"FILL" 1' }}>error</span>
                </motion.div>
              </Stagger.Item>
              <Stagger.Item as="h2" className="font-h2 text-h2 text-primary mb-stack-sm">{t('auth.emailVerification.errorTitle')}</Stagger.Item>
              <Stagger.Item as="p" className="font-body-md text-body-md text-on-surface-variant mb-stack-lg">
                {t('auth.emailVerification.errorMessage')}
              </Stagger.Item>
              <Stagger.Item
                as="input"
                className="w-full border border-outline-variant rounded-lg px-4 py-3 mb-3 focus:outline-none focus:border-secondary"
                placeholder={t('auth.emailVerification.resendPlaceholder')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Stagger.Item className="w-full">
                <motion.button
                  className="w-full bg-[#2563EB] text-white font-h3 text-h3 py-stack-sm px-stack-md rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 mb-2"
                  disabled={resending}
                  whileHover={reduce || resending ? undefined : { y: -2, transition: { duration: 0.2, ease: EASE } }}
                  whileTap={reduce || resending ? undefined : { scale: 0.97, transition: SPRING_PRESS }}
                  onClick={resend}
                >
                  {resending ? t('auth.emailVerification.resending') : t('auth.emailVerification.resendButton')}
                </motion.button>
              </Stagger.Item>
              <Stagger.Item className="w-full">
                <Link className="w-full text-center border border-outline-variant text-primary font-h3 text-h3 py-stack-sm px-stack-md rounded-lg hover:bg-surface-container-low transition-colors block" to={ROUTES.LOGIN}>
                  {t('auth.emailVerification.backToLogin')}
                </Link>
              </Stagger.Item>
            </Stagger>
          )}
        </main>

        <footer className="bg-surface-container-highest border-t border-outline-variant w-full mt-auto">
          <div className="w-full py-stack-lg px-margin-desktop flex flex-col md:flex-row justify-between items-center max-w-container-max-width mx-auto gap-stack-md">
            <div className="font-h3 text-h3 font-bold text-primary">{t('app.productName')}</div>
            <div className="flex gap-stack-lg">
              <Link className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant hover:text-secondary" to={ROUTES.PRIVACY}>{t('footer.privacy')}</Link>
              <Link className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant hover:text-secondary" to={ROUTES.TERMS}>{t('footer.terms')}</Link>
              <Link className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant hover:text-secondary" to={ROUTES.CONTACT}>{t('footer.support')}</Link>
            </div>
            <div className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              {t('footer.copyrightShort')}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
