/** Maps a stored decimal(9,6) coordinate to a serializable string. */
export function decimalToCoordinateString(
  value: { toFixed(digits: number): string } | null,
): string | null {
  if (value === null) return null;
  const fixed = value.toFixed(6);
  if (!/^-?\d+\.\d{6}$/.test(fixed)) return null;
  const trimmed = fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return trimmed === "-0" ? "0" : trimmed;
}
