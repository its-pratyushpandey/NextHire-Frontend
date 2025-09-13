export async function getMatchedJobs() {
  const res = await fetch("https://nexthire-backend-ereo.onrender.com/api/v1/ai/match-jobs", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch matched jobs");
  return res.json();
}