import { before,after,test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment,assertSucceeds,assertFails } from '@firebase/rules-unit-testing';
import { doc,getDoc,setDoc,updateDoc,collection,getDocs,query,where,serverTimestamp,writeBatch } from 'firebase/firestore';
let env;
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-neonwater-portal',firestore:{rules:readFileSync('firestore.rules','utf8'),host:'127.0.0.1',port:8080}});
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  await setDoc(doc(db,'projects/p1'),{title:'Project one',clientUid:'alice',clientName:'Alice',summary:'One',currentVersionId:'v2',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  await setDoc(doc(db,'projects/p2'),{title:'Project two',clientUid:'bob',clientName:'Bob',summary:'Two',currentVersionId:'b1',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  for(const id of ['v1','v2'])await setDoc(doc(db,'projects/p1/versions',id),{label:id,description:'Version',previewUrl:'https://example.com/',screenshotUrl:'',published:true,createdAt:serverTimestamp()});
  await setDoc(doc(db,'projects/p1/versions/draft'),{label:'Draft',published:false});
 });
});
after(async()=>{if(env)await env.cleanup();});
const alice=()=>env.authenticatedContext('alice',{email:'alice@example.com'}).firestore();
test('anonymous visitors cannot read projects',async()=>{await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'projects/p1')));});
test('client can query only their own projects and cannot read another project',async()=>{
 const db=alice();await assertSucceeds(getDocs(query(collection(db,'projects'),where('clientUid','==','alice'))));
 await assertFails(getDocs(collection(db,'projects')));await assertFails(getDoc(doc(db,'projects/p2')));
});
test('unpublished previews are not client-readable',async()=>{
 const db=alice();await assertSucceeds(getDocs(query(collection(db,'projects/p1/versions'),where('published','==',true))));
 await assertFails(getDoc(doc(db,'projects/p1/versions/draft')));
});
test('client cannot grant themselves administrator rights or modify project ownership',async()=>{
 const db=alice();await assertFails(updateDoc(doc(db,'projects/p1'),{clientUid:'bob'}));
 await assertFails(setDoc(doc(db,'users/alice'),{admin:true}));
});
test('current-version review is accepted but stale and spoofed approvals are denied',async()=>{
 const db=alice();const review={versionId:'v2',authorUid:'alice',authorName:'alice@example.com',decision:'approved',note:'Looks good',createdAt:serverTimestamp()};
 await assertSucceeds(setDoc(doc(db,'projects/p1/reviews/r1'),review));
 await assertFails(setDoc(doc(db,'projects/p1/reviews/r-stale'),{...review,versionId:'v1'}));
 await assertFails(setDoc(doc(db,'projects/p1/reviews/r-spoof'),{...review,authorUid:'bob'}));
 await assertFails(setDoc(doc(db,'projects/p2/reviews/r-cross'),review));
 await assertFails(updateDoc(doc(db,'projects/p1/reviews/r1'),{decision:'changes_requested'}));
});
test('client cannot publish versions; admin can atomically publish the next version',async()=>{
 const data={label:'v3',description:'New design',previewUrl:'https://example.com/',screenshotUrl:'',published:true,createdAt:serverTimestamp()};
 await assertFails(setDoc(doc(alice(),'projects/p1/versions/unauthorised'),data));
 const db=env.authenticatedContext('owner',{admin:true,email:'owner@example.com'}).firestore();
 const batch=writeBatch(db);batch.set(doc(db,'projects/p1/versions/v3'),data);batch.update(doc(db,'projects/p1'),{currentVersionId:'v3',updatedAt:serverTimestamp()});await assertSucceeds(batch.commit());
 await assertFails(setDoc(doc(alice(),'projects/p1/reviews/r-raced'),{versionId:'v2',authorUid:'alice',authorName:'alice@example.com',decision:'approved',note:'Old',createdAt:serverTimestamp()}));
});
