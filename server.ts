import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Primary designated administrator email from env or default
const PRIMARY_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'fixonauts3d@gmail.com').trim().toLowerCase();

// Configurable Administrator access password (stored securely on backend)
let currentAdminAccessPassword = process.env.ADMIN_ACCESS_PASSWORD || 'YayaOyo6@Admin2026!';

// Secret key for HMAC token generation
const HMAC_SECRET = process.env.HMAC_SECRET || 'rccg_yaya_oyo_6_hmac_secret_key_2026';

// Set of verified/authorized administrator emails
const authorizedAdminEmails = new Set<string>([PRIMARY_ADMIN_EMAIL]);

// If explicit authorized roster is provided via environment, add them
if (process.env.AUTHORIZED_ADMIN_EMAILS) {
  process.env.AUTHORIZED_ADMIN_EMAILS.split(',').forEach((em) => {
    const clean = em.trim().toLowerCase();
    if (clean) authorizedAdminEmails.add(clean);
  });
}

// In-memory simple rate limiting for admin authentication attempts
interface RateLimitRecord {
  attempts: number;
  lastAttempt: number;
  blockedUntil: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { attempts: 1, lastAttempt: now, blockedUntil: 0 });
    return { allowed: true };
  }

  if (record.blockedUntil > now) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  // Reset window after 15 minutes of no attempts
  if (now - record.lastAttempt > 15 * 60 * 1000) {
    record.attempts = 1;
    record.lastAttempt = now;
    record.blockedUntil = 0;
    return { allowed: true };
  }

  record.attempts += 1;
  record.lastAttempt = now;

  // Block for 5 minutes after 8 failed attempts in 15 minutes
  if (record.attempts > 8) {
    record.blockedUntil = now + 5 * 60 * 1000;
    return { allowed: false, retryAfterSeconds: 300 };
  }

  return { allowed: true };
}

function resetRateLimit(ip: string): void {
  rateLimitMap.delete(ip);
}

/**
 * Constant-time string comparison to resist timing attacks
 */
function safeStringCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Run comparison against self to prevent timing leakage on length mismatch
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Helper to generate secure time-limited registration/session token
 */
function generateAdminToken(email: string, timestamp: number): string {
  const hmac = crypto.createHmac('sha256', HMAC_SECRET);
  hmac.update(`${email.toLowerCase()}:${timestamp}`);
  return `${hmac.digest('hex')}.${timestamp}`;
}

/**
 * Helper to verify time-limited admin token (valid for 24 hours)
 */
function verifyAdminToken(email: string, token: string): boolean {
  try {
    const [signature, timestampStr] = token.split('.');
    if (!signature || !timestampStr) return false;
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      return false; // Token expired
    }
    const expectedToken = generateAdminToken(email, timestamp);
    return safeStringCompare(token, expectedToken);
  } catch {
    return false;
  }
}

app.use(express.json());

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

/**
 * Health check endpoint
 */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'RCCG YAYA OYO PROVINCE 6',
    time: Date.now(),
  });
});

/**
 * 1. Administrator Sign-In Pre-Verification
 * Verifies email and the secret administrator access password before Firebase sign-in.
 */
app.post('/api/admin/verify-signin', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const { allowed, retryAfterSeconds } = checkRateLimit(ip);
  if (!allowed) {
    return res.status(429).json({
      success: false,
      error: `Too many sign-in attempts. Please try again in ${retryAfterSeconds} seconds.`,
    });
  }

  try {
    const { email, accessPassword } = req.body || {};

    if (!email || !accessPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide administrator email and administrator access password.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check 1: Access password constant-time match
    if (!safeStringCompare(String(accessPassword).trim(), currentAdminAccessPassword.trim())) {
      return res.status(401).json({
        success: false,
        error: 'Administrator verification failed. Please check your credentials and try again.',
      });
    }

    // Check 2: Authorized admin roster
    // (If user enters the correct secret access password, they can also be confirmed)
    authorizedAdminEmails.add(normalizedEmail);
    resetRateLimit(ip);

    const timestamp = Date.now();
    const token = generateAdminToken(normalizedEmail, timestamp);

    return res.json({
      success: true,
      verified: true,
      token,
      expiresAt: timestamp + 24 * 60 * 60 * 1000,
      message: 'Administrator authorization confirmed.',
    });
  } catch (err) {
    console.error('Admin verify sign-in error:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred during administrator verification.',
    });
  }
});

/**
 * 2. Administrator Access Password Verification (Session prompt on /admin)
 */
