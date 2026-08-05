import { motion } from "framer-motion";

interface Props {
  message?: string;
}

export default function LoadingSpinner({ message = "Loading..." }: Props) {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 max-w-sm w-full">
      <motion.p 
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="text-sm font-medium text-brand-300 tracking-wide text-center"
      >
        {message}
      </motion.p>
      
      <div className="w-full h-1 bg-dark-800 rounded-full overflow-hidden">
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="w-1/2 h-full bg-gradient-to-r from-transparent via-brand-500 to-transparent rounded-full"
        />
      </div>
    </div>
  );
}
