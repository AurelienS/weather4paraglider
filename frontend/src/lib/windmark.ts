/** Which wind points can carry a compass label without sitting on a neighbour.
 * Points are considered from the top of the plot downward, so a tight stack
 * keeps the label of its highest level. */
export function windLabelMask(ys: readonly number[], minGap: number): boolean[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const show = ys.map(() => false);
  let last = -Infinity;
  for (const item of order) {
    if (item.y - last >= minGap) {
      show[item.i] = true;
      last = item.y;
    }
  }
  return show;
}
