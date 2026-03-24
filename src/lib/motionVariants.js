// Shared motion animation variants

export const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, y: 6,  transition: { duration: 0.15, ease: 'easeIn' } }
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { opacity: 0, transition: { duration: 0.12 } }
};

export const dropDown = {
  initial: { opacity: 0, scaleY: 0.9, y: -4 },
  animate: { opacity: 1, scaleY: 1,   y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit:    { opacity: 0, scaleY: 0.9, y: -4, transition: { duration: 0.12, ease: 'easeIn' } }
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } }
};

export const rowItem = {
  initial: { opacity: 0, x: -6 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } }
};

export const tapButton = {
  whileTap: { scale: 0.95 },
  transition: { type: 'spring', stiffness: 400, damping: 20 }
};
