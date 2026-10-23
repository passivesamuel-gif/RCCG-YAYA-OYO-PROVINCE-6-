import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import firebaseConfig from '../../firebase-applet-config.json';
import { RefreshCw, ExternalLink, ShieldAlert, Copy, Check, Database } from 'lucide-react';
import { runStorageDiagnostic, DiagnosticResult } from '../lib/storageDiagnostic';

export const DebugPanel: React.FC = () => {
  const { lastAuthAttemptError } = useAuth();
  const { lastUploadError, books } = useLibrary();
  const [copied, setCopied] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [runningDiagnostic, setRunningDiagnostic] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<{
    reachabilityTested: boolean;
    identityToolkitReachable: boolean | null;
    authDomainReachable: boolean | null;
    pingDetails: string;
  }>({
    reachabilityTested: false,
    identityToolkitReachable: null,
    authDomainReachable: null,
    pingDetails: 'Not tested yet. Click "Re-Test Connection" below.',
  });
  const [testing, setTesting] = useState(false);

  const executeStorageDiagnostic = async () => {
    setRunningDiagnostic(true);
    try {
      const result = await runStorageDiagnostic();
      setDiagnosticResult(result);
    } catch (e: any) {
      setDiagnosticResult({
        success: false,
        bucket: 'Unknown',
        projectId: 'Unknown',
        error: e?.message || 'Diagnostic execution failed',
        details: String(e),
      });
    } finally {
      setRunningDiagnostic(false);
    }
  };

  const currentHost = typeof window !== 'undefined' ? window.location.host : 'unknown';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
  const isPreviewIframe = typeof window !== 'undefined' ? window.self !== window.top : false;

  // Inspect firebase settings presence (never show values)
  const configCheck = {
    apiKey: Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.length > 5) ? 'present' : 'missing',
    authDomain: Boolean(firebaseConfig.authDomain && firebaseConfig.authDomain.length > 3) ? 'present' : 'missing',
    projectId: Boolean(firebaseConfig.projectId && firebaseConfig.projectId.length > 3) ? 'present' : 'missing',
    appId: Boolean(firebaseConfig.appId && firebaseConfig.appId.length > 5) ? 'present' : 'missing',
  };

  const testConnectivity = async () => {
    setTesting(true);
    let identityOk = false;
    let authDomainOk = false;
    let details = '';

    try {
      const idRes = await fetch('https://identitytoolkit.googleapis.com/$discovery/rest?version=v1', {
        method: 'GET',
        cache: 'no-store',
        mode: 'no-cors',
      });
      identityOk = idRes.type === 'opaque' || idRes.ok || idRes.status === 200;
      details += `Identity Toolkit API: ${identityOk ? 'Host reachable (browser CORS prevents reading the response body)' : 'UNAVAILABLE'}\n`;
    } catch (e: any) {
      details += `Identity Toolkit API reachability error: ${e?.message || String(e)}\n`;
    }

    try {
      if (firebaseConfig.authDomain) {
        await fetch(`https://${firebaseConfig.authDomain}/__/auth/handler`, {
          method: 'GET',
          mode: 'no-cors',
        });
        authDomainOk = true;
        details += `Auth Domain (${firebaseConfig.authDomain}): Host reachable\n`;
      }
    } catch (e: any) {
      details += `Auth Domain probe failed: ${e?.message || String(e)}\n`;
    }

    setServiceStatus({
      reachabilityTested: true,
      identityToolkitReachable: identityOk,
      authDomainReachable: authDomainOk,
      pingDetails: details.trim(),
    });
    setTesting(false);
  };

  useEffect(() => {
    testConnectivity();
    executeStorageDiagnostic();
  }, []);

  const debugSummaryText = `--- RCCG YAYA OYO 6 E-LIBRARY DEBUG REPORT ---
Date: ${new Date().toISOString()}
Domain (window.location.host): ${currentHost}
Origin (window.location.origin): ${currentOrigin}
Running in AI Studio Preview Window (iframe): ${isPreviewIframe ? 'YES' : 'NO'}

FIREBASE CONFIG CHECK:
- API Key: ${configCheck.apiKey}
- Auth Domain: ${configCheck.authDomain}
- Project ID: ${configCheck.projectId}
- App ID: ${configCheck.appId}

LAST UPLOAD OR FILE REQUEST ERROR:
${
  lastUploadError
    ? `- Book ID: ${lastUploadError.bookId}
- Error: ${lastUploadError.message}
- Details: ${lastUploadError.details || 'None'}
- Timestamp: ${new Date(lastUploadError.timestamp).toLocaleTimeString()}`
    : '- No upload or file errors recorded in this browser session.'
}

LAST AUTHENTICATION ATTEMPT:
${
  lastAuthAttemptError
    ? `- Action Type: ${lastAuthAttemptError.type}
