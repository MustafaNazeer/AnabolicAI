export const RIR_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Nothing left" },
  { value: 1, label: "Maybe 1 more" },
  { value: 2, label: "Could do 2 more" },
  { value: 3, label: "Comfortable" },
  { value: 4, label: "Easy" },
  { value: 5, label: "Very easy" },
];

export function rirLabel(value: number): string {
  return RIR_OPTIONS.find((o) => o.value === value)?.label ?? "";
}
