interface DiagnosticIdentity {
  email?: string;
  email_verified?: boolean;
  admin?: unknown;
}

export function describeAdminCheck(identity: DiagnosticIdentity, approvedEmails: string[], storedSettings: boolean) {
  const email = (identity.email || '').toLowerCase();
  const approved = Boolean(email && approvedEmails.includes(email));
  return {
    signedInEmail: identity.email || '',
    emailVerified: identity.email_verified === true,
    approvedEmail: approved,
    adminClaimExists: identity.admin === true,
    // The current implementation does not create a password-verified session.
    adminSessionExists: false,
    passwordStep: 'Not enforced on the current Google sign-in path.',
    settingsSource: storedSettings ? 'Saved administrator settings' : 'Hosting settings',
    result: approved
      ? 'The current server email check allows this account. It does not yet require email verification or an administrator-password session.'
      : 'The current server email check does not allow this account.',
  };
}
