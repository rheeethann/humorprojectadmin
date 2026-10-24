'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { resourceFor, validateRecord, type Row } from '@/lib/resources';

async function adminClient() {
 const db=await createClient();
 const {data,error}=await db.rpc('can_access_admin');
 if(error||data!==true) throw new Error('Admin access required');
 return db;
}
const uuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function friendly(error:{code?:string;message:string}) {
 if(error.code==='23503') return 'This record is in use. Remove its references before deleting it.';
 if(error.code==='23505') return 'A record with that value already exists.';
 return error.message;
}
export async function listRecords(key:string,page=0,search='',filter?:{key:string;value:string}) {
 const resource=resourceFor(key); const db=await adminClient();
 const safePage=Math.max(0,Math.min(10000,Math.floor(page)||0));
 let query=db.from(resource.table).select('*',{count:'exact'}).order(resource.order,{ascending:!['created_at'].includes(resource.order)}).order('id').range(safePage*25,safePage*25+24);
 const term=search.trim().slice(0,100).replace(/[%_,()."\\]/g,' ');
 if(term&&resource.search.length) query=query.or(resource.search.map(f=>`${f}.ilike.%${term}%`).join(','));
 if(filter&&['chain_id','request_id','run_id'].includes(filter.key)&&uuid(filter.value)) query=query.eq(filter.key,filter.value);
 const {data,count,error}=await query;
 if(error) throw new Error(friendly(error));
 return {rows:(data??[]) as Row[],count:count??0};
}
export async function getLookups() {
 const db=await adminClient(); const result:Record<string,Row[]>={};
 await Promise.all(['prompt_chains','llm_models','llm_providers'].map(async table => { const {data,error}=await db.from(table).select('*').order('name'); if(error) throw new Error(error.message); result[table]=data??[]; }));
 return result;
}
export async function saveRecord(key:string,id:string|null,input:Record<string,unknown>) {
 try {
  const resource=resourceFor(key); if(!resource.writable) throw new Error('This section is read-only');
  if(id&&!uuid(id)) throw new Error('Invalid record');
  const values=validateRecord(resource,input); const db=await adminClient();
  const result=id?await db.from(resource.table).update(values).eq('id',id).select('id').single():await db.from(resource.table).insert(values).select('id').single();
  if(result.error) throw new Error(friendly(result.error));
  revalidatePath('/'); return {success:'Saved'};
 }catch(error){return {error:error instanceof Error?error.message:'Could not save'};}
}
export async function removeRecord(key:string,id:string) {
 try {
  const resource=resourceFor(key); if(!resource.writable||!uuid(id)) throw new Error('Invalid record'); const db=await adminClient();
  const {error}=await db.from(resource.table).delete().eq('id',id).select('id').single(); if(error) throw new Error(friendly(error));
  revalidatePath('/'); return {success:'Deleted'};
 }catch(error){return {error:error instanceof Error?error.message:'Could not delete'};}
}
export async function saveMix(items:{id:string;enabled:boolean;output_count:number}[]) {
 try {
  const db=await adminClient();
  if(!Array.isArray(items)||items.some(i=>!uuid(i.id)||typeof i.enabled!=='boolean'||!Number.isInteger(i.output_count)||i.output_count<1||i.output_count>3)) throw new Error('Invalid mix');
  const {error}=await db.rpc('save_prompt_mix',{items}); if(error) throw new Error(error.message);
  revalidatePath('/'); return {success:'Mix saved. New requests will use this configuration.'};
 }catch(error){return {error:error instanceof Error?error.message:'Could not save mix'};}
}
export async function recordDetail(key:string,id:string) {
 const resource=resourceFor(key); if(!uuid(id)) throw new Error('Invalid record'); const db=await adminClient();
 const {data,error}=await db.from(resource.table).select('*').eq('id',id).single(); if(error) throw new Error(error.message);
 const links:{label:string;section:string;filter:{key:string;value:string}}[]=[];
 if(key==='chains') links.push({label:'View steps',section:'steps',filter:{key:'chain_id',value:id}},{label:'View executions',section:'runs',filter:{key:'chain_id',value:id}});
 if(key==='requests') links.push({label:'View chain runs',section:'runs',filter:{key:'request_id',value:id}});
 if(key==='runs') links.push({label:'View responses',section:'responses',filter:{key:'run_id',value:id}});
 let imageUrl:string|null=null;
 const path=data.image_path ?? data.input_data?.image_path ?? data.output_data?.result?.image_path;
 if(typeof path==='string') {const signed=await db.storage.from('generated-media').createSignedUrl(path,3600); imageUrl=signed.data?.signedUrl??null;}
 return {row:data as Row,links,imageUrl};
}
