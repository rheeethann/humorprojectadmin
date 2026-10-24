'use client';
/* eslint-disable @next/next/no-img-element -- Private Storage images use signed URLs. */
import { useEffect, useRef, useState, useTransition } from 'react';
import { getLookups, listRecords, recordDetail, removeRecord, saveMix, saveRecord } from './resource-actions';
import { resourceFor, type Row, type Resource } from '@/lib/resources';

type Filter={key:string;value:string};
type Selection={section:string;filter?:Filter};
type Lookups=Record<string,Row[]>;
const title=(key:string)=>key.replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
function display(value:unknown):string {
 if(value===null||value===undefined||value==='') return '—';
 if(typeof value==='boolean') return value?'Enabled':'Disabled';
 if(typeof value==='object') return JSON.stringify(value,null,2);
 return String(value);
}
function readable(key:string,value:unknown,lookups:Lookups):string {
 const table=({chain_id:'prompt_chains',model_id:'llm_models',provider_id:'llm_providers'} as Record<string,string>)[key];
 if(table) return String(lookups[table]?.find(r=>r.id===value)?.name??value??'All chains');
 if(key==='created_at'||key==='updated_at'||key==='finished_at') return value?new Date(String(value)).toLocaleString():'—';
 return display(value);
}

function Editor({resource,row,lookups,onClose,onSaved}:{resource:Resource;row:Row|null;lookups:Lookups;onClose:()=>void;onSaved:()=>void}) {
 const [error,setError]=useState(''); const [pending,start]=useTransition();
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();},[]);
 function submit(form:FormData) {
  const data:Record<string,unknown>={};
  resource.fields.forEach(f=>{data[f.key]=f.type==='boolean'?form.get(f.key)==='on':String(form.get(f.key)??'');});
  start(async()=>{try {const result=await saveRecord(resource.key,row?.id??null,data); if(result.error)setError(result.error);else onSaved();}catch{setError('Unable to save. Please retry.');}});
 }
 return <dialog ref={dialog} className="record-dialog" onCancel={onClose}>
  <div className="dialog-heading"><div><p className="eyebrow">{resource.label}</p><h2>{row?'Edit record':'New record'}</h2></div><button type="button" className="secondary-button" onClick={onClose}>Close</button></div>
  <form action={submit} className="record-form">
   {resource.fields.map(field=>{
    const options=field.options??(field.relation?(lookups[field.relation]??[]).map(r=>({value:r.id,label:String(r.name)})):[]);
    const initial=row?.[field.key]??(field.key==='category'?'Campus':field.key==='source'?'Admin supplied':'');
    return <label key={field.key} className={field.type==='boolean'?'check-field':'record-field'}><span>{field.label}{field.required?' *':''}</span>
     {field.type==='boolean'?<input type="checkbox" name={field.key} defaultChecked={row?Boolean(initial):true}/>:
      field.type==='textarea'?<textarea name={field.key} defaultValue={String(initial)} rows={4} required={field.required} maxLength={field.key==='output_text'?3000:2000}/>:
      field.type==='select'?<select name={field.key} defaultValue={String(initial)} required={field.required}><option value="">{field.required?'Choose…':'All chains'}</option>{options.map(o=><option value={o.value} key={o.value}>{o.label}</option>)}</select>:
      <input name={field.key} defaultValue={Array.isArray(initial)?initial.join(', '):String(initial)} required={field.required} maxLength={field.type==='aliases'?2000:field.key==='source'?1000:field.key==='model_key'?200:100}/>}
    </label>;
   })}
   {error&&<p className="form-message error" role="alert">{error}</p>}
   <div className="form-footer"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={pending}>{pending?'Saving…':'Save record'}</button></div>
  </form>
 </dialog>;
}
function Detail({section,id,lookups,onClose,onNavigate}:{section:string;id:string;lookups:Lookups;onClose:()=>void;onNavigate:(s:Selection)=>void}) {
 const dialog=useRef<HTMLDialogElement>(null);
 const [detail,setDetail]=useState<Awaited<ReturnType<typeof recordDetail>>|null>(null);const [error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();let live=true;recordDetail(section,id).then(d=>{if(live)setDetail(d);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[section,id]);
 return <dialog ref={dialog} className="record-dialog wide" onCancel={onClose}>
  <div className="dialog-heading"><div><p className="eyebrow">{resourceFor(section).label}</p><h2>Record details</h2><span className="record-id">{id}</span></div><button className="secondary-button" onClick={onClose}>Close</button></div>
  {error?<p role="alert">{error}</p>:!detail?<p role="status">Loading details…</p>:<>
   <div className="detail-links">{detail.links.map(l=><button className="secondary-button" key={l.label} onClick={()=>onNavigate({section:l.section,filter:l.filter})}>{l.label}</button>)}</div>
   {detail.imageUrl&&<img className="detail-image" src={detail.imageUrl} alt="Generated image for this record"/>}
   <dl className="detail-list">{Object.entries(detail.row).map(([key,value])=><div key={key}><dt>{title(key)}</dt><dd>{typeof value==='object'&&value!==null?<details><summary>Inspect {title(key).toLowerCase()}</summary><pre>{display(value)}</pre></details>:<pre>{readable(key,value,lookups)}</pre>}</dd></div>)}</dl>
  </>}
 </dialog>;
}
function Mix({rows,lookups,onSaved}:{rows:Row[];lookups:Lookups;onSaved:()=>void}) {
 const [items,setItems]=useState(rows.map(r=>({id:r.id,chain_id:String(r.chain_id),enabled:Boolean(r.enabled),output_count:Number(r.output_count)})));
 const [notice,setNotice]=useState('');const [pending,start]=useTransition();const total=items.reduce((sum,i)=>sum+(i.enabled?i.output_count:0),0);
 return <div className="mix-editor"><div className="metric-strip"><strong>{total}</strong><span>images per generation request<br/><small>Five image attempts per member per rolling 24 hours.</small></span></div>
 <div className="mix-cards">{items.map((item,index)=><section className="mix-card" key={item.id}><h3>{readable('chain_id',item.chain_id,lookups)}</h3><p>{String(lookups.prompt_chains?.find(c=>c.id===item.chain_id)?.description??'')}</p><div className="mix-controls"><label className="check-field"><input type="checkbox" checked={item.enabled} onChange={e=>setItems(items.map((v,i)=>i===index?{...v,enabled:e.target.checked}:v))}/>Enabled</label><label>Images <select value={item.output_count} onChange={e=>setItems(items.map((v,i)=>i===index?{...v,output_count:Number(e.target.value)}:v))}>{[1,2,3].map(n=><option key={n}>{n}</option>)}</select></label></div></section>)}</div>
 <p className="muted">Changes apply to future requests. Previous requests retain their configuration snapshot.</p>
 {notice&&<p role="status">{notice}</p>}
 <button className="primary-button" disabled={pending||total<1||total>5} onClick={()=>start(async()=>{try{const result=await saveMix(items.map(({id,enabled,output_count})=>({id,enabled,output_count})));setNotice(result.error??result.success??'Saved');if(!result.error)onSaved();}catch{setNotice('Unable to save the mix. Please retry.');}})}>{pending?'Saving…':'Save mix'}</button>
 {(total<1||total>5)&&<p className="form-message error">Enable between one and five images in total.</p>}
 </div>;
}
export default function ResourcePanel({selection,onNavigate}:{selection:Selection;onNavigate:(s:Selection)=>void}) {
 const resource=resourceFor(selection.section);
 const [rows,setRows]=useState<Row[]>([]); const [count,setCount]=useState(0);const [page,setPage]=useState(0);const [search,setSearch]=useState('');const [query,setQuery]=useState('');
 const [lookups,setLookups]=useState<Lookups>({}); const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [revision,setRevision]=useState(0);
 const [editor,setEditor]=useState<Row|null|undefined>(undefined);const [detail,setDetail]=useState<string|null>(null);const [pending,start]=useTransition();
 useEffect(()=>{let live=true;Promise.all([listRecords(selection.section,page,query,selection.filter),getLookups()]).then(([result,lookup])=>{if(live){setRows(result.rows);setCount(result.count);setLookups(lookup);setLoading(false);}}).catch(e=>{if(live){setError(e.message);setLoading(false);}});return()=>{live=false;};},[selection,page,query,revision]);
 function reload(){setLoading(true);setRevision(v=>v+1);setError('');}
 return <section className="resource-panel"><header className="resource-heading"><div><p className="eyebrow">Reality Check · Administration</p><h1>{resource.label}</h1><p>{resource.description}</p></div>{resource.writable&&<button className="primary-button" onClick={()=>setEditor(null)}>+ Add record</button>}</header>
 {resource.key!=='mix'&&<form className="resource-toolbar" onSubmit={e=>{e.preventDefault();setPage(0);setQuery(search);setLoading(true);setRevision(v=>v+1);}}><input aria-label={`Search ${resource.label}`} placeholder={`Search ${resource.label.toLowerCase()}…`} value={search} onChange={e=>setSearch(e.target.value)}/><button className="secondary-button">Search</button><button type="button" className="secondary-button" onClick={reload}>Refresh</button></form>}
 {selection.filter&&<p className="filter-note">Showing linked records <button className="text-button" onClick={()=>onNavigate({section:selection.section})}>Clear filter</button></p>}
 {error&&<p className="form-message error" role="alert">{error}</p>}
 {loading?<p className="empty" role="status">Loading {resource.label.toLowerCase()}…</p>:resource.key==='mix'?<Mix key={revision} rows={rows} lookups={lookups} onSaved={reload}/>:<>
 <p className="result-count">{count} records · page {page+1} of {Math.max(1,Math.ceil(count/25))}</p>
 <div className="table-wrap"><table><thead><tr>{resource.columns.map(c=><th key={c}>{title(c)}</th>)}<th>Actions</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}>{resource.columns.map(c=><td key={c}><span className={c==='status'?'status-badge':'cell-value'}>{readable(c,row[c],lookups)}</span></td>)}<td><div className="row-actions"><button className="text-button" onClick={()=>setDetail(row.id)}>View</button>{resource.writable&&<><button className="text-button" onClick={()=>setEditor(row)}>Edit</button><button className="text-button danger" disabled={pending} onClick={()=>{if(!window.confirm(`Delete ${String(row.term??row.name??row.title??row.email??row.domain??'this record')}? This cannot be undone.`))return;start(async()=>{try{const result=await removeRecord(resource.key,row.id);if(result.error)setError(result.error);else reload();}catch{setError('Unable to delete. Please retry.');}});}}>Delete</button></>}</div></td></tr>)}{!rows.length&&<tr><td colSpan={resource.columns.length+1} className="empty">No records found.{resource.key==='requests'?' Generate images in the app to start collecting history.':''}</td></tr>}</tbody></table></div>
 <div className="pagination"><button className="secondary-button" disabled={page===0} onClick={()=>{setPage(p=>p-1);setLoading(true);}}>Previous</button><button className="secondary-button" disabled={(page+1)*25>=count} onClick={()=>{setPage(p=>p+1);setLoading(true);}}>Next</button></div></>}
 {editor!==undefined&&<Editor resource={resource} row={editor} lookups={lookups} onClose={()=>setEditor(undefined)} onSaved={()=>{setEditor(undefined);reload();}}/>}
 {detail&&<Detail section={resource.key} id={detail} lookups={lookups} onClose={()=>setDetail(null)} onNavigate={onNavigate}/>}
 </section>;
}
