import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  requireTyping?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmText = 'Confirm', requireTyping, onConfirm, onCancel }: Props) {
  const [typed, setTyped] = useState('');

  if (!open) return null;

  const canConfirm = !requireTyping || typed === requireTyping;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-bg-secondary border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <button onClick={onCancel} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
          <X size={18} />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className="p-2 rounded-lg bg-danger/20">
            <AlertTriangle size={20} className="text-danger" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            <p className="text-sm text-text-secondary mt-1">{message}</p>
          </div>
        </div>

        {requireTyping && (
          <div className="mb-4">
            <p className="text-sm text-text-secondary mb-2">
              Type <span className="font-mono text-danger font-semibold">{requireTyping}</span> to confirm:
            </p>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); setTyped(''); }}
            disabled={!canConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-danger hover:bg-danger-hover rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
