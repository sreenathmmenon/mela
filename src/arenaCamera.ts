/** Keep every playable tile in frame; stage decoration may extend past the edges. */
export function arenaFrustum(width: number, height: number) {
  const aspect = Math.max(1, width) / Math.max(1, height);
  const vertical = 7 * Math.max(1, 1 / aspect);
  return {
    left: -vertical * aspect,
    right: vertical * aspect,
    top: vertical,
    bottom: -vertical,
  };
}
