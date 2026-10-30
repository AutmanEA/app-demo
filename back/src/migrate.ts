import { Client } from 'pg';

import { readSecret } from './secrets.js';
import { join, resolve } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';

async function migrate() {
  const appUser = readSecret('DB_USER');
  const appPassword = readSecret('DB_PASSWORD');

  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: readSecret('DB_ADMIN_USER'),
    password: readSecret('DB_ADMIN_PASSWORD'),
    database: readSecret('DB_NAME'),
  });
  await client.connect();

  try {
    const role = client.escapeIdentifier(appUser);
    const password = client.escapeLiteral(appPassword);
    const { rowCount } = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [appUser]);
    await client.query(
      rowCount ? `ALTER ROLE ${role} WITH LOGIN PASSWORD ${password}` : `CREATE ROLE ${role} WITH LOGIN PASSWORD ${password}`,
    );
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`
    )

    const dir = resolve(process.cwd(), 'migrations');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));

    for (const file of files) {
      if (applied.has(file)) continue;
      console.log(`> Migration ${file}`);

      await client.query('BEGIN');
      try {
        await client.query(readFileSync(join(dir, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    await client.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
    await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
    await client.query(`REVOKE ALL ON schema_migrations FROM ${role}`);

    console.log('Base à jour');
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error('Migration échouée :', err.message);
  process.exit(1);
})
