export type Row = Record<string, unknown> & { id: string };
export type Field = { key: string; label: string; type?: 'text'|'textarea'|'boolean'|'aliases'|'select'|'number'; required?: boolean; options?: {value:string;label:string}[]; relation?: string };
export type Resource = { key: string; table: string; label: string; description: string; writable?: boolean; fields: Field[]; columns: string[]; search: string[]; order: string };
export const resources: Resource[] = [
 {key:'chains',table:'prompt_chains',label:'Prompt chains',description:'The two ways Reality Check interprets a request. Open a chain to inspect its steps.',fields:[],columns:['name','description'],search:['name','description'],order:'name'},
 {key:'steps',table:'prompt_chain_steps',label:'Chain steps',description:'Ordered prompts, model choices, and input/output types. Definitions are read-only.',fields:[],columns:['name','chain_id','position','model_id','input_type','output_type'],search:['name','system_prompt','user_prompt'],order:'position'},
 {key:'mix',table:'prompt_chain_mix',label:'Prompt chain mix',description:'Choose which chains contribute images to each request. Save the complete mix together.',fields:[],columns:['chain_id','enabled','output_count'],search:[],order:'id'},
 {key:'terms',table:'terms',label:'Terms',description:'Columbia references and college vocabulary. Only matching active entries are supplied to generation.',writable:true,fields:[{key:'term',label:'Term',required:true},{key:'aliases',label:'Aliases (comma separated)',type:'aliases'},{key:'definition',label:'Definition and visual context',type:'textarea',required:true},{key:'example',label:'Usage example',type:'textarea'},{key:'category',label:'Category',required:true},{key:'source',label:'Source / provenance'},{key:'active',label:'Active in generation',type:'boolean'}],columns:['term','definition','category','active'],search:['term','definition','category'],order:'term'},
 {key:'requests',table:'generation_requests',label:'Generation requests',description:'Original requests, preserved configuration, status, and linked generation history.',fields:[],columns:['original_prompt','status','reserved_images','created_at'],search:['original_prompt','status'],order:'created_at'},
 {key:'runs',table:'chain_runs',label:'Chain runs',description:'Individual executions linked to their request, generated image, and model responses.',fields:[],columns:['chain_id','status','created_at','error'],search:['status','error'],order:'created_at'},
 {key:'examples',table:'generation_examples',label:'Generation examples',description:'Authored input/output examples used to guide the context step. Up to three active examples are used per chain.',writable:true,fields:[{key:'title',label:'Title',required:true},{key:'chain_id',label:'Chain (blank means both)',type:'select',relation:'prompt_chains'},{key:'input_text',label:'Example input',type:'textarea',required:true},{key:'output_text',label:'Desired image prompt',type:'textarea',required:true},{key:'explanation',label:'Why this is useful',type:'textarea'},{key:'active',label:'Active in generation',type:'boolean'}],columns:['title','chain_id','input_text','active'],search:['title','input_text','output_text'],order:'created_at'},
 {key:'models',table:'llm_models',label:'LLM models',description:'Model identifiers used by the generation adapters. Referenced models cannot be deleted.',writable:true,fields:[{key:'name',label:'Display name',required:true},{key:'provider_id',label:'Provider',type:'select',relation:'llm_providers',required:true},{key:'model_key',label:'API model identifier',required:true},{key:'kind',label:'Output kind',type:'select',required:true,options:[{value:'text',label:'Text'},{value:'image',label:'Image'}]},{key:'active',label:'Active',type:'boolean'}],columns:['name','provider_id','model_key','kind','active'],search:['name','model_key'],order:'name'},
 {key:'providers',table:'llm_providers',label:'LLM providers',description:'Provider metadata only. API credentials stay in server environment variables.',writable:true,fields:[{key:'name',label:'Name',required:true},{key:'adapter',label:'Supported adapter',type:'select',required:true,options:[{value:'google',label:'Google AI'},{value:'cloudflare',label:'Cloudflare Workers AI'}]},{key:'active',label:'Active',type:'boolean'}],columns:['name','adapter','active'],search:['name','adapter'],order:'name'},
 {key:'responses',table:'llm_responses',label:'LLM responses',description:'Exact prompts, model identifiers, output, timing, and errors. Image binaries remain in private Storage.',fields:[],columns:['model_name','provider_name','status','duration_ms','created_at'],search:['model_name','provider_name','user_prompt','system_prompt','error'],order:'created_at'},
 {key:'domains',table:'allowed_signup_domains',label:'Allowed signup domains',description:'Approved email domains. Admin access additionally requires the superadmin role.',writable:true,fields:[{key:'domain',label:'Domain (for example columbia.edu)',required:true}],columns:['domain','created_at'],search:['domain'],order:'domain'},
 {key:'emails',table:'whitelisted_emails',label:'Whitelisted emails',description:'Individual email exceptions outside the approved domains. Users must still authenticate.',writable:true,fields:[{key:'email',label:'Email address',required:true}],columns:['email','created_at'],search:['email'],order:'email'},
];
export function resourceFor(key: string) { const resource=resources.find(r=>r.key===key); if(!resource) throw new Error('Unknown admin section'); return resource; }
export function validateRecord(resource: Resource, input: Record<string,unknown>) {
 const output: Record<string,unknown> = {};
 for(const field of resource.fields) {
  const raw=input[field.key];
  if(field.type==='boolean') { if(typeof raw!=='boolean') throw new Error(`${field.label} must be enabled or disabled`); output[field.key]=raw; continue; }
  if(field.type==='aliases') {
   const aliases=typeof raw==='string'?raw.split(','):raw;
   if(!Array.isArray(aliases)||aliases.length>20||aliases.some(v=>typeof v!=='string'||v.length>100)) throw new Error('Use up to 20 short aliases');
   output[field.key]=[...new Set(aliases.map(v=>v.trim()).filter(Boolean))]; continue;
  }
  let value=typeof raw==='string'?raw.trim():'';
  if(field.required&&!value) throw new Error(`${field.label} is required`);
  const max=field.type==='textarea'? (field.key==='output_text'?3000:2000): (field.key==='source'?1000:field.key==='model_key'?200:100);
  if(value.length>max) throw new Error(`${field.label} must be ${max} characters or fewer`);
  if(field.options&&!field.options.some(o=>o.value===value)) throw new Error(`Choose a valid ${field.label}`);
  if(field.relation&&value&&!/^[0-9a-f-]{36}$/i.test(value)) throw new Error(`Choose a valid ${field.label}`);
  if(field.key==='domain') { value=value.toLowerCase(); if(!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(value)) throw new Error('Enter a domain without @ or a URL'); }
  if(field.key==='email') { value=value.toLowerCase(); if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Enter a valid email'); }
  output[field.key]=field.relation&&!value?null:value;
 }
 return output;
}
