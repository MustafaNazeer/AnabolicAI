export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

export function prCelebrationPayload(
  name: string,
  weight: number,
  reps: number,
): PushPayload {
  return {
    title: "New personal record",
    body: `${name}: ${weight} lbs x ${reps}`,
    url: "/",
    tag: "pr",
  };
}
