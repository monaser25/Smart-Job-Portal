import { useMemo } from 'react';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';

export default function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });
  const transformOrigin = useMemo(() => {
    if (typeof document === 'undefined') return '0% 50%';
    return document.documentElement.dir === 'rtl' ? '100% 50%' : '0% 50%';
  }, []);

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px] bg-gradient-to-r from-secondary to-primary"
      style={{ scaleX, transformOrigin }}
    />
  );
}
