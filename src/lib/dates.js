// Date helpers.
//
// IMPORTANT: use todayISO() — NOT new Date().toISOString().split('T')[0] — when
// you need "today" as a YYYY-MM-DD string. toISOString() returns the date in UTC,
// so any evening west of UTC (and any morning east of it) yields the wrong
// calendar day. Meeting dates and event-cutoff comparisons must use local time.
export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
