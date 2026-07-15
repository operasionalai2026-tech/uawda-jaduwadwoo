// Apply Supabase SQL migrations over a direct Postgres connection.
//
// Usage:
//   1. Add DATABASE_URL to .env.local (Supabase -> Project Settings ->
//      Database -> Connection string -> URI). Keep it out of git.
//   2. node scripts/apply-migration.mjs                 # applies all files in supabase/migrations
//      node scripts/apply-migration.mjs 0013 0014       # only files whose name contains these tokens
//
// Idempotent-friendly: each file runs inside its own transaction; a failure
// rolls that file back and stops, printing which statement failed.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Client } = require("pg");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Load .env.local (values may be wrapped in quotes).
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim().replace(/^"(.*)"$/, "$1");
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "\nDATABASE_URL belum diset.\n" +
      "Tambahkan ke .env.local (Supabase -> Project Settings -> Database -> Connection string -> URI):\n" +
      "  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres\n" +
      "lalu jalankan ulang: node scripts/apply-migration.mjs\n",
  );
  process.exit(1);
}

const tokens = process.argv.slice(2);
const migrationsDir = join(root, "supabase", "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .filter((f) => tokens.length === 0 || tokens.some((t) => f.includes(t)))
  .sort();

if (files.length === 0) {
  console.error("Tidak ada file migrasi yang cocok.");
  process.exit(1);
}

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log(`Terhubung. Menerapkan ${files.length} migrasi:\n`);
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    process.stdout.write(`  • ${file} ... `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("commit");
      console.log("OK");
    } catch (err) {
      await client.query("rollback");
      console.log("GAGAL");
      console.error(`\n    ${err.message}\n`);
      process.exitCode = 1;
      break;
    }
  }
  // Minta PostgREST reload schema cache supaya tabel baru langsung terlihat API.
  try {
    await client.query("notify pgrst, 'reload schema'");
  } catch {
    /* abaikan */
  }
} finally {
  await client.end();
}