- Error Code: ${lastAuthAttemptError.code || 'None'}
- Raw Error Message: ${lastAuthAttemptError.message || 'None'}
- Timestamp: ${new Date(lastAuthAttemptError.timestamp).toLocaleTimeString()}`
    : '- No authentication attempt recorded in this browser session yet.'
}

SERVICE CONNECTIVITY DIAGNOSTICS:
${serviceStatus.pingDetails}
----------------------------------------------`;

  const copyReport = () => {
    navigator.clipboard.writeText(debugSummaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#111827] text-gray-100 p-4 sm:p-6 border-b-4 border-[#D4AF65] font-mono text-xs text-left shadow-2xl relative z-50">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-700 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="font-bold text-amber-400 tracking-wider uppercase text-sm">
              TEMPORARY DIAGNOSTIC DEBUG PANEL (?debug=1)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyReport}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copied ? 'Copied Report!' : 'Copy Report'}</span>
            </button>
            <button
              onClick={() => window.open(window.location.pathname, '_self')}
              className="px-2.5 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 rounded-xs transition-colors cursor-pointer"
              title="Close Debug Mode (Removes ?debug=1 from URL)"
            >
              Hide Debug
            </button>
          </div>
        </div>

        {/* STEP 1 FILE AUDIT REPORT */}
        <div className="bg-slate-900 border border-amber-500/50 p-4 rounded-xs space-y-3 text-left">
          <h3 className="text-amber-400 font-bold uppercase text-xs tracking-wider border-b border-gray-700 pb-1.5">
            STEP 1: FILE STORAGE AUDIT REPORT
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-200">
            <div>
              <p className="font-bold text-amber-300">a) Cover Image Storage Location:</p>
              <p className="text-gray-300 mt-0.5 leading-relaxed">
                Covers go to private storage (Supabase bucket <code className="text-emerald-300 font-mono">library-files</code> under path <code className="text-emerald-300 font-mono">covers/&lt;bookId&gt;/...</code>). They are compressed before upload.
              </p>
            </div>
            <div>
              <p className="font-bold text-amber-300">b) Admin PDF Upload Flow:</p>
              <p className="text-gray-300 mt-0.5 leading-relaxed">
                PDF field is connected and sent to <code className="text-emerald-300 font-mono">/api/files/upload</code> as multipart FormData. The upload was dropping when post-upload byte size verification was missing or when the 60s background stall timer fired before completion.
              </p>
            </div>
            <div>
              <p className="font-bold text-amber-300">c) PDF Target Storage &amp; Limits:</p>
              <p className="text-gray-300 mt-0.5 leading-relaxed">
                Path: <code className="text-emerald-300 font-mono">books/&lt;bookId&gt;/...</code> in <code className="text-emerald-300 font-mono">library-files</code> private bucket. Max PDF size: 50 MB. Content-Type: <code className="text-emerald-300 font-mono">application/pdf</code>. Read access via 24-hour signed URLs.
              </p>
            </div>
            <div>
              <p className="font-bold text-amber-300">d) PDF.js Package Status:</p>
              <p className="text-emerald-400 font-bold mt-0.5">
                YES (<code className="font-mono">pdfjs-dist ^6.4.299</code> installed and the matching worker bundled locally).
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Domain & Preview Frame */}
          <div className="bg-gray-900/80 p-3.5 border border-gray-800 rounded-xs space-y-2">
            <h4 className="text-amber-400 font-bold uppercase text-[11px] tracking-wider">
              1. Current Domain & Environment
            </h4>
            <div className="space-y-1 text-gray-300">
              <p>
                <strong className="text-gray-400">Host Domain:</strong>{' '}
                <span className="text-emerald-300 font-bold select-all">{currentHost}</span>
              </p>
              <p>
                <strong className="text-gray-400">Origin:</strong>{' '}
                <span className="text-gray-300 text-[10px] break-all select-all">{currentOrigin}</span>
              </p>
              <p className="flex items-center gap-1.5 pt-1">
                <strong className="text-gray-400">AI Studio Preview Frame:</strong>{' '}
                {isPreviewIframe ? (
                  <span className="text-amber-300 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded-xs border border-amber-800">
                    YES (iframe)
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded-xs border border-emerald-800">
                    NO (Normal tab)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Card 2: Upload Status & Storage Handler Errors */}
          <div className="bg-gray-900/80 p-3.5 border border-gray-800 rounded-xs space-y-2">
            <h4 className="text-amber-400 font-bold uppercase text-[11px] tracking-wider">
              2. Upload Status & Storage Errors
            </h4>
            <div className="space-y-1.5 text-xs text-gray-300">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Latest Upload Status:</span>
                {books.length > 0 ? (
                  <span
                    className={`px-1.5 py-0.5 rounded-xs font-bold text-[10px] uppercase ${
                      books[0].uploadStatus === 'completed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : books[0].uploadStatus === 'finishing'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                        : 'bg-red-950 text-red-400 border border-red-800'
                    }`}
                  >
                    {books[0].uploadStatus || 'completed'}
                  </span>
                ) : (
                  <span className="text-gray-500 italic text-[10px]">No uploads recorded</span>
                )}
              </div>

              {lastUploadError ? (
                <div className="p-2.5 bg-red-950/50 border border-red-800/80 rounded-xs space-y-1 text-red-200 mt-2">
                  <p className="text-[10px] font-bold text-red-400 uppercase">
                    Captured Error (Book: {lastUploadError.bookId})
                  </p>
                  <p className="text-[11px] font-bold text-amber-300 leading-relaxed">
                    {lastUploadError.message}
                  </p>
                  {lastUploadError.details && (
                    <p className="text-[10px] text-gray-300 break-words pt-1 border-t border-red-900/50 font-mono">
                      {lastUploadError.details}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 italic text-[10px] border-t border-gray-800/80 pt-1">
                  Storage Upload Handler: No errors captured in session.
                </p>
              )}
            </div>
          </div>

          {/* Card 3: Firebase Config Status */}
          <div className="bg-gray-900/80 p-3.5 border border-gray-800 rounded-xs space-y-2">
            <h4 className="text-amber-400 font-bold uppercase text-[11px] tracking-wider">
              3. Firebase Configuration
            </h4>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">API Key:</span>
                <span className={configCheck.apiKey === 'present' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {configCheck.apiKey}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Auth Domain:</span>
                <span className={configCheck.authDomain === 'present' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {configCheck.authDomain}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Project ID:</span>
                <span className={configCheck.projectId === 'present' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {configCheck.projectId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">App ID:</span>
                <span className={configCheck.appId === 'present' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {configCheck.appId}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Service Reachability & Last Auth Attempt */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900/80 p-3.5 border border-gray-800 rounded-xs space-y-2">
            <h4 className="text-amber-400 font-bold uppercase text-[11px] tracking-wider">
              4. Last Authentication Error
            </h4>
            {lastAuthAttemptError ? (
              <div className="p-2.5 bg-red-950/50 border border-red-800/80 rounded-xs space-y-1 text-red-200">
                <p>
                  <strong className="text-red-400">Action:</strong> {lastAuthAttemptError.type.toUpperCase()}
                </p>
                <p>
                  <strong className="text-red-400">Error Code:</strong>{' '}
                  <span className="bg-black/60 px-1.5 py-0.5 rounded-xs font-bold text-amber-300 border border-amber-800/50">
                    {lastAuthAttemptError.code || 'None'}
                  </span>
                </p>
                <p className="text-[11px] leading-relaxed break-words">
                  {lastAuthAttemptError.message}
                </p>
              </div>
            ) : (
              <p className="text-gray-400 italic py-2 text-[11px]">
                No auth attempt errors recorded.
              </p>
            )}
          </div>

          <div className="bg-gray-900/80 p-3.5 border border-gray-800 rounded-xs space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-amber-400 font-bold uppercase text-[11px] tracking-wider">
                5. Server Connectivity Diagnostics
              </h4>
              <button
                onClick={testConnectivity}
                disabled={testing}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-black font-bold text-[10px] uppercase rounded-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Probing...' : 'Re-Test'}</span>
              </button>
            </div>
            <pre className="p-2.5 bg-black/80 border border-gray-800 rounded-xs text-[10px] text-emerald-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-24">
              {serviceStatus.pingDetails}
            </pre>
          </div>
        </div>

        {/* Card 6: runStorageDiagnostic Tool Output */}
        <div className="bg-gray-900/80 p-3.5 border border-gray-800 rounded-xs space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-amber-400 font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>6. Storage Diagnostic Tool (`runStorageDiagnostic`)</span>
            </h4>
            <button
              onClick={executeStorageDiagnostic}
              disabled={runningDiagnostic}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-black font-bold text-[10px] uppercase rounded-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${runningDiagnostic ? 'animate-spin' : ''}`} />
              <span>{runningDiagnostic ? 'Testing...' : 'Run Storage Diagnostic'}</span>
            </button>
          </div>

          {diagnosticResult ? (
            <div className={`p-3 rounded-xs border text-xs space-y-1.5 ${
              diagnosticResult.success
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                : 'bg-red-950/50 border-red-800/80 text-red-200'
            }`}>
              <div className="flex items-center justify-between font-bold text-[11px]">
                <span>Status: {diagnosticResult.success ? 'PASSED (Read/Write OK)' : 'FAILED'}</span>
                <span>Bucket: {diagnosticResult.bucket}</span>
              </div>
              {diagnosticResult.error && (
                <p className="font-bold text-amber-300 text-[11px]">
                  Error: {diagnosticResult.error}
                </p>
              )}
              <p className="text-[11px] text-gray-300 leading-relaxed font-mono whitespace-pre-wrap border-t border-gray-800 pt-1">
                {diagnosticResult.details}
              </p>
            </div>
          ) : (
            <p className="text-gray-400 italic py-1 text-[11px]">
              Click "Run Storage Diagnostic" to test read/write connectivity to your storage bucket.
            </p>
          )}
        </div>

        {/* Quick Action Hints */}
        <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-xs text-[11px] text-amber-200/90 leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <strong>How to remove before delivery:</strong> Remove <code>?debug=1</code> from the browser address bar, or tap the red <strong>Hide Debug</strong> button above.
          </div>
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase text-[10px] tracking-wider rounded-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open in New Tab</span>
          </button>
        </div>
      </div>
    </div>
  );
};
