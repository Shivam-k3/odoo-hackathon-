const { Client } = require('pg');
(async () => {
  const c = new Client({ host: '127.0.0.1', port: 5432, user: 'dayflow', password: 'dayflow', database: 'postgres' });
  await c.connect();
  for (const db of ['dayflow_hrms', 'dayflow_hrms_test']) {
    const r = await c.query('SELECT 1 FROM pg_database WHERE datname = $1', [db]);
    if (r.rowCount === 0) {
      await c.query(`CREATE DATABASE ${db}`);
      console.log('created', db);
    } else {
      console.log('exists', db);
    }
  }
  await c.end();
  const p = new Client({ host: '127.0.0.1', port: 5432, user: 'dayflow', password: 'dayflow', database: 'dayflow_hrms' });
  await p.connect();
  console.log('VERIFIED:', (await p.query('select version()')).rows[0].version.slice(0, 38));
  await p.end();
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
