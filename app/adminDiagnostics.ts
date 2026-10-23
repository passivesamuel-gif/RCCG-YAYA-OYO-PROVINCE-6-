interface DiagnosticIdentity {
  email?: string;
  email_verified?: boolean;
  admin?: unknown;
  adminSessionExpiresAt?: number;
}

export function describeAdminCheck(identity: DiagnosticIdentity, approvedEmails: string[], storedSettings: boolean) {
  const email = (identity.email || '').toLowerCase();
  const approved = Boolean(email && approvedEmails.includes(email));
  const session = identity.admin === true && Number(identity.adminSessionExpiresAt) > Date.now();
  return {
    signedInEmail: identity.email || '',
    emailVerified: identity.email_verified === true,
    approvedEmail: approved,
    adminClaimExists: identity.admin === true,
    adminSessionExists: session,
    passwordStep: approved && identity.email_verified === true ? 'Not required for an approved Google administrator; the server issues an expiring session.' : 'Not applicable.',
    settingsSource: storedSettings ? 'Saved administrator settings' : 'Hosting settings',
    result: approved && identity.email_verified === true && session
      ? 'The server confirmed a verified approved account with an active administrator session.'
      : approved && identity.email_verified !== true
        ? 'The server found this email on the approved list, but the sign-in email is not verified.'
        : approved
        ? 'The server found this verified account on the approved list, but no active administrator session exists.'
        : 'The server did not confirm a verified approved administrator account.',
  };
}
