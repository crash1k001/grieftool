'use client';
import {useRef,useState} from 'react';
import Icon from './Icons';
export default function MediaField({label,value='',onChange}) {
 const ref=useRef(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function upload(e) {
  const file=e.target.files?.[0];if(!file)return;
  setError('');
  if(file.size>5*1024*1024){setError('Выберите файл до 5 МБ');return;}
  setBusy(true);
  try{const r=await fetch('/api/admin/media',{method:'POST',headers:{'Content-Type':file.type},body:file});const d=await r.json();if(!r.ok)throw Error(d.error);onChange(d.url);}
  catch(e){setError(e.message);}finally{setBusy(false);ref.current.value='';}
 }
 return <div className="media-field"><span className="field-label">{label}</span><div className="media-editor">
  <div className="media-preview">{value?<img src={value} alt={label}/>:<Icon name="box" size={30}/>}</div>
  <div><button type="button" className="button button-secondary" disabled={busy} onClick={()=>ref.current.click()}>{busy?'Загрузка…':'Загрузить изображение'}</button>
  {value&&<button type="button" className="text-button" onClick={()=>onChange('')}>Убрать</button>}
  <small>PNG, JPG, WebP или GIF · до 5 МБ</small>
  <input ref={ref} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={upload} aria-label={'Загрузить: '+label}/></div>
 </div><label className="media-url">Или ссылка HTTPS<input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder="https://…" aria-label={'Ссылка: '+label}/></label>{error&&<p role="alert" className="form-error">{error}</p>}</div>;
}
