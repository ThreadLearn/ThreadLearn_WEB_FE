'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { ArrowRight, BrainCircuit, Sparkles, X } from 'lucide-react';
import type { UserRole } from '../../types';
import { ADAPTIVE_PATH_NUDGE_KEY } from '../../utils/adaptive-path-nudge';

export const AdaptivePathNudge = ({ role }: { role?: UserRole }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (role !== 'STUDENT') return;
    if (window.sessionStorage.getItem(ADAPTIVE_PATH_NUDGE_KEY) !== 'pending') return;

    const timer = window.setTimeout(() => {
      if (window.sessionStorage.getItem(ADAPTIVE_PATH_NUDGE_KEY) !== 'pending') return;
      window.sessionStorage.removeItem(ADAPTIVE_PATH_NUDGE_KEY);
      setOpen(true);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [role]);

  if (!open) return null;

  return (
    <aside
      aria-label="Adaptive Path suggestion"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-[70] overflow-hidden rounded-2xl border border-white/15 bg-[#102b26] text-white shadow-[0_22px_55px_rgb(16_43_38_/_0.28)] sm:left-auto sm:right-5 sm:w-[22rem]"
    >
      <div className="h-1 bg-[#d9f99d]" aria-hidden="true" />
      <div className="relative p-5 pr-12">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Dismiss Adaptive Path suggestion"
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9f99d]"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#d9f99d]">
          <Sparkles size={14} aria-hidden="true" />
          Personalized learning
        </div>
        <div className="mt-4 flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[#d9f99d]">
            <BrainCircuit size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Chưa biết nên học gì tiếp?</h2>
            <p className="mt-1.5 text-sm leading-6 text-white/70">
              Làm bài đánh giá ngắn để nhận Adaptive Path phù hợp với mục tiêu và kỹ năng hiện tại của bạn.
            </p>
          </div>
        </div>

        <Link
          href="/learning-plan/adaptive"
          onClick={() => setOpen(false)}
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#d9f99d] px-4 text-sm font-semibold text-[#102b26] transition-colors hover:bg-[#bef264] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#102b26]"
        >
          Khám phá Adaptive Path
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
};
