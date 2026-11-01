'use client';
import {useState,useEffect} from 'react';
import SiteFrame from '../../components/SiteFrame';
import Reveal from '../../components/Reveal';
import NewsGrid from '../../components/NewsGrid';
import Icon from '../../components/Icons';
export default function News(){
 const [articles,setArticles]=useState(null),[error,setError]=useState(''),[filter,setFilter]=useState('Все'),[query,setQuery]=useState('');
 useEffect(()=>{fetch('/api/news').then(r=>{if(!r.ok)throw Error('Не удалось загрузить новости');return r.json();}).then(d=>setArticles(d.articles)).catch(e=>setError(e.message));},[]);
 const tags=['Все',...new Set((articles||[]).map(n=>n.tag))];
 return <SiteFrame><main className="site-main content-page"><Reveal className="page-intro"><span className="breadcrumb">СЕРВЕР / НОВОСТИ</span><h1>Из жизни GriefTool.</h1><p>Анонсы, обновления и всё, что стоит знать перед следующим заходом.</p></Reveal><div className="news-toolbar"><div className="news-tabs">{tags.map(tag=><button className={filter===tag?'active':''} onClick={()=>setFilter(tag)} key={tag}>{tag}</button>)}</div><label className="document-search"><Icon name="search" size={18}/><input aria-label="Поиск новостей" placeholder="Найти новость" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>{error?<div className="form-error" role="alert">{error}</div>:!articles?<div className="empty-state">Загрузка новостей…</div>:<NewsGrid articles={articles.filter(n=>(filter==='Все'||n.tag===filter)&&(n.title+' '+n.excerpt).toLowerCase().includes(query.toLowerCase()))}/>}</main></SiteFrame>;
}
