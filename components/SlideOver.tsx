"use client";

import { X } from "lucide-react";
import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SlideOver({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />

          {/* PANEL */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 22 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-[#0c0c15] border-l border-white/10 z-50 shadow-xl p-5 flex flex-col"
          >
            {/* HEADER */}
            <div className="flex justify-between items-center mb-5">
              <h1 className="text-xl font-semibold text-white">{title}</h1>
              <button onClick={onClose}>
                <X size={26} className="text-white/60 hover:text-white" />
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
