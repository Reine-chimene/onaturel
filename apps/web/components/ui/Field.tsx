import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="on-field">
      <label className="on-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error ? <span className="on-field__hint">{hint}</span> : null}
      {error ? (
        <span className="on-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function TextInput({
  id,
  ...props
}: { id: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <input id={id} className="on-input" {...props} />;
}

export function TextArea({
  id,
  ...props
}: { id: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea id={id} className="on-textarea" {...props} />;
}

export function Select({
  id,
  children,
  ...props
}: { id: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select id={id} className="on-select" {...props}>
      {children}
    </select>
  );
}
