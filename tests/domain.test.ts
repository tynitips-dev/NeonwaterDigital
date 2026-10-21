import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertSeparateProject, secureUrl, reviewInput, escapeHtml } from '../src/domain.ts';
test('reject stale approval and requests against old versions',()=>{
  for(const decision of ['approved','changes_requested'])assert.throws(()=>reviewInput('v2','v1',decision,'Change this'));
  assert.deepEqual(reviewInput('v2','v2','approved','  Looks good '),{decision:'approved',note:'Looks good'});
});
test('change requests require actionable notes and reject unsupported decisions',()=>{
  assert.throws(()=>reviewInput('v2','v2','changes_requested','   '));
  assert.throws(()=>reviewInput('v2','v2','delete','No'));
  assert.throws(()=>reviewInput('v2','v2','approved','a'.repeat(5001)));
});
test('untrusted preview URLs must use HTTPS without credentials',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,hi','http://demo.example','https://user:pass@demo.example'])assert.throws(()=>secureUrl(url));
  assert.equal(secureUrl('https://demo.example/path'),'https://demo.example/path');
});
test('reject BatchBoss and unrelated Firebase project IDs',()=>{
  for(const id of ['batch-boss-android','neonwater-batchboss','other-project',''])assert.throws(()=>assertSeparateProject(id));
  assert.doesNotThrow(()=>assertSeparateProject('neonwater-client-portal'));
});
test('escape client feedback as text',()=>{assert.equal(escapeHtml('<img src=x onerror="bad()">'), '&lt;img src=x onerror=&quot;bad()&quot;&gt;');});
