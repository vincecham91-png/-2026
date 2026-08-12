#!/usr/bin/env node
/**
 * Execute multi-statement SQL file against Supabase PostgreSQL
 * Usage: node scripts/run-sql.js <sql-file>
 */
const { readFileSync } = require('fs');
const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:YOUR_PASSWORD_HERE@db.YOUR_PROJECT_ID.supabase.co:5432/postgres?sslmode=no-verify';

function splitSQL(sql) {
  const statements = [];
  const lines = sql.split('\n');
  let current = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip pure comment lines and empty lines between statements
    if (trimmed.startsWith('--') || trimmed === '') {
      current.push(line);
      continue;
    }
    current.push(line);
    if (trimmed.endsWith(';')) {
      const stmt = current.join('\n').trim();
      // Extract only the SQL part (skip leading comments)
      const sqlOnly = current
        .filter(l => !l.trim().startsWith('--') && l.trim() !== '')
        .join('\n')
        .trim();
      if (sqlOnly && sqlOnly !== ';') {
        // Remove trailing semicolon since we add it in query
        const clean = sqlOnly.endsWith(';') ? sqlOnly.slice(0, -1).trim() : sqlOnly;
        statements.push(clean);
      }
      current = [];
    }
  }

  // Handle any remaining SQL without trailing semicolon
  if (current.length > 0) {
    const sqlOnly = current
      .filter(l => !l.trim().startsWith('--') && l.trim() !== '')
      .join('\n')
      .trim();
    if (sqlOnly) {
      statements.push(sqlOnly.endsWith(';') ? sqlOnly.slice(0, -1).trim() : sqlOnly);
    }
  }

  return statements;
}

async function main() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Usage: node scripts/run-sql.js <sql-file>');
    process.exit(1);
  }

  const sql = readFileSync(sqlFile, 'utf-8');
  const statements = splitSQL(sql);

  const client = new Client({ connectionString: DB_URL });

  console.log(`Connecting to database...`);
  await client.connect();
  console.log(`Connected. Executing ${statements.length} statements...\n`);

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await client.query(stmt + ';');
      success++;
      const preview = stmt.replace(/\n/g, ' ').substring(0, 80);
      console.log(`  [${i + 1}/${statements.length}] OK: ${preview}`);
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('does not exist')) {
        console.log(`  [${i + 1}/${statements.length}] SKIP: ${err.message.split('\n')[0]}`);
        skipped++;
      } else {
        console.error(`  [${i + 1}/${statements.length}] ERROR: ${err.message.split('\n')[0]}`);
        console.error(`  SQL: ${stmt.substring(0, 200)}`);
        errors++;
      }
    }
  }

  await client.end();
  console.log(`\n=== Done: ${success} OK, ${skipped} skipped, ${errors} errors, ${statements.length} total ===`);
  if (errors > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
