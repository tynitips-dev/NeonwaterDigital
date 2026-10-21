import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, getIdTokenResult } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, query, where, addDoc, serverTimestamp, writeBatch, runTransaction } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { assertSeparateProject, secureUrl, reviewInput } from './domain.ts';
export type Project = { id: string; title: string; clientUid: string; clientName: string; summary: string; currentVersionId: string; createdAt?: any };
export type Version = { id: string; label: string; description: string; previewUrl: string; screenshotUrl: string; published: boolean; createdAt?: any };
export type Review = { id: string; authorUid: string; authorName: string; versionId: string; decision: string; note: string; createdAt?: any };
const env=import.meta.env;
const config={apiKey:env.VITE_FIREBASE_API_KEY,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,projectId:env.VITE_FIREBASE_PROJECT_ID,appId:env.VITE_FIREBASE_APP_ID};
export let configurationError='';
let complete=Object.values(config).every(Boolean);
if(complete){try{assertSeparateProject(config.projectId!);}catch(error){configurationError=(error as Error).message;complete=false;}}
export const configured=complete;
const app=configured?initializeApp(config):null;
const auth=app?getAuth(app):null;
const db=app?getFirestore(app):null;
export function watchAuth(callback: (user: User|null)=>void){return auth?onAuthStateChanged(auth,callback):()=>{};}
export async function isAdmin(user:User){return (await getIdTokenResult(user,true)).claims.admin===true;}
export async function login(email:string,password:string){if(!auth)throw new Error('Firebase is not connected yet.');return signInWithEmailAndPassword(auth,email,password);}
export async function logout(){if(auth)await signOut(auth);}
export async function reset(email:string){if(!auth)throw new Error('Firebase is not connected yet.');await sendPasswordResetEmail(auth,email);}
export async function password(value:string){if(!auth?.currentUser)throw new Error('Sign in first.');await updatePassword(auth.currentUser,value);}
export async function projects(user:User,admin:boolean):Promise<Project[]>{
  const ref=collection(db!,'projects');const snap=await getDocs(admin?ref:query(ref,where('clientUid','==',user.uid)));
  return snap.docs.map(d=>({id:d.id,...d.data()} as Project)).sort((a,b)=>a.title.localeCompare(b.title));
}
export async function versions(projectId:string,admin:boolean):Promise<Version[]>{
  const ref=collection(db!,'projects',projectId,'versions');
  const snap=await getDocs(admin?ref:query(ref,where('published','==',true)));
  return snap.docs.map(d=>({id:d.id,...d.data()} as Version)).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
}
export async function reviews(projectId:string):Promise<Review[]>{
  const snap=await getDocs(collection(db!,'projects',projectId,'reviews'));
  return snap.docs.map(d=>({id:d.id,...d.data()} as Review)).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
}
export async function createProject(data:{title:string;clientUid:string;clientName:string;summary:string}){
  await addDoc(collection(db!,'projects'),{...data,currentVersionId:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
}
export async function publishVersion(projectId:string,data:{label:string;description:string;previewUrl:string;screenshotUrl:string}){
  const ref=doc(collection(db!,'projects',projectId,'versions'));
  const batch=writeBatch(db!);
  batch.set(ref,{...data,previewUrl:secureUrl(data.previewUrl),screenshotUrl:data.screenshotUrl?secureUrl(data.screenshotUrl):'',published:true,createdAt:serverTimestamp()});
  batch.update(doc(db!,'projects',projectId),{currentVersionId:ref.id,updatedAt:serverTimestamp()});
  await batch.commit();
}
export async function submitReview(project:Project,version:Version,user:User,decision:string,note:string){
  const data=reviewInput(project.currentVersionId,version.id,decision,note);
  const ref=doc(collection(db!,'projects',project.id,'reviews'));
  await runTransaction(db!,async transaction=>{
    const fresh=await transaction.get(doc(db!,'projects',project.id));
    if(!fresh.exists()||fresh.data().currentVersionId!==version.id)throw new Error('A newer version is ready. Refresh the project before reviewing.');
    transaction.set(ref,{...data,versionId:version.id,authorUid:user.uid,authorName:user.email||'Client',createdAt:serverTimestamp()});
  });
}
