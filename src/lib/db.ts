import { neon } from "@neondatabase/serverless";

// Lazily create the Neon client so a missing DATABASE_URL never breaks the
// build — it only matters when a route actually runs a query at request time.
let client: ReturnType<typeof neon> | null = null;

export function db() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}
