import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { safeFetch, ApiResponse } from '../lib/api';

interface AdminDiagnostic {
  signedInEmail: string;
  emailVerified: boolean;
  approvedEmail: boolean;
  adminClaimExists: boolean;
  adminSessionExists: boolean;
  passwordStep: string;
  settingsSource: string;
  result: string;
  deployment: string;
  configurationPresent: boolean;
}

export const DebugPanel: React.FC = () => {
  const { user, isAdmin, lastAdminCheck } = useAuth();
  const { lastUploadError } = useLibrary();
  const [response, setResponse] = useState<ApiResponse<AdminDiagnostic> | null>(null);
  const [checking, setChecking] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setResponse(null);
    if (!user) return;
    setChecking(true);
    safeFetch<AdminDiagnostic>('/api/admin/diagnostics?debug=1', { cache: 'no-store' }).then((result) => {
      if (active) { setResponse(result); setChecking(false); }
    });
    return () => { active = false; };
  }, [user?.uid, lastAdminCheck, attempt]);

  const details = response?.success ? response.data : undefined;
  const yesNo = (value: boolean | undefined) => value === undefined ? 'Not checked' : value ? 'Yes' : 'No';
  const rows = [
    ['Signed-in email', details?.signedInEmail || user?.email || 'Not signed in'],
    ['Email verified', yesNo(details?.emailVerified ?? user?.emailVerified)],
    ['Server found this email on the approved list', yesNo(details?.approvedEmail)],
    ['Administrator session exists', yesNo(details?.adminSessionExists)],
    ['Administrator claim exists', yesNo(details?.adminClaimExists)],
    ['Browser explicitly refreshed the sign-in token', 'No — the current sign-in code does not request a fresh token.'],
    ['Exact sign-in administrator check', lastAdminCheck ? `${lastAdminCheck.message} HTTP ${lastAdminCheck.status}.` : 'Not completed in this browser session.'],
    ['Current server check', checking ? 'Checking…' : details?.result || response?.error || 'Sign in to check.'],
    ['Diagnostic request result', response ? `HTTP ${response.status ?? 0}; ${response.success ? 'completed' : 'failed'}` : 'Not completed'],
    ['Administrator password step', details?.passwordStep || 'Not checked'],
    ['Approved-email settings being used', details?.settingsSource || 'Not checked'],
    ['Required hosting settings are present', yesNo(details?.configurationPresent)],
    ['Deployed version', details?.deployment || 'Not checked'],
    ['Administrator link currently enabled', yesNo(isAdmin)],
    ['Latest upload error', lastUploadError?.message || 'None recorded in this browser session.'],
    ['Live Google admin / PDF upload / reader access tests', 'NOT TESTED — this panel reports observations, not a completed end-to-end test.'],
  ];

  return (
    <section aria-label="Temporary administrator diagnostics" className="bg-[#123D2A] text-white px-4 py-5 border-b border-[#D4AF65] text-xs">
      <div className="max-w-7xl mx-auto space-y-3">
        <h2 className="font-heading font-bold text-[#D4AF65]">Temporary sign-in check</h2>
        <p>Only visible with ?debug=1. This does not grant administrator access. Never include passwords in a report.</p>
        <dl className="space-y-2">
          {rows.map(([label, value]) => <div key={label} className="grid sm:grid-cols-2 gap-1 border-b border-white/15 pb-2"><dt className="font-semibold">{label}</dt><dd className="break-words">{value}</dd></div>)}
        </dl>
        <div className="flex gap-4">
          <button type="button" onClick={() => setAttempt((value) => value + 1)} disabled={!user || checking} className="underline disabled:opacity-50">Check again</button>
          <button type="button" onClick={() => { const url = new URL(window.location.href); url.searchParams.delete('debug'); window.location.assign(url.toString()); }} className="underline">Hide this panel</button>
        </div>
      </div>
    </section>
  );
};
