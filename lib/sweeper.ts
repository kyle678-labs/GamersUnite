import { cleanupExpiredChannels } from "./matchmaking";

const SWEEP_MINUTES = 10;

const g = globalThis as unknown as { guVoiceSweeper?: ReturnType<typeof setInterval> };

// Reaps timed-out party voice channels even when nobody is using the site.
// Started once per server process from instrumentation.ts.
export function startVoiceSweeper() {
  if (g.guVoiceSweeper) return;
  const sweep = () =>
    cleanupExpiredChannels().catch((e) => console.error("Voice sweep failed:", e));
  g.guVoiceSweeper = setInterval(sweep, SWEEP_MINUTES * 60 * 1000);
  sweep(); // also sweep at startup, in case the server was down a while
  console.log(`🫧 Voice channel sweeper running (every ${SWEEP_MINUTES} min)`);
}
