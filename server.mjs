import express from 'express';
import { createApp } from './apps/api/src/app.js';
import { seedIfEmpty } from './apps/api/src/seed.js';

// Imported so Vercel detects this file as the Express app.
void express;

seedIfEmpty();

const app = createApp();

export default app;
