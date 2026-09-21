/** Shared asynchronous SQL interface for Cloudflare D1 and local SQLite. */
export type SqlDatabase = {
  first: (sql: string, ...values: any[]) => Promise<any>;
  run: (sql: string, ...values: any[]) => Promise<{ changes: number }>;
};
export async function cloudflareDatabase() {
  // Only use bindings inside an actual Worker request. Missing production bindings
  // must fail closed instead of silently writing into an ephemeral filesystem.
  if (
    typeof navigator === "undefined" ||
    !navigator.userAgent.includes("Cloudflare-Workers")
  )
    return null;
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const env = getCloudflareContext().env as unknown as { STUDIO_DB?: any };
  if (!env.STUDIO_DB) throw new Error("STUDIO_DB D1 binding is required.");
  // Read from the primary so session revocation and live commands are immediately visible.
  const db = env.STUDIO_DB.withSession("first-primary");
  return {
    first: (sql: string, ...values: any[]) =>
      db
        .prepare(sql)
        .bind(...values)
        .first(),
    run: async (sql: string, ...values: any[]) => {
      const result = await db
        .prepare(sql)
        .bind(...values)
        .run();
      return { changes: result.meta.changes };
    },
  } as SqlDatabase;
}
