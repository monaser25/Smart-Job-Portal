import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ROUTES } from '../../utils/constants';
import Stagger from '../../motion/Stagger';
import { EASE, SPRING_PRESS } from '../../motion/variants';

export default function ServerErrorPage() {
  const reduce = useReducedMotion();

  return (
    <div className={"stitch-page bg-background text-on-background min-h-screen flex flex-col font-body-md antialiased"}>
      {/* Error state: Semantic suppression of navigation */}
      {/* The user is in a "dead end" relative to global nav, prioritizing the error canvas */}
      <main className="flex-grow flex items-center justify-center p-gutter">
        <Stagger className="max-w-xl w-full bg-surface-container-lowest rounded-xl p-stack-lg shadow-[0px_4px_20px_rgba(15,23,42,0.05)] text-center flex flex-col items-center">
          <Stagger.Item>
            <motion.div
              aria-hidden="true"
              className="w-24 h-24 bg-error-container text-error rounded-full flex items-center justify-center mb-stack-md"
              animate={reduce ? undefined : { y: [0, -8, 0], scale: [1, 1.04, 1] }}
              transition={reduce ? undefined : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="material-symbols-outlined !text-[48px]" data-icon="dns" data-weight="fill" style={{fontVariationSettings: '"FILL" 1'}}>dns</span>
            </motion.div>
          </Stagger.Item>
          <Stagger.Item className="mb-stack-md">
            <p className="font-ai-score text-ai-score text-error mb-unit">500</p>
            <h1 className="font-h1 text-h1 text-primary">Something went wrong</h1>
          </Stagger.Item>
          <Stagger.Item as="p" className="font-body-lg text-body-lg text-on-surface-variant mb-stack-lg max-w-md mx-auto">
            We're experiencing an internal server issue. Our team has been notified and is working to fix it. Please
            try again in a few minutes.
          </Stagger.Item>
          <Stagger.Item className="flex flex-col sm:flex-row items-center gap-stack-md w-full justify-center mb-stack-md">
            <motion.button
              className="w-full sm:w-auto bg-secondary hover:bg-secondary-container text-on-secondary font-h3 text-h3 px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              whileHover={reduce ? undefined : { y: -2, transition: { duration: 0.2, ease: EASE } }}
              whileTap={reduce ? undefined : { scale: 0.97, transition: SPRING_PRESS }}
            >
              <span className="material-symbols-outlined" data-icon="refresh">refresh</span>
              Try Again
            </motion.button>
            <Link className="w-full sm:w-auto bg-transparent border border-outline-variant text-on-surface hover:bg-surface-container-low font-h3 text-h3 px-6 py-3 rounded-lg transition-colors flex items-center justify-center" to={ROUTES.HOME}>
              Go to Home
            </Link>
          </Stagger.Item>
          <Stagger.Item as="p" className="font-body-md text-body-md text-on-surface-variant mt-stack-md">
            If the issue persists, please <Link className="text-secondary hover:underline font-semibold" to={ROUTES.CONTACT}>Contact
              Support</Link>.
          </Stagger.Item>
        </Stagger>
      </main>
      
    </div>
  );
}
