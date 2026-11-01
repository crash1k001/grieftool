'use client';
import {useState,useEffect} from 'react';
import SiteFrame from '../../components/SiteFrame';
import Reveal from '../../components/Reveal';
import Icon from '../../components/Icons';
export default function Rules(){
 const [rules,setRules]=useState(null),[error,setError]=useState(''),[search,setSearch]=useState('');
 const load=()=>{setError('');fetch('/api/rules').then(r=>{if(!r.ok)throw Error('Не удалось загрузить правила');return r.json();}).then(d=>setRules(d.sections)).catch(e=>setError(e.message));};
 useEffect(()=>{load();},[]);
 const filtered=(rules||[]).filter(r=>(r.title+' '+r.body).toLowerCase().includes(search.toLowerCase()));
 return <SiteFrame><main className="site-main content-page"><Reveal className="page-intro"><span className="breadcrumb">СЕРВЕР / ПРАВИЛА</span><h1>Играем по правилам.</h1><p>Прочитай перед началом игры. Правила распространяются на всех игроков сервера.</p></Reveal><div className="rules-layout"><aside className="rules-toc"><span className="section-label">РАЗДЕЛЫ</span>{(rules||[]).map((r,i)=><a href={'#rule-'+r.id} key={r.id}><span>{String(i+1).padStart(2,'0')}</span>{r.title}</a>)}<div className="rules-help"><Icon name="help" size={24}/><b>Нужно уточнение?</b><p>Поддержка поможет разобраться в правилах.</p><a href="/support">Задать вопрос <Icon name="arrow" size={16}/></a></div></aside><div><label className="document-search"><Icon name="search" size={20}/><input aria-label="Поиск по правилам" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Найти в правилах"/></label>{error?<div className="form-error" role="alert">{error}<button onClick={load}>Повторить</button></div>:!rules?<div className="empty-state">Загрузка правил…</div>:filtered.length?filtered.map((r,i)=><Reveal key={r.id} className="rule-section" id={'rule-'+r.id}><div className="rule-heading"><span>{String(i+1).padStart(2,'0')}</span><h2>{r.title}</h2></div><div className="document-prose">{r.body.split('\n').map((line,j)=><p key={j}>{line||'\u00a0'}</p>)}</div></Reveal>):<div className="news-empty"><Icon name="rules" size={30}/><p>{search?'По запросу ничего не найдено':'Правила ещё не опубликованы администрацией.'}</p></div>}</div></div></main></SiteFrame>;
}
