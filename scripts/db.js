/*
 * Local PostgreSQL lifecycle for development and testing.
 *
 * Drives initdb/pg_ctl from the @embedded-postgres binaries directly so that
 * failures surface as real errors instead of hanging silently.
 * The data directory lives in the OS temp dir because OneDrive-synced folders
 * crash PostgreSQL on Windows (0xC0000142 / file sharing violations).
 *
 * Usage:
 *   node scripts/db.js up      start postgres + ensure app databases exist
 *   node scripts/db.js down    stop postgres
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');
const { Client } = require('pg');

const PG_PORT = Number(process.env.PG_PORT || 5432);
const PG_USER = process.env.PG_USER || 'dayflow';
const PG_PASSWORD = process.env.PG_PASSWORD || 'dayflow';
const DATA_DIR = process.env.PGDATA_DIR || path.join(os.tmpdir(), 'dayflow-hrms-pgdata');
const LOG_FILE = path.join(DATA_DIR, 'server.log');
const DATABASES = ['dayflow_hrms', 'dayflow_hrms_test'];
const BIN_DIR = path.join(
  PROJECT_ROOT(),
  'node_modules',
  '@embedded-postgres',
  'windows-x64',
  'native',
  'bin'
);

function PROJECT_ROOT() {
  return path.resolve(__dirname, '..');
}

function run(exe, args, opts = {}) {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, {
      stdio: opts.inherit ? 'inherit' : 'ignore',
      windowsHide: true,
    });
    let settled = false;
    child.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(new Error(`Failed to launch ${path.basename(exe)}: ${err.message}`));
      }
    });
    child.on('exit', (code) => {
      if (!settled) {
        settled = true;
        if (code === 0) resolve();
        else reject(new Error(`${path.basename(exe)} ${args.join(' ')} exited with code ${code}. Check log: ${LOG_FILE}`));
      }
    });
  });
}

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(1000);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

async function connectOnce(database) {
  const client = new Client({
    host: '127.0.0.1',
    port: PG_PORT,
    user: PG_USER,
    password: PG_PASSWORD,
    database,
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  await client.end();
}

async function waitForPostgres(maxMs = 60000) {
  const deadline = Date.now() + maxMs;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      await connectOnce('postgres');
      return;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 700));
    }
  }
  throw new Error(`PostgreSQL did not become ready: ${lastErr && lastErr.message}`);
}

async function ensureCluster() {
  if (fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const pwfile = path.join(os.tmpdir(), `dayflow-pw-${Date.now()}.txt`);
  fs.writeFileSync(pwfile, PG_PASSWORD);
  console.log(`Initialising cluster at ${DATA_DIR} ...`);
  await run(path.join(BIN_DIR, 'initdb.exe'), [
    '-U', PG_USER,
    '-A', 'password',
    `--pwfile=${pwfile}`,
    '-E', 'UTF8',
    '-D', DATA_DIR,
  ]);
  fs.unlinkSync(pwfile);
}

async function startServer() {
  console.log(`Starting PostgreSQL on port ${PG_PORT} ...`);
  await run(path.join(BIN_DIR, 'pg_ctl.exe'), [
    '-D', DATA_DIR,
    '-l', LOG_FILE,
    '-o', `-p ${PG_PORT}`,
    'start',
  ]);
}

async function ensureDatabases() {
  for (const dbName of DATABASES) {
    const client = new Client({
      host: '127.0.0.1',
      port: PG_PORT,
      user: PG_USER,
      password: PG_PASSWORD,
      database: 'postgres',
    });
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Created database ${dbName}`);
    }
    await client.end();
  }
}

async function up() {
  if (await isPortOpen(PG_PORT)) {
    console.log(`Something already listens on ${PG_PORT}; assuming PostgreSQL is running.`);
  } else {
    await ensureCluster();
    await startServer();
    await waitForPostgres();
  }
  await ensureDatabases();
  const probe = new Client({
    host: '127.0.0.1',
    port: PG_PORT,
    user: PG_USER,
    password: PG_PASSWORD,
    database: 'dayflow_hrms',
  });
  await probe.connect();
  const v = await probe.query('SELECT version() AS v');
  console.log('Verified connection:', v.rows[0].v.split(',')[0]);
  await probe.end();
  console.log('PostgreSQL ready.');
}

async function down() {
  if (!(await isPortOpen(PG_PORT))) {
    console.log('Nothing listening; nothing to stop.');
    return;
  }
  await run(path.join(BIN_DIR, 'pg_ctl.exe'), ['-D', DATA_DIR, 'stop', '-m', 'fast']);
  console.log('PostgreSQL stopped.');
}

const command = process.argv[2] || 'up';
if (command === 'up') {
  up().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
} else if (command === 'down') {
  down().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
} else {
  console.error('Unknown command. Use "up" or "down".');
  process.exit(1);
}
