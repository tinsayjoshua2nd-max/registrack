import React from 'react';

interface CompletionConfirmationDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
  disabled?: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  variant?: 'emerald' | 'rose';
}

export const CompletionConfirmationDialog: React.FC<CompletionConfirmationDialogProps> = ({
  onCancel,
  onConfirm,
  disabled = false,
  title = 'Confirm request completion',
  message = 'Confirm the document has been claimed. The student will be notified that the request is complete.',
  confirmLabel = 'Confirm completion',
  variant = 'emerald',
}) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
    <section
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="complete-ticket-title"
      aria-describedby="complete-ticket-description"
      className="w-full max-w-md space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl"
    >
      <div>
        <h2 id="complete-ticket-title" className="font-heading text-lg font-bold text-stone-900">
          {title}
        </h2>
        <p id="complete-ticket-description" className="mt-2 text-sm leading-relaxed text-stone-600">
          {message}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          autoFocus
          disabled={disabled}
          onClick={onCancel}
          className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onConfirm}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${
            variant === 'rose' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-emerald-800 hover:bg-emerald-900'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </section>
  </div>
);