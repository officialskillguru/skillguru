import { Children, type ReactNode } from "react";
import { motion } from "framer-motion";

export function MentorProfileContent({ children }: { children: ReactNode }) {
  return (
    <div className="lg:col-span-8 flex flex-col gap-8">
      {Children.map(children, (child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5, 
            delay: index * 0.1, 
            ease: [0.25, 0.1, 0.25, 1] 
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
