import app from './app';
import { config } from './config/env';

const PORT = config.port || 5000;

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Dayflow HRMS Backend Server running     `);
  console.log(` Port: ${PORT}                           `);
  console.log(` Environment: ${config.nodeEnv}          `);
  console.log(` Base API: http://localhost:${PORT}/api  `);
  console.log(`=========================================`);
});
