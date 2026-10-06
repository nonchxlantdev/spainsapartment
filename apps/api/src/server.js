// apps/api/src/server.js
import { createApp } from './app.js';
import { seedIfEmpty } from './seed.js';

seedIfEmpty();
const app = createApp();
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Spain's Apartment API listening on http://localhost:${PORT}`);
});
