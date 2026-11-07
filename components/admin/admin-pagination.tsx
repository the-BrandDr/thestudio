"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function AdminPagination({
  currentPage,
  totalItems,
  pageSize = 6,
  onPageChange,
  itemLabel = "records",
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="pt-4 mt-4 border-t border-[var(--border-subtle)]/40 flex flex-col sm:flex-row items-center justify-between gap-3">
      <span className="text-[11px] font-mono text-[var(--text-muted)]">
        Showing <strong className="text-[var(--text-primary)]">{start}</strong>–
        <strong className="text-[var(--text-primary)]">{end}</strong> of{" "}
        <strong className="text-[var(--text-primary)]">{totalItems}</strong> {itemLabel}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="px-2.5 py-1 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 text-[11px] font-mono text-[var(--text-primary)] hover:border-[#c7cb2d] disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1 cursor-pointer transition"
        >
          <ChevronLeft className="w-3 h-3" /> Prev
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, idx, arr) => {
              const prev = arr[idx - 1];
              const showEllipsis = prev && p - prev > 1;
              return (
                <React.Fragment key={p}>
                  {showEllipsis && (
                    <span className="text-[10px] font-mono text-[var(--text-dim)] px-1">…</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={`w-6 h-6 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                      p === currentPage
                        ? "bg-[#c7cb2d] text-black"
                        : "bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}
        </div>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="px-2.5 py-1 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 text-[11px] font-mono text-[var(--text-primary)] hover:border-[#c7cb2d] disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1 cursor-pointer transition"
        >
          Next <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
