// Runs on your computer only. Never copy this script or credentials to the website folder.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
const [operation, projectId, email, ...name] = process.argv.slice(2);
if(!['admin','client'].includes(operation)||!/^neonwater-[a-z0-9-]+$/.test(projectId||'')||/batch.?boss/i.test(projectId)||!email?.includes('@')){
  console.error('Usage: npm run account -- admin|client neonwater-PROJECT-ID email@example.com [Name]');process.exit(1);
}
if(!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to this portal project’s service-account JSON file.');
const credentials=JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
if(credentials.project_id!==projectId)throw new Error('Credential project does not match the Neonwater portal project. Nothing was changed.');
initializeApp({credential:applicationDefault(),projectId});
const auth=getAuth();
let user;
try { user=await auth.getUserByEmail(email); }
catch(error){if(error.code!=='auth/user-not-found')throw error;user=await auth.createUser({email,displayName:name.join(' ')||email,password:randomBytes(36).toString('base64url')});}
if(operation==='admin')await auth.setCustomUserClaims(user.uid,{...user.customClaims,admin:true});
if(operation==='client'&&user.customClaims?.admin)throw new Error('That account is already an admin. Use a separate client email.');
const link=await auth.generatePasswordResetLink(email);
console.log(`Account ready: ${email}\nUID: ${user.uid}\nRole: ${operation}`);
console.log('Private one-time password setup link (share securely with this person only; do not commit it):');
console.log(link);
