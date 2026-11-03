'use client';
import {useEffect,useState} from 'react';

const groups=[
 ['joinEnabled','Подключение к серверу',[['joinTitle','Заголовок',120],['joinText','Описание',400]]],
 [null,'Каталог',[['catalogTitle','Заголовок магазина',120]]],
 ['guideEnabled','Как начать играть',[['guideTitle','Заголовок инструкции',120]]],
 ['newsEnabled','Новости',[['newsTitle','Заголовок новостей',120]]],
 ['purchasesEnabled','Свежие покупки',[['purchasesTitle','Заголовок покупок',120]]],
 ['faqEnabled','Частые вопросы',[['faqTitle','Заголовок FAQ',120],['faqText','Описание FAQ',400]]],
 [null,'Подвал сайта',[['footerText','Описание сервера в подвале',400]]],
];
export default function AdminContent({owner=false}) {
 const [form,setForm]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;fetch('/api/admin/content').then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);return d;}).then(d=>{if(live)setForm(d);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[]);
 const change=(key,value)=>{setForm(f=>({...f,[key]:value}));setNotice('');};
 async function save(e){e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/admin/content',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const d=await r.json();if(!r.ok)throw Error(d.error);setForm(d);setNotice('Тексты и секции главной сохранены.');}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(!form)return <p role="status">{error||'Загрузка текстов…'}</p>;
 return <form className="admin-form design-form" onSubmit={save}><p className="admin-notice">Меняй тексты главной и скрывай ненужные секции. В инструкции можно использовать {'{ip}'} и {'{version}'}. Сами вопросы и ответы редактируются в «Настройках сайта».</p><fieldset disabled={!owner||busy}>
 {groups.map(([toggle,title,fields])=><section className="admin-panel settings-section" key={title}><h2>{title}</h2>{toggle&&<label className="checkbox-label"><input type="checkbox" checked={form[toggle]} onChange={e=>change(toggle,e.target.checked)}/>Показывать секцию «{title}»</label>}<div className="form-grid">{fields.map(([key,label,max])=><label key={key}>{label}<textarea aria-label={label} rows={max>120?3:2} required maxLength={max} value={form[key]} onChange={e=>change(key,e.target.value)}/></label>)}</div>{toggle==='guideEnabled'&&form.guideSteps.map((step,i)=><div className="form-grid content-step-edit" key={i}><label>Шаг {i+1}: заголовок<input aria-label={'Шаг '+(i+1)+': заголовок'} required value={step.title} maxLength={100} onChange={e=>change('guideSteps',form.guideSteps.map((v,j)=>i===j?{...v,title:e.target.value}:v))}/></label><label>Шаг {i+1}: текст<textarea aria-label={'Шаг '+(i+1)+': текст'} required value={step.text} rows={3} maxLength={500} onChange={e=>change('guideSteps',form.guideSteps.map((v,j)=>i===j?{...v,text:e.target.value}:v))}/></label></div>)}</section>)}
 </fieldset>{!owner&&<p className="admin-notice">Изменять содержимое главной может владелец.</p>}{error&&<p role="alert" className="form-error">{error}</p>}<div className="settings-save"><button className="button button-orange" disabled={!owner||busy}>{busy?'Сохраняем…':'Сохранить содержимое'}</button>{notice&&<span role="status">{notice}</span>}</div></form>;
}
