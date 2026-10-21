export type Decision = 'changes_requested' | 'approved';
export function secureUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use a complete HTTPS link without a username or password.');
  if (url.hash) url.hash = '';
  return url.href;
}
export function reviewInput(currentVersion: string, viewingVersion: string, decision: string, note: string) {
  if (!currentVersion || currentVersion !== viewingVersion) throw new Error('Open the current version before requesting changes or approving.');
  if (!['changes_requested', 'approved'].includes(decision)) throw new Error('Choose a valid decision.');
  if (decision === 'changes_requested' && !note.trim()) throw new Error('Tell us what you would like changed.');
  if (note.length > 5000) throw new Error('Keep your note under 5,000 characters.');
  return { decision: decision as Decision, note: note.trim() };
}
export function assertSeparateProject(id: string) {
  if (!/^neonwater-[a-z0-9-]+$/.test(id) || /batch.?boss/i.test(id)) throw new Error('Use a separate Firebase project whose ID starts with neonwater-.');
}
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]!));
}
