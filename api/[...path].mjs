import { createApp } from '../apps/api/src/app.js';
import { seedIfEmpty } from '../apps/api/src/seed.js';

seedIfEmpty();

const app = createApp();

export default app;
