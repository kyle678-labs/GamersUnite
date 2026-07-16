export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startVoiceSweeper } = await import("./lib/sweeper");
    startVoiceSweeper();
  }
}
