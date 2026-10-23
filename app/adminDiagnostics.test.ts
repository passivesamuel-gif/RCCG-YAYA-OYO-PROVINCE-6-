import test from 'node:test';
import assert from 'node:assert/strict';
import { describeAdminCheck } from './adminDiagnostics';

const approved = ['admin@example.test', 'another@example.test'];

test('reports the current account match without exposing the approved list', () => {
  const result = describeAdminCheck({ email: 'ADMIN@example.test', email_verified: true }, approved, false);
  assert.equal(result.approvedEmail, true);
  assert.equal(result.emailVerified, true);
  assert.equal(result.settingsSource, 'Hosting settings');
  assert.equal(JSON.stringify(result).includes('another@example.test'), false);
});

test('does not invent an admin session for an approved account', () => {
  const result = describeAdminCheck({ email: approved[0], admin: true }, approved, true);
  assert.equal(result.adminClaimExists, true);
  assert.equal(result.adminSessionExists, false);
  assert.equal(result.settingsSource, 'Saved administrator settings');
});

test('reports a different Google account as not approved', () => {
  assert.equal(describeAdminCheck({ email: 'reader@example.test' }, approved, false).approvedEmail, false);
});

test('missing email is never approved', () => {
  assert.equal(describeAdminCheck({}, [''], false).approvedEmail, false);
});

test('unverified email remains visible as unverified even when old server check allows it', () => {
  const result = describeAdminCheck({ email: approved[0], email_verified: false }, approved, false);
  assert.equal(result.emailVerified, false);
  assert.equal(result.approvedEmail, true);
  assert.match(result.result, /does not yet require email verification/);
});

test('does not conceal whitespace errors in saved settings', () => {
  assert.equal(describeAdminCheck({ email: approved[0] }, [` ${approved[0]} `], true).approvedEmail, false);
});

test('claim detection is strict and never grants permissions', () => {
  assert.equal(describeAdminCheck({ email: approved[0], admin: 'true' }, approved, false).adminClaimExists, false);
});
