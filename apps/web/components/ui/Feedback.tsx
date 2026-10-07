import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type ModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
};

export function Modal({
  title,
  open,
  onClose,
  children,
  confirmLabel,
  onConfirm,
}: ModalProps) {
  if (!open) return null;
  return (
    <div className="on-overlay" role="presentation" onClick={onClose}>
      <div
        className="on-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="on-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="on-h3" id="on-modal-title">
          {title}
        </h2>
        <div style={{ marginTop: "1rem" }}>{children}</div>
        <div className="on-ds__row" style={{ marginTop: "1.5rem" }}>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          {onConfirm ? (
            <Button variant="primary" onClick={onConfirm}>
              {confirmLabel ?? "Confirmer"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <div className="on-toast" role="status">
      <p style={{ margin: 0 }}>{message}</p>
      <Button variant="ghost" size="sm" onClick={onDismiss} className="on-btn--ghost">
        Fermer
      </Button>
    </div>
  );
}

export function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="on-empty">
      <p className="on-h3">{title}</p>
      <p className="on-small">{text}</p>
    </div>
  );
}

export function Skeleton({ height = 16 }: { height?: number }) {
  return <div className="on-skeleton" style={{ height }} />;
}
