import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { scaleIn, SPRING_PRESS } from '../motion/variants';

const SCROLL_THRESHOLD = 400;

export default function BackToTop() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      setIsVisible(window.scrollY > SCROLL_THRESHOLD);
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  const buttonClasses = 'fixed bottom-6 end-6 z-[70] flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-on-secondary shadow-hover transition-colors hover:bg-secondary-container focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  if (reduce) {
    return isVisible ? (
      <button
        aria-label={t('common.backToTop')}
        className={buttonClasses}
        onClick={scrollToTop}
        type="button"
      >
        <span className="material-symbols-outlined text-[24px]" aria-hidden="true">arrow_upward</span>
      </button>
    ) : null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          aria-label={t('common.backToTop')}
          className={buttonClasses}
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          exit="exit"
          whileTap={{ scale: 0.94, transition: SPRING_PRESS }}
          onClick={scrollToTop}
          type="button"
        >
          <span className="material-symbols-outlined text-[24px]" aria-hidden="true">arrow_upward</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
