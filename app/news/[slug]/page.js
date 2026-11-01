'use client';
import {useParams} from 'next/navigation';
import {useState,useEffect} from 'react';
import Link from 'next/link';
import SiteFrame from '../../../components/SiteFrame';
import PixelArt from '../../../components/PixelArt';
import Reveal from '../../../components/Reveal';
import Icon from '../../../components/Icons';
export default function Article(){
 const {slug}=useParams();const [article,setArticle]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let cancelled=false;setArticle(null);setError('');fetch('/api/news/'+encodeURIComponent(slug)).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);return d;}).then(d=>{if(!cancelled)setArticle(d);}).catch(e=>{if(!cancelled)setError(e.message);});return()=>{cancelled=true;};},[slug]);
 return <SiteFrame><main className="site-main content-page"><Link className="back-to-news" href="/news"><Icon name="arrow" size={18}/>Все новости</Link>{error?<div className="empty-state"><h1>{error}</h1><Link href="/news">Вернуться к новостям</Link></div>:!article?<div className="empty-state">Загрузка новости…</div>:<Reveal as="article" className="full-article"><div className="article-meta"><span>{article.tag}</span><time dateTime={article.createdAt}>{new Date(article.createdAt).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}</time></div><h1>{article.title}</h1>{article.excerpt&&<p className="article-lead">{article.excerpt}</p>}<div className="article-cover"><PixelArt type={article.art}/><span>GRIEFTOOL</span></div><div className="document-prose">{article.body.split('\n').map((line,i)=><p key={i}>{line||'\u00a0'}</p>)}</div><div className="article-footer"><span>Команда GriefTool</span><Link href="/support">Задать вопрос <Icon name="arrow" size={16}/></Link></div></Reveal>}</main></SiteFrame>;
}
