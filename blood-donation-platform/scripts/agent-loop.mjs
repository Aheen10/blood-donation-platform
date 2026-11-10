// Calls the escalation agent every minute. Run in a second terminal while `npm run dev` is running:
//   node --env-file=.env scripts/agent-loop.mjs
// (needs Node 20.6 or newer, check with: node -v)
const base = process.env.APP_URL || "http://localhost:3000";
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error("CRON_SECRET is missing in .env");
  process.exit(1);
}

async function tick() {
  try {
    const res = await fetch(`${base}/api/agent/escalate`, {
      method: "POST",
      headers: { "x-cron-secret": secret },
    });
    console.log(new Date().toISOString(), res.status, await res.text());
  } catch (err) {
    console.error(new Date().toISOString(), "agent call failed:", err.message);
  }
}

tick();
setInterval(tick, 60 * 1000);