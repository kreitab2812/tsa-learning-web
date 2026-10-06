import pg from "pg";

// Read-only snapshot and network baseline; never print credentials or rows.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");
const client = new pg.Client({
  connectionString,
  connectionTimeoutMillis: 10000,
  statement_timeout: 10000,
  application_name: "tsa-readonly-audit",
});
const tables = ["User", "Course", "Stage", "Subject", "Chapter", "Lesson", "Question", "Progress"];

try {
  const started = performance.now();
  await client.connect();
  const connectMs = Math.round(performance.now() - started);
  await client.query("BEGIN READ ONLY");
  const samplesMs = [];
  for (let i = 0; i < 10; i++) {
    const tick = performance.now();
    await client.query("SELECT 1");
    samplesMs.push(Math.round(performance.now() - tick));
  }
  const counts = await client.query(tables.map((table) =>
    `SELECT '${table}' AS table_name, count(*)::int AS row_count FROM public."${table}"`
  ).join(" UNION ALL "));
  const migrations = await client.query(
    'SELECT migration_name, finished_at, rolled_back_at FROM public."_prisma_migrations" ORDER BY started_at'
  );
  const indexes = await client.query(
    "SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = ANY($1) ORDER BY tablename, indexname",
    [tables]
  );
  const access = await client.query(
    "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1) ORDER BY tablename",
    [tables]
  );
  const grants = await client.query(
    "SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name = ANY($1) AND grantee IN ('anon', 'authenticated') ORDER BY table_name, grantee, privilege_type",
    [tables]
  );
  await client.query("ROLLBACK");
  const sorted = [...samplesMs].sort((a, b) => a - b);
  console.log(JSON.stringify({
    measuredAt: new Date().toISOString(),
    connectMs,
    select1: { samplesMs, medianMs: (sorted[4] + sorted[5]) / 2, maxMs: sorted[9] },
    note: "Local machine to database round trip; not SQL execution time or application p95. Counts are for the current dataset only.",
    counts: counts.rows,
    migrations: migrations.rows,
    indexes: indexes.rows,
    rowSecurity: access.rows,
    apiRoleGrants: grants.rows,
  }, null, 2));
} catch (error) {
  // Connection errors may contain infrastructure details; print the code only.
  console.error("Database audit failed:", error.code ?? error.name);
  process.exitCode = 1;
} finally {
  await client.end();
}
