import app from '../dist/index.js';
import { connectDB } from '../dist/config/db.js';
import { seedDatabase } from '../dist/scripts/seed.js';

let ready;

/**
 * Connect to database and seed initial demo accounts/services.
 * Promise is cached across warm lambda invocations.
 */
const bootstrap = () => {
  ready ??= (async () => {
    await connectDB();
    await seedDatabase();
  })().catch((error) => {
    ready = undefined;
    throw error;
  });
  return ready;
};

export default async function handler(req, res) {
  try {
    await bootstrap();
  } catch (error) {
    console.error('[server] Vercel bootstrap failed:', error.message);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        message: 'The API could not reach its database. Please verify MONGODB_URI in Vercel Environment Variables.',
        error: error.message,
      })
    );
    return;
  }

  return app(req, res);
}
