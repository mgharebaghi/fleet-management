export function isPlainNavigationClick(event: { defaultPrevented: boolean; button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }): boolean {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function rtlTabIndex(key: string, currentIndex: number, count: number): number | null {
  if (count <= 0) return null;
  if (key === "ArrowLeft") return (currentIndex + 1) % count;
  if (key === "ArrowRight") return (currentIndex - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}
