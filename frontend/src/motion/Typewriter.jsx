import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function Typewriter({
  phrases,
  className,
  typingSpeed = 60,
  deletingSpeed = 35,
  pauseDuration = 1600,
  caretClassName,
}) {
  const reduce = useReducedMotion();
  const timerRef = useRef(null);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typedLength, setTypedLength] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const phraseList = useMemo(
    () => phrases.filter((phrase) => phrase.length > 0),
    [phrases]
  );
  const firstPhrase = phraseList[0] || '';
  const safePhraseIndex = phraseList.length > 0 ? phraseIndex % phraseList.length : 0;
  const currentPhrase = phraseList[safePhraseIndex] || '';
  const currentCharacters = Array.from(currentPhrase);
  const visibleText = currentCharacters.slice(0, typedLength).join('');
  const caretClasses = [
    'ms-[0.08em] inline-block h-[0.9em] w-[0.08em] rounded-full bg-current align-[-0.08em]',
    caretClassName,
  ].filter(Boolean).join(' ');

  useEffect(() => {
    if (reduce || phraseList.length === 0) return undefined;

    const currentLength = currentCharacters.length;
    const atPhraseEnd = typedLength === currentLength;
    const atPhraseStart = typedLength === 0;
    let tickDelay = typingSpeed;

    if (atPhraseEnd && !isDeleting) {
      tickDelay = pauseDuration;
    } else if (isDeleting) {
      tickDelay = deletingSpeed;
    }

    timerRef.current = setTimeout(() => {
      if (isDeleting) {
        if (atPhraseStart) {
          setIsDeleting(false);
          setPhraseIndex((index) => (index + 1) % phraseList.length);
          return;
        }

        setTypedLength((length) => Math.max(0, length - 1));
        return;
      }

      if (atPhraseEnd) {
        setIsDeleting(true);
        return;
      }

      setTypedLength((length) => Math.min(currentLength, length + 1));
    }, tickDelay);

    return () => clearTimeout(timerRef.current);
  }, [
    currentCharacters.length,
    deletingSpeed,
    isDeleting,
    pauseDuration,
    phraseList.length,
    reduce,
    typedLength,
    typingSpeed,
  ]);

  if (reduce || phraseList.length === 0) {
    return <span className={className}>{firstPhrase}</span>;
  }

  return (
    <span className={className} aria-label={firstPhrase}>
      <span aria-hidden="true" className="inline-block min-h-[1.05em]">
        {visibleText}
        <motion.span
          aria-hidden="true"
          className={caretClasses}
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </span>
    </span>
  );
}
