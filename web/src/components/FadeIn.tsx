"use client";

import { motion, useReducedMotion } from "motion/react";

export function FadeIn({
  children,
  id,
  className,
}: {
  children: React.ReactNode;
  id?: string | number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={id}
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={
        reduce
          ? { duration: 0.2 }
          : { type: "spring", bounce: 0, duration: 0.4 }
      }
    >
      {children}
    </motion.div>
  );
}
