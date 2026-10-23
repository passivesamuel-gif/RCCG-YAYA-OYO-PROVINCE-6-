import express, { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { cert, getApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import multer from 'multer';

dotenv.config();

const requiredEnvironment = [
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_EMAIL',
  'ADMIN_ACCESS_PASSWORD_HASH',
  'AUTHORIZED_ADMIN_EMAILS',
];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]?.trim());
if (missingEnvironment.length > 0) {
  throw new Error(`Missing required hosting configuration: ${missingEnvironment.join(', ')}`);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
const adminApp = getApps().length > 0
  ? getApps()[0]
  : initializeAdminApp({ credential: cert(serviceAccount) });
const adminAuth = getAdminAuth(adminApp);
const FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID?.trim() || 'ai-studio-rccgyayaoyo6elib-7c2298e8-76db-4b17-86ec-6931d03fd03c';
const adminDb = getFirestore(adminApp, FIRESTORE_DATABASE_ID);
const supabaseAdmin = createSupabaseClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const BUCKET_NAME = 'library-files';
const PRIMARY_ADMIN_EMAIL = process.env.ADMIN_EMAIL!.trim().toLowerCase();
const INITIAL_APPROVED_EMAILS = new Set(
  process.env.AUTHORIZED_ADMIN_EMAILS!.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean),
);
INITIAL_APPROVED_EMAILS.add(PRIMARY_ADMIN_EMAIL);
const SECURITY_DOC = adminDb.collection('serverSettings').doc('security');
const storageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

interface SecuritySettings {
  mainAdminEmail: string;
  approvedEmails: string[];
  accessPasswordHash: string;
}
interface AuthenticatedRequest extends Request { firebaseUser?: DecodedIdToken; }

function apiError(message: string, status = 400) {
  return resJson({ success: false, error: message }, status);
}
function resJson(body: object, status = 200) { return { body, status }; }

async function getSecuritySettings(): Promise<SecuritySettings> {
  const snapshot = await SECURITY_DOC.get();
  if (snapshot.exists) {
    const data = snapshot.data() || {};
    const storedApprovedEmails = Array.isArray(data.approvedEmails)
      ? data.approvedEmails.map((email) => String(email).trim().toLowerCase()).filter(Boolean)
      : [];
    const approvedEmails = Array.from(new Set([
      ...INITIAL_APPROVED_EMAILS,
      ...storedApprovedEmails.filter((email) => INITIAL_APPROVED_EMAILS.has(email)),
    ]));
    return {
      mainAdminEmail: String(data.mainAdminEmail || PRIMARY_ADMIN_EMAIL).toLowerCase(),
      approvedEmails,
      accessPasswordHash: String(data.accessPasswordHash || process.env.ADMIN_ACCESS_PASSWORD_HASH),
    };
  }
  return { mainAdminEmail: PRIMARY_ADMIN_EMAIL, approvedEmails: Array.from(INITIAL_APPROVED_EMAILS), accessPasswordHash: process.env.ADMIN_ACCESS_PASSWORD_HASH! };
}

