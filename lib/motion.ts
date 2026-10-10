import { Variants } from 'framer-motion';

export const springTransition = {
  type: 'spring',
  stiffness: 260,
  damping: 24,
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.18, ease: 'easeIn' } },
};

export const drawerVariants: Variants = {
  closed: { x: '100%', opacity: 0.8 },
  open: { x: 0, opacity: 1, transition: springTransition },
};

export const bottomSheetVariants: Variants = {
  closed: { y: '100%', opacity: 0 },
  open: { y: 0, opacity: 1, transition: springTransition },
};

export const briefingCardVariants: Variants = {
  hidden: { y: 60, opacity: 0, scale: 0.95 },
  visible: { y: 0, opacity: 1, scale: 1, transition: springTransition },
  exit: { y: 40, opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export const peekHudVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92, filter: 'blur(10px)' },
  visible: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.15 } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: springTransition },
};

export const cardFlipVariants: Variants = {
  unrevealed: { rotateY: 0 },
  revealed: { rotateY: 180, transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] } },
};