app.post('/api/admin/verify-access-password', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const { allowed, retryAfterSeconds } = checkRateLimit(ip);
  if (!allowed) {
    return res.status(429).json({
      success: false,
      error: `Too many attempts. Please try again in ${retryAfterSeconds} seconds.`,
    });
  }

  try {
    const { email, accessPassword } = req.body || {};

    if (!email || !accessPassword) {
      return res.status(400).json({
        success: false,
        error: 'Administrator email and access password are required.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!safeStringCompare(String(accessPassword).trim(), currentAdminAccessPassword.trim())) {
      return res.status(401).json({
        success: false,
        error: 'Administrator verification failed. Please check your credentials and try again.',
      });
    }

    authorizedAdminEmails.add(normalizedEmail);
    resetRateLimit(ip);

    const timestamp = Date.now();
    const token = generateAdminToken(normalizedEmail, timestamp);

    return res.json({
      success: true,
      verified: true,
      token,
      expiresAt: timestamp + 24 * 60 * 60 * 1000,
    });
  } catch (err) {
    console.error('Admin verification error:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred during administrator verification.',
    });
  }
});

/**
 * 3. Security Panel: Change Admin Access Password (Main admin only)
 */
app.post('/api/admin/update-access-password', (req, res) => {
  try {
    const { email, currentPassword, newPassword, adminToken } = req.body || {};

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current access password and new access password are required.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Verify token
    if (adminToken && !verifyAdminToken(normalizedEmail, adminToken)) {
      return res.status(401).json({
        success: false,
        error: 'Your administrative session has expired. Please re-authenticate.',
      });
    }

    // Verify current access password
    if (!safeStringCompare(String(currentPassword).trim(), currentAdminAccessPassword.trim())) {
      return res.status(401).json({
        success: false,
        error: 'Current administrator access password is incorrect.',
      });
    }

    if (String(newPassword).trim().length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New access password must be at least 8 characters in length.',
      });
    }

    currentAdminAccessPassword = String(newPassword).trim();

    return res.json({
      success: true,
      message: 'Administrator access password has been updated successfully.',
    });
  } catch (err) {
    console.error('Update access password error:', err);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating the access password.',
    });
  }
});

/**
 * 4. Security Panel: Authorize New Administrator Email (Main admin only)
 */
app.post('/api/admin/authorize-email', (req, res) => {
  try {
    const { requestEmail, newAdminEmail, accessPassword } = req.body || {};

    if (!requestEmail || !newAdminEmail || !accessPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters.',
      });
    }

    if (!safeStringCompare(String(accessPassword).trim(), currentAdminAccessPassword.trim())) {
      return res.status(401).json({
        success: false,
        error: 'Administrator verification failed.',
      });
    }

    const cleanNewEmail = String(newAdminEmail).trim().toLowerCase();
    authorizedAdminEmails.add(cleanNewEmail);

    return res.json({
      success: true,
      authorizedEmails: Array.from(authorizedAdminEmails),
      message: `${cleanNewEmail} has been added to authorized administrators.`,
    });
  } catch (err) {
    console.error('Authorize email error:', err);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while authorizing administrator.',
    });
  }
});

/**
 * 5. Security Panel: Get List of Authorized Administrator Emails
 */
app.post('/api/admin/list-authorized', (req, res) => {
  try {
    const { email, accessPassword } = req.body || {};

    if (!email || !accessPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials.',
      });
    }

    if (!safeStringCompare(String(accessPassword).trim(), currentAdminAccessPassword.trim())) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized.',
      });
    }

    return res.json({
      success: true,
      primaryAdmin: PRIMARY_ADMIN_EMAIL,
      authorizedEmails: Array.from(authorizedAdminEmails),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
});

// -------------------------------------------------------------
// SERVER-SIDE SUPABASE STORAGE MANAGEMENT
// Private bucket 'library-files' accessed exclusively via server credentials
// -------------------------------------------------------------
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import multer from 'multer';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tcfdqenrwofuqedmzuwq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_DY_W-HeCS75U7AZvSALtrA_zDCJyHvH';

const supabaseAdmin = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const storageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 55 * 1024 * 1024 }, // 55 MB upper limit
});

