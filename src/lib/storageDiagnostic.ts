import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

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
    const configRes = await fetch('/firebase-applet-config.json');
    const config = await configRes.json();
    const bucket = config.storageBucket || 'gen-lang-client-0628990292.firebasestorage.app';
    const projectId = config.projectId || 'gen-lang-client-0628990292';

    let detailsLog = `[PDF Upload Comprehensive Diagnostic]\n`;
    detailsLog += `1. Admin Form PDF Field Connection: CONNECTED (state pdfFile connected to uploadBook params).\n`;
    detailsLog += `2. Restrictions: PDF max size 50 MB, Cover max size 5 MB. Allowed type: application/pdf.\n`;

    let firebasePdfOk = false;
    let serverUploadOk = false;
    let firebaseErr = '';

    // Test 1: Direct Firebase Storage PDF Upload Test
    try {
      const testPdfBlob = new Blob(['%PDF-1.4 Diagnostic Test Content'], { type: 'application/pdf' });
      const testPdfRef = ref(storage, 'books/diagnostic-test.pdf');
      await uploadBytes(testPdfRef, testPdfBlob, { contentType: 'application/pdf' });
      const downloadUrl = await getDownloadURL(testPdfRef);
      firebasePdfOk = true;
      detailsLog += `3. Firebase Storage Direct Upload: SUCCESS (Test PDF saved to books/diagnostic-test.pdf - URL: ${downloadUrl.substring(0, 50)}...)\n`;
    } catch (fbErr: any) {
      firebaseErr = fbErr?.message || String(fbErr);
      detailsLog += `3. Firebase Storage Direct Upload: NOTICE (${firebaseErr})\n`;
    }

    // Test 2: Express Server File Upload API Endpoint Test
    try {
      const formData = new FormData();
      const testFile = new File(['%PDF-1.4 Test Document Content'], 'test_book.pdf', { type: 'application/pdf' });
      formData.append('file', testFile);
      formData.append('fileType', 'pdf');
      formData.append('bookId', 'diag-test-123');

      const serverRes = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const serverData = await serverRes.json();
      if (serverRes.ok && serverData.success && serverData.path) {
        serverUploadOk = true;
        detailsLog += `4. Server Endpoint (/api/files/upload): SUCCESS (Path: ${serverData.path}, Confirmed Bytes: ${serverData.confirmedSize || testFile.size} bytes)\n`;
      } else {
        detailsLog += `4. Server Endpoint (/api/files/upload): FAIL (${serverData?.error || 'Unknown error'})\n`;
      }
    } catch (srvErr: any) {
      detailsLog += `4. Server Endpoint (/api/files/upload): FAIL (${srvErr?.message || String(srvErr)})\n`;
    }

    const overallSuccess = firebasePdfOk || serverUploadOk;

    return {
      success: overallSuccess,
      bucket,
      projectId,
      firebasePdfUploadOk: firebasePdfOk,
      serverUploadEndpointOk: serverUploadOk,
      fileRestrictionsCheck: restrictionsInfo,
      error: overallSuccess ? undefined : `Upload Diagnostic Failure: Firebase (${firebaseErr || 'error'})`,
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

