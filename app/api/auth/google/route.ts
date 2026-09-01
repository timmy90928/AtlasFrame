import { getAuthRuntimeEnv } from "@/lib/env";

const cookieName = "__Host-atlasframe_oauth";

function randomUrlSafe(size = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function challengeFor(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function GET() {
  const runtime = getAuthRuntimeEnv();
  const state = randomUrlSafe();
  const verifier = randomUrlSafe(48);
  const challenge = await challengeFor(verifier);
  const redirectUri = new URL("/api/auth/google/callback", runtime.APP_ORIGIN);
  const start = new URL("/api/auth/handoff/google/start", runtime.AUTH_API_ORIGIN);
  start.searchParams.set("client_id", runtime.AUTH_CLIENT_ID);
  start.searchParams.set("redirect_uri", redirectUri.toString());
  start.searchParams.set("state", state);
  start.searchParams.set("code_challenge", challenge);
  start.searchParams.set("code_challenge_method", "S256");
  return new Response(null, {
    status: 302,
    headers: {
      location: start.toString(),
      "set-cookie": `${cookieName}=${encodeURIComponent(JSON.stringify({ state, verifier }))}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    },
  });
}
