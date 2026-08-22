const { Client } = require('pg');
(async () => {
  const c = new Client({ host: '127.0.0.1', port: 5432, user: 'dayflow', password: 'dayflow', database: 'postgres' });
  await c.connect();
  for (const db of ['dayflow_hrms', 'dayflow_hrms_test']) {
    await c.query(`DROP DATABASE IF EXISTS ${db} WITH (FORCE)`);
    await c.query(`CREATE DATABASE ${db} TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`);
    console.log(db, 'recreated as UTF8');
  }
  await c.end();
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
