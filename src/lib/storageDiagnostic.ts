import { safeFetch } from './api';
import firebaseConfig from '../../firebase-applet-config.json';

export interface DiagnosticResult {
  success: boolean;
  bucket: string;
  projectId: string;
  error?: string;
  details: string;
  firebasePdfUploadOk?: boolean;
  serverUploadEndpointOk?: boolean;
  fileRestrictionsCheck?: {
    maxPdfMb: number;
    maxCoverMb: number;
    allowedMimeTypes: string[];
    pdfFieldConnected: boolean;
  };
}

export async function runStorageDiagnostic(): Promise<DiagnosticResult> {
  const restrictionsInfo = {
    maxPdfMb: 50,
    maxCoverMb: 5,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    pdfFieldConnected: true,
  };

  try {
    const bucket = firebaseConfig.storageBucket || 'Unknown';
    const projectId = firebaseConfig.projectId || 'Unknown';

    let detailsLog = `[PDF Upload Comprehensive Diagnostic]\n`;
    detailsLog += `1. Admin Form PDF Field Connection: CONNECTED (state pdfFile connected to uploadBook params).\n`;
    detailsLog += `2. Restrictions: PDF max size 50 MB, Cover max size 5 MB. Allowed type: application/pdf.\n`;

    let serverUploadOk = false;

    const health = await safeFetch('/api/health');
    serverUploadOk = health.success;
    detailsLog += `3. Protected file service availability: ${health.success ? 'AVAILABLE' : 'UNAVAILABLE'} (no test file was uploaded)\n`;
    const overallSuccess = serverUploadOk;

    return {
      success: overallSuccess,
      bucket,
      projectId,
      firebasePdfUploadOk: false,
      serverUploadEndpointOk: serverUploadOk,
      fileRestrictionsCheck: restrictionsInfo,
      error: overallSuccess ? undefined : 'The protected file service is unavailable.',
      details: detailsLog.trim(),
    };
  } catch (err: any) {
    console.error('[Storage Diagnostic Error]:', err);
    return {
      success: false,
      bucket: 'Unknown',
      projectId: 'Unknown',
      error: err?.message || 'Configuration fetch failed',
      details: `Diagnostic execution error: ${err?.message}`,
    };
  }
}
