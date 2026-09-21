import React from "react";
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="ms-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Num({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Field label={label}>
      <input
        aria-label={label}
        type="number"
        step={step}
        min={min}
        max={max}
        value={Number.isFinite(value) ? Math.round(value * 1000) / 1000 : 0}
        onChange={(e) => {
          if (e.target.value === "") return;
          const v = Number(e.target.value);
          if (Number.isFinite(v))
            onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v)));
        }}
      />
    </Field>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: (string | { id: string; name: string })[];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) =>
          typeof o === "string" ? (
            <option key={o}>{o}</option>
          ) : (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ),
        )}
      </select>
    </Field>
  );
}
export const uid = () => crypto.randomUUID();
export function download(
  name: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
