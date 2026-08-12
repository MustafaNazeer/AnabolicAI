// RFC 4180: a field is quoted only when it has to be, and a quote inside a
// quoted field is doubled. Both Google Sheets and Excel read this.
//
// An exercise name is free text a user types, so a comma, a quote and a
// newline are all reachable here, and each one splits a row if it goes out
// raw. This module owns that problem and knows nothing about workouts.
function escapeField(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: string[][]): string {
  // CRLF is what RFC 4180 specifies and what Excel expects. Sheets accepts it.
  return [headers, ...rows].map((row) => row.map(escapeField).join(",")).join("\r\n");
}
