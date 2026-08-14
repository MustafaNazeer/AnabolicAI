"use client";

// The shared chip look. Extracted so the filter chips and the exercise form
// cannot drift apart visually, and so the two can carry DIFFERENT semantics
// while looking identical, which is the point of splitting them below.
export function chipStyle(active: boolean): React.CSSProperties {
  return {
    minHeight: 44,
    background: active ? "var(--accent)" : "var(--surface-sunken)",
    border: `1px solid ${active ? "var(--accent)" : "var(--surface-border)"}`,
    borderRadius: "var(--radius-square)",
    color: active ? "var(--on-accent)" : "var(--text-dim)",
  };
}

// Filtering. A chip is a toggle, so it carries aria-pressed rather than
// relying on colour alone to say it is active, and tapping the active chip
// clears its dimension.
export function Chip({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className="px-3 text-xs shrink-0"
      style={chipStyle(active)}
    >
      {label}
    </button>
  );
}

// Choosing. Exactly one value in the row is correct and the field is
// required, which is radio behaviour rather than a set of independent
// toggles. aria-pressed would tell a screen reader the wrong story here: it
// describes a button that is on, not one option chosen out of six.
export function ChoiceChip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className="px-3 text-xs shrink-0"
      style={chipStyle(selected)}
    >
      {label}
    </button>
  );
}
