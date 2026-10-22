import './config/env.js';
import { app } from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`Server E-Slip berjalan di port ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
