import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ROUTES } from '../../utils/constants';
import Stagger from '../../motion/Stagger';
import { EASE, SPRING_PRESS } from '../../motion/variants';

export default function NotFoundPage() {
  const reduce = useReducedMotion();

  return (
    <div className={"stitch-page bg-background text-on-background min-h-screen flex flex-col font-body-md"}>
      <div>
        {/* TopNavBar component suppressed as 404 is a task-focused/dead-end screen */}
        <main className="flex-grow flex items-center justify-center p-gutter">
          <Stagger className="max-w-2xl w-full text-center flex flex-col items-center">
            <Stagger.Item>
              <motion.div
                className="w-48 h-48 mb-stack-lg rounded-full bg-surface-container-high flex items-center justify-center relative overflow-hidden"
                animate={reduce ? undefined : { y: [0, -8, 0], scale: [1, 1.04, 1] }}
                transition={reduce ? undefined : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="material-symbols-outlined text-[100px] text-outline-variant" style={{fontVariationSettings: '"FILL" 0'}}>
                  find_in_page
                </span>
              </motion.div>
            </Stagger.Item>
            <Stagger.Item as="h1" className="font-h1 text-h1 text-primary mb-stack-sm">
              Page Not Found
            </Stagger.Item>
            <Stagger.Item as="p" className="font-body-lg text-body-lg text-on-surface-variant max-w-lg mx-auto mb-stack-lg">
              Oops! The page you're looking for doesn't exist or has been moved. Let's get you back to finding your
              next career opportunity.
            </Stagger.Item>
            <Stagger.Item className="flex flex-col sm:flex-row gap-stack-md justify-center w-full max-w-md">
              <motion.div
                className="w-full sm:w-auto"
                whileHover={reduce ? undefined : { y: -2, transition: { duration: 0.2, ease: EASE } }}
                whileTap={reduce ? undefined : { scale: 0.97, transition: SPRING_PRESS }}
              >
                <Link className="inline-flex items-center justify-center px-gutter py-stack-sm rounded-lg bg-secondary text-on-secondary font-body-lg text-body-lg font-bold hover:opacity-90 transition-opacity w-full sm:w-auto shadow-[0px_4px_20px_rgba(15,23,42,0.05)]" to={ROUTES.JOBS}>
                  <span className="material-symbols-outlined mr-unit text-[20px]">search</span>
                  Search Jobs
                </Link>
              </motion.div>
              <Link className="inline-flex items-center justify-center px-gutter py-stack-sm rounded-lg border border-outline-variant text-on-surface font-body-lg text-body-lg font-bold hover:bg-surface-container-low transition-colors w-full sm:w-auto bg-transparent" to={ROUTES.HOME}>
                <span className="material-symbols-outlined mr-unit text-[20px]">home</span>
                Go to Home
              </Link>
            </Stagger.Item>
          </Stagger>
        </main>
        {/* Footer Component from JSON */}
        <footer className="bg-surface-container-highest dark:bg-surface-dim text-on-surface-variant dark:text-outline-variant font-label-sm text-label-sm uppercase tracking-wider full-width border-t border-outline-variant flat no shadows w-full py-stack-lg px-margin-desktop flex justify-between items-center max-w-container-max-width mx-auto">
          <div>
            © 2026 Smart Job Portal. Intelligence in Recruitment.
          </div>
          <nav className="flex gap-gutter">
            <Link className="text-on-surface-variant hover:text-secondary hover:underline decoration-secondary transition-all Hover: opacity-80" to={ROUTES.PRIVACY}>Privacy</Link>
            <Link className="text-on-surface-variant hover:text-secondary hover:underline decoration-secondary transition-all Hover: opacity-80" to={ROUTES.TERMS}>Terms</Link>
            <Link className="text-on-surface-variant hover:text-secondary hover:underline decoration-secondary transition-all Hover: opacity-80" to={ROUTES.HOME}>API</Link>
            <Link className="text-on-surface-variant hover:text-secondary hover:underline decoration-secondary transition-all Hover: opacity-80" to={ROUTES.CONTACT}>Support</Link>
          </nav>
        </footer>
      </div>
      
    </div>
  );
}
