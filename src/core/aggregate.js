/**
 * Turning 24 hourly readings into something a person can read on a phone.
 *
 * A 24-point chart on a 360px screen gives every point 15px — too narrow to
 * label, too narrow to tap, and far too narrow for a reader who is not going to
 * lean in and squint. Eight 3-hour columns are not much better: their hour
 * labels collide, and a chart whose columns cannot say what they cover is a
 * decoration. Four 6-hour blocks each carry a legible label and a value, and
 * "this morning / this afternoon / tonight" is the resolution that answers the
 * question anyone is really asking.
 *
 * Rain is SUMMED across the block, because rain is an accumulation — three
 * hours of 4 mm is 12 mm of water on the ground. Temperature is AVERAGED,
 * because it is a state, not a total. Getting this backwards is the classic way
 * a summary chart ends up lying.
 */
export function groupIntoBlocks(hours, blockSize = 6) {
  const blocks = []
  for (let i = 0; i < hours.length; i += blockSize) {
    const slice = hours.slice(i, i + blockSize)
    if (!slice.length) continue

    const rains = slice.map((h) => h.rain).filter((v) => v != null)
    const temps = slice.map((h) => h.temperature).filter((v) => v != null)
    const chances = slice.map((h) => h.rainChance).filter((v) => v != null)

    blocks.push({
      start: slice[0].date,
      end: slice[slice.length - 1].date,
      rain: rains.length ? rains.reduce((a, b) => a + b, 0) : null,
      temperature: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
      // The chance of rain over a block is the worst of its hours, not the
      // average: "it might pour at 4" is the thing worth knowing.
      rainChance: chances.length ? Math.max(...chances) : null,
      code: slice[Math.floor(slice.length / 2)].code,
      hours: slice,
    })
  }
  return blocks
}

/** Index of the highest and lowest value in a series, for direct labelling. */
export function extremes(values) {
  let hi = -1, lo = -1
  values.forEach((v, i) => {
    if (v == null) return
    if (hi < 0 || v > values[hi]) hi = i
    if (lo < 0 || v < values[lo]) lo = i
  })
  return { hi, lo }
}