function safeStringCompare(a: string, b: string): boolean {
  const left = Buffer.from(a); const right = Buffer.from(b);
  if (left.length !== right.length) { crypto.timingSafeEqual(left, left); return false; }
  return crypto.timingSafeEqual(left, right);
}
function hashAccessPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt}$${derived.toString('hex')}`;
}
function verifyAccessPassword(password: string, encoded: string): boolean {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nText, rText, pText, salt, expectedHex] = parts;
  const n = Number(nText); const r = Number(rText); const p = Number(pText);
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p) || !salt || !expectedHex) return false;
  try {
    const actual = crypto.scryptSync(password, salt, expectedHex.length / 2, { N: n, r, p });
    return safeStringCompare(actual.toString('hex'), expectedHex);
  } catch { return false; }
}

function isApprovedAdmin(identity: DecodedIdToken, settings: SecuritySettings): boolean {
  const email = identity.email?.trim().toLowerCase();
  if (identity.email_verified !== true || !email) return false;
  return settings.approvedEmails.includes(email);
}

async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return res.status(401).json({ success: false, error: 'Please sign in again.' });
  try { req.firebaseUser = await adminAuth.verifyIdToken(token); return next(); }
  catch { return res.status(401).json({ success: false, error: 'Please sign in again.' }); }
}
async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.firebaseUser?.email) return res.status(403).json({ success: false, error: 'You do not have permission to do that.' });
  const settings = await getSecuritySettings();
  if (!isApprovedAdmin(req.firebaseUser, settings)) return res.status(403).json({ success: false, error: 'You do not have permission to do that.' });
  return next();
}
function safeStoragePath(value: unknown): string | null {
  const storagePath = String(value || '').trim();
  if (!storagePath || storagePath.length > 300 || storagePath.includes('..') || !/^(books|covers)\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+$/.test(storagePath)) return null;
  return storagePath;
}
function safeBookId(value: unknown): string | null {
  const bookId = String(value || '').trim();
  return /^[A-Za-z0-9_-]{1,120}$/.test(bookId) ? bookId : null;
}
async function issueSignedUrl(storagePath: string) {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).createSignedUrl(storagePath, 300);
  if (error || !data?.signedUrl) throw new Error('The book file is not available right now.');
  return data.signedUrl;
}
async function confirmStoredFile(storagePath: string, expectedSize: number) {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(storagePath);
  if (error || !data) throw new Error('The book file could not be confirmed.');
  const actualSize = (await data.arrayBuffer()).byteLength;
  if (actualSize !== expectedSize) throw new Error('The book file could not be confirmed.');
  return actualSize;
}

app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'RCCG YAYA OYO 6 E-Library' }));
app.get('/api/admin/google-status', authenticate, async (req: AuthenticatedRequest, res) => {
  const settings = await getSecuritySettings();
  const approved = isApprovedAdmin(req.firebaseUser!, settings);
  const email = req.firebaseUser?.email?.trim().toLowerCase() || '';
  try {
    await adminDb.collection('users').doc(req.firebaseUser!.uid).set({
      email: email || null,
      role: approved ? 'admin' : 'member',
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Could not persist server-decided user role', { message: error instanceof Error ? error.message : 'unknown' });
  }
  return res.json({
    success: true,
    isAdmin: approved,
    role: approved ? 'admin' : 'reader',
    emailVerified: req.firebaseUser?.email_verified === true,
  });
});

app.post('/api/admin/verify-signin', authenticate, async (req: AuthenticatedRequest, res) => {
  const { email, accessPassword } = req.body || {};
  const settings = await getSecuritySettings();
  const signedInEmail = req.firebaseUser?.email?.toLowerCase() || '';
  if (!email || !accessPassword || !isApprovedAdmin(req.firebaseUser!, settings) || signedInEmail !== String(email).trim().toLowerCase() || !verifyAccessPassword(String(accessPassword), settings.accessPasswordHash)) {
    console.warn('Admin verification failed', { email: signedInEmail, at: new Date().toISOString() });
    return res.status(401).json({ success: false, error: 'Administrator verification failed.' });
  }
  console.info('Admin verification succeeded', { email: signedInEmail, at: new Date().toISOString() });
  return res.json({ success: true, verified: true });
});
app.post('/api/admin/verify-access-password', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const settings = await getSecuritySettings();
  if (!req.body?.accessPassword || !verifyAccessPassword(String(req.body.accessPassword), settings.accessPasswordHash)) return res.status(401).json({ success: false, error: 'Administrator verification failed.' });
  return res.json({ success: true, verified: true });
});
app.post('/api/admin/update-access-password', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const settings = await getSecuritySettings();
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || String(newPassword).length < 12 || !verifyAccessPassword(String(currentPassword), settings.accessPasswordHash)) return res.status(401).json({ success: false, error: 'The administrator password could not be changed.' });
  await SECURITY_DOC.set({ ...settings, accessPasswordHash: hashAccessPassword(String(newPassword)), updatedAt: Date.now() }, { merge: true });
  console.info('Admin access password changed', { by: req.firebaseUser?.email, at: new Date().toISOString() });
  return res.json({ success: true });
});
app.post('/api/admin/authorize-email', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const settings = await getSecuritySettings();
  const { newAdminEmail, accessPassword } = req.body || {};
  if (req.firebaseUser?.email?.toLowerCase() !== settings.mainAdminEmail || !accessPassword || !verifyAccessPassword(String(accessPassword), settings.accessPasswordHash)) return res.status(403).json({ success: false, error: 'You do not have permission to do that.' });
  const cleanEmail = String(newAdminEmail || '').trim().toLowerCase();
  if (!cleanEmail.includes('@')) return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
  const approvedEmails = Array.from(new Set([...settings.approvedEmails, cleanEmail]));
  await SECURITY_DOC.set({ ...settings, approvedEmails, updatedAt: Date.now() }, { merge: true });
  return res.json({ success: true, authorizedEmails: approvedEmails });
});
app.post('/api/admin/list-authorized', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const settings = await getSecuritySettings();
  if (!req.body?.accessPassword || !verifyAccessPassword(String(req.body.accessPassword), settings.accessPasswordHash)) return res.status(401).json({ success: false, error: 'Administrator verification failed.' });
  return res.json({ success: true, primaryAdmin: settings.mainAdminEmail, authorizedEmails: settings.approvedEmails });
});

app.post('/api/files/upload', authenticate, requireAdmin, storageUpload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Please choose a file.' });
    const fileType = req.body.fileType === 'cover' ? 'cover' : 'pdf';
    const bookId = safeBookId(req.body.bookId);
    if (!bookId) return res.status(400).json({ success: false, error: 'The book could not be identified.' });
    const validType = fileType === 'pdf' ? req.file.mimetype === 'application/pdf' : /^image\/(jpeg|png|webp|gif)$/.test(req.file.mimetype);
    const maxSize = fileType === 'pdf' ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (!validType) return res.status(400).json({ success: false, error: fileType === 'pdf' ? 'Please choose a PDF file.' : 'Please choose an image file.' });
    if (req.file.size > maxSize) return res.status(400).json({ success: false, error: fileType === 'pdf' ? 'The PDF is larger than 50 MB.' : 'The cover image is larger than 5 MB.' });
    const cleanName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180) || `${fileType}.bin`;
    const storagePath = `${fileType === 'pdf' ? 'books' : 'covers'}/${bookId}/${cleanName}`;
    const { error } = await supabaseAdmin.storage.from(BUCKET_NAME).upload(storagePath, req.file.buffer, { contentType: fileType === 'pdf' ? 'application/pdf' : req.file.mimetype, upsert: true });
    if (error) throw error;
    const confirmedSize = await confirmStoredFile(storagePath, req.file.size);
    return res.json({ success: true, path: storagePath, signedUrl: await issueSignedUrl(storagePath), confirmedSize });
  } catch (error) {
    console.error('File upload failed', { message: error instanceof Error ? error.message : 'unknown' });
    return res.status(500).json({ success: false, error: 'The file could not be saved. Please try again.' });
  }
});

app.get('/api/files/signed-url', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const storagePath = safeStoragePath(req.query.path);
    if (!storagePath) return res.status(400).json({ success: false, error: 'The book file could not be found.' });
    const bookId = storagePath.split('/')[1];
    const snapshot = await adminDb.collection('books').doc(bookId).get();
    const book = snapshot.data();
    if (!snapshot.exists || book?.published !== true || ![book.pdfStoragePath, book.coverStoragePath].includes(storagePath)) return res.status(404).json({ success: false, error: 'The book file could not be found.' });
    return res.json({ success: true, signedUrl: await issueSignedUrl(storagePath) });
  } catch { return res.status(500).json({ success: false, error: 'The book could not be opened right now.' }); }
});
app.post('/api/files/delete', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const storagePath = safeStoragePath(req.body?.path);
  if (!storagePath) return res.status(400).json({ success: false, error: 'The file could not be found.' });
  const { error } = await supabaseAdmin.storage.from(BUCKET_NAME).remove([storagePath]);
  if (error) return res.status(500).json({ success: false, error: 'The file could not be removed.' });
  console.info('File deleted', { by: req.firebaseUser?.email, storagePath, at: new Date().toISOString() });
  return res.json({ success: true });
});

app.post('/api/books', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const bookId = safeBookId(req.body?.id);
  const pdfStoragePath = safeStoragePath(req.body?.pdfStoragePath);
  const coverStoragePath = req.body?.coverStoragePath ? safeStoragePath(req.body.coverStoragePath) : null;
  if (!bookId || !req.body?.title || !req.body?.author || !req.body?.category || !pdfStoragePath || !pdfStoragePath.startsWith(`books/${bookId}/`) || (req.body.coverStoragePath && (!coverStoragePath || !coverStoragePath.startsWith(`covers/${bookId}/`)))) return res.status(400).json({ success: false, error: 'Please complete the book details.' });
  const confirmedSize = await confirmStoredFile(pdfStoragePath, Number(req.body.pdfSize));
  const book = { ...req.body, id: bookId, pdfStoragePath, coverStoragePath: coverStoragePath || '', pdfSize: confirmedSize, pdfUrl: '', coverUrl: '', published: true, uploadStatus: 'completed', updatedAt: Date.now() };
  await adminDb.collection('books').doc(bookId).set(book);
  return res.json({ success: true, book });
});
app.patch('/api/books/:bookId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const bookId = safeBookId(req.params.bookId);
  if (!bookId) return res.status(400).json({ success: false, error: 'The book could not be identified.' });
  const ref = adminDb.collection('books').doc(bookId); const snapshot = await ref.get();
  if (!snapshot.exists) return res.status(404).json({ success: false, error: 'The book could not be found.' });
  const updates = { ...req.body, updatedAt: Date.now() };
  if (updates.pdfStoragePath) updates.pdfStoragePath = safeStoragePath(updates.pdfStoragePath);
  if (updates.coverStoragePath) updates.coverStoragePath = safeStoragePath(updates.coverStoragePath);
  await ref.update(updates); return res.json({ success: true });
});
app.delete('/api/books/:bookId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const bookId = safeBookId(req.params.bookId);
  if (!bookId) return res.status(400).json({ success: false, error: 'The book could not be identified.' });
  const ref = adminDb.collection('books').doc(bookId); const snapshot = await ref.get();
  if (!snapshot.exists) return res.status(404).json({ success: false, error: 'The book could not be found.' });
  const book = snapshot.data() || {};
  const paths = [book.pdfStoragePath, book.coverStoragePath].filter(Boolean).map(safeStoragePath).filter(Boolean) as string[];
  if (paths.length) await supabaseAdmin.storage.from(BUCKET_NAME).remove(paths);
  await ref.delete();
  console.info('Book deleted', { by: req.firebaseUser?.email, bookId, at: new Date().toISOString() });
  return res.json({ success: true });
});

// Temporary one-book import. Enabled only while ONE_TIME_IMPORT_TOKEN is set;
// remove this route and unset the token immediately after the approved import.
app.post('/api/maintenance/import-single-book', storageUpload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]), async (req, res) => {
  const configuredToken = process.env.ONE_TIME_IMPORT_TOKEN?.trim() || '';
  const suppliedToken = String(req.header('x-one-time-import-token') || '');
  if (!configuredToken || !suppliedToken || !safeStringCompare(suppliedToken, configuredToken)) {
    return res.status(404).json({ success: false, error: 'The requested action is not available.' });
  }
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const pdf = files?.pdf?.[0];
  const cover = files?.cover?.[0];
  if (!pdf || pdf.mimetype !== 'application/pdf') return res.status(400).json({ success: false, error: 'A PDF file is required.' });
  if (!cover || !/^image\/(jpeg|png|webp|gif)$/.test(cover.mimetype)) return res.status(400).json({ success: false, error: 'A cover image is required.' });
  if (cover.size > 5 * 1024 * 1024) return res.status(400).json({ success: false, error: 'The cover image is larger than 5 MB.' });

  const existing = await adminDb.collection('books').get();
  if (existing.size !== 1) return res.status(409).json({ success: false, error: `Expected exactly one existing book, found ${existing.size}.` });

  const oldBook = existing.docs[0];
  const oldData = oldBook.data();
  const bookId = `book-${Date.now()}`;
  const pdfPath = `books/${bookId}/the-power-of-prayer-and-fasting.pdf`;
  const coverPath = `covers/${bookId}/the-power-of-prayer-and-fasting.jpg`;
  try {
    const pdfUpload = await supabaseAdmin.storage.from(BUCKET_NAME).upload(pdfPath, pdf.buffer, { contentType: 'application/pdf', upsert: false });
    if (pdfUpload.error) throw pdfUpload.error;
    const coverUpload = await supabaseAdmin.storage.from(BUCKET_NAME).upload(coverPath, cover.buffer, { contentType: cover.mimetype, upsert: false });
    if (coverUpload.error) throw coverUpload.error;
    const confirmedSize = await confirmStoredFile(pdfPath, pdf.size);
    const now = Date.now();
    const book = {
      id: bookId,
      title: 'The Power of Prayer and Fasting',
      author: 'Marilyn Hickey',
      category: 'Prayer and Spiritual Growth',
      subcategory: 'Fasting and Intercession',
      description: 'Explore the biblical principles of prayer and fasting with Marilyn Hickey. This practical Christian guide examines how prayer and fasting can support spiritual growth, strengthen faith, help believers seek God\'s direction, and encourage personal transformation. It includes guidance on preparing for a fast, developing a consistent prayer life, and following a twenty-one-day prayer and fasting programme.',
      tags: ['Prayer', 'Fasting', 'Christian Living', 'Spiritual Growth', 'Biblical Studies'],
      pdfStoragePath: pdfPath,
      coverStoragePath: coverPath,
      pdfUrl: await issueSignedUrl(pdfPath),
      coverUrl: await issueSignedUrl(coverPath),
      pdfSize: confirmedSize,
      pages: 284,
      published: true,
      featured: false,
      uploadStatus: 'completed',
      createdAt: now,
      updatedAt: now,
    };
    const oldPaths = [oldData.pdfStoragePath, oldData.coverStoragePath].filter(Boolean).map(safeStoragePath).filter(Boolean) as string[];
    if (oldPaths.length) await supabaseAdmin.storage.from(BUCKET_NAME).remove(oldPaths);
    await oldBook.ref.delete();
    await adminDb.collection('books').doc(bookId).set(book);
    return res.json({ success: true, bookId, title: book.title });
  } catch (error) {
    await supabaseAdmin.storage.from(BUCKET_NAME).remove([pdfPath, coverPath]).catch(() => undefined);
    console.error('One-time book import failed', { message: error instanceof Error ? error.message : 'unknown' });
    return res.status(500).json({ success: false, error: 'The one-time book import failed.' });
  }
});

app.all('/api/*', (_req, res) => res.status(404).json({ success: false, error: 'The requested action is not available.' }));

async function start() {
  if (process.env.NODE_ENV === 'production') { app.use(express.static('dist')); app.get('*', (_req, res) => res.sendFile(path.resolve('dist', 'index.html'))); }
  else { const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' }); app.use(vite.middlewares); }
  app.listen(PORT, '0.0.0.0', () => console.log(`[RCCG YAYA OYO 6 E-Library] Service listening on port ${PORT}`));
}
start().catch((error) => { console.error('Service could not start:', error instanceof Error ? error.message : 'unknown error'); process.exit(1); });