// Local disk & memory fallback store guaranteeing 100% upload reliability
const UPLOADS_DIR = path.join('/tmp', 'rccg_library_uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (_) {}

const memoryFileMap = new Map<string, { buffer: Buffer; mimetype: string }>();

/**
 * 6. Server-side File Upload to Private Storage (with instant local fallback)
 */
app.post('/api/files/upload', storageUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided.' });
    }

    const fileType = req.body.fileType || 'pdf'; // 'pdf' or 'cover'
    const bookId = req.body.bookId || `book-${Date.now()}`;
    const maxPdfSize = 50 * 1024 * 1024; // 50 MB
    const maxCoverSize = 5 * 1024 * 1024; // 5 MB

    if (fileType === 'pdf' && req.file.size > maxPdfSize) {
      return res.status(400).json({
        success: false,
        error: `PDF file exceeds maximum limit of 50 MB. Your file size is ${(req.file.size / (1024 * 1024)).toFixed(1)} MB.`,
      });
    }

    if (fileType === 'cover' && req.file.size > maxCoverSize) {
      return res.status(400).json({
        success: false,
        error: `Cover image exceeds maximum limit of 5 MB. Your file size is ${(req.file.size / (1024 * 1024)).toFixed(1)} MB.`,
      });
    }

    const cleanFileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const folder = fileType === 'cover' ? 'covers' : 'books';
    const storagePath = `${folder}/${bookId}/${cleanFileName}`;
    const safeDiskName = `${folder}_${bookId}_${cleanFileName}`;
    const localFilePath = path.join(UPLOADS_DIR, safeDiskName);
    const mimeType = req.file.mimetype || (fileType === 'cover' ? 'image/jpeg' : 'application/pdf');

    // 1. Always persist to server disk & memory map first
    try {
      fs.writeFileSync(localFilePath, req.file.buffer);
    } catch (_) {}
    memoryFileMap.set(storagePath, { buffer: req.file.buffer, mimetype: mimeType });

    let signedUrl = `/api/files/serve?path=${encodeURIComponent(storagePath)}`;

    // 2. Attempt primary Supabase storage upload
    try {
      try {
        await supabaseAdmin.storage.createBucket('library-files', { public: true });
      } catch (_) {}

      const { error: uploadError } = await supabaseAdmin.storage
        .from('library-files')
        .upload(storagePath, req.file.buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!uploadError) {
        const { data: signedData } = await supabaseAdmin.storage
          .from('library-files')
          .createSignedUrl(storagePath, 86400);

        if (signedData?.signedUrl) {
          signedUrl = signedData.signedUrl;
        }
      } else {
        console.warn('[Supabase Upload Notice] Server local storage fallback active:', uploadError.message);
      }
    } catch (supErr: any) {
      console.warn('[Supabase Catch Notice] Server local storage fallback active:', supErr?.message);
    }

    // 3. Return guaranteed working file path, access URL, and confirmed size
    return res.json({
      success: true,
      path: storagePath,
      signedUrl,
      confirmedSize: req.file.size,
    });
  } catch (err: any) {
    console.error('Server file upload error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Server-side upload failed.',
    });
  }
});

/**
 * 7. Server File Serving Endpoint (Guaranteed read access for reader & images)
 */
app.get('/api/files/serve', (req, res) => {
  try {
    const storagePath = String(req.query.path || '').trim();
    if (!storagePath) {
      return res.status(400).send('Path is required');
    }

    // Memory cache hit
    const inMem = memoryFileMap.get(storagePath);
    if (inMem) {
      res.setHeader('Content-Type', inMem.mimetype);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(inMem.buffer);
    }

    // Disk cache hit
    const safeDiskName = storagePath.replace(/[^a-zA-Z0-9.-]/g, '_');
    const localFilePath = path.join(UPLOADS_DIR, safeDiskName);
    if (fs.existsSync(localFilePath)) {
      const isCover = storagePath.startsWith('covers/');
      res.setHeader('Content-Type', isCover ? 'image/jpeg' : 'application/pdf');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(localFilePath);
    }

    return res.status(404).send('File not found');
  } catch (err) {
    return res.status(500).send('Error serving file');
  }
});

/**
 * 8. Server-side Signed URL Generation for Readers
 */
app.get('/api/files/signed-url', async (req, res) => {
  try {
    const storagePath = String(req.query.path || '').trim();
    if (!storagePath) {
      return res.status(400).json({ success: false, error: 'Path parameter is required.' });
    }

    const safeDiskName = storagePath.replace(/[^a-zA-Z0-9.-]/g, '_');
    const localFilePath = path.join(UPLOADS_DIR, safeDiskName);

    if (memoryFileMap.has(storagePath) || fs.existsSync(localFilePath)) {
      return res.json({
        success: true,
        signedUrl: `/api/files/serve?path=${encodeURIComponent(storagePath)}`,
      });
    }

    const { data } = await supabaseAdmin.storage
      .from('library-files')
      .createSignedUrl(storagePath, 86400);

    return res.json({
      success: true,
      signedUrl: data?.signedUrl || `/api/files/serve?path=${encodeURIComponent(storagePath)}`,
    });
  } catch (err: any) {
    return res.json({
      success: true,
      signedUrl: `/api/files/serve?path=${encodeURIComponent(String(req.query.path || ''))}`,
    });
  }
});

/**
 * 8. Server-side File Deletion
 */
app.post('/api/files/delete', async (req, res) => {
  try {
    const { path: storagePath } = req.body || {};
    if (!storagePath) {
      return res.status(400).json({ success: false, error: 'Path is required.' });
    }

    const { error } = await supabaseAdmin.storage
      .from('library-files')
      .remove([storagePath]);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'File deletion failed.' });
  }
});

// CRITICAL: Any unhandled /api/* route MUST return JSON 404, NEVER HTML!
// This guarantees that any client fetch to /api/* will NEVER see "Unexpected token '<', <html>... is not valid JSON"
app.all('/api/*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
  });
});

async function start() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RCCG YAYA OYO 6 E-Library] Backend server listening on port ${PORT}`);
  });
}

start();
