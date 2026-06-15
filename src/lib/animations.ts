// src/lib/animations.ts
export const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring' as const, stiffness: 280, damping: 22 }
  }
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 }
  }
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
  }
};

export const slideInRight = {
  hidden: { opacity: 0, x: 20 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 26 }
  }
};

export const taskComplete = {
  exit: {
    opacity: 0,
    x: -20,
    scale: 0.95,
    filter: 'blur(2px)',
    transition: { duration: 0.25, ease: 'easeOut' as const }
  }
};

