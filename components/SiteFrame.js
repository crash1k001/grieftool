'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState,useRef} from 'react';
import Icon from './Icons';
import Season from './Season';
import Brand from './Brand';
import {defaultAppearance,defaultContent} from '../lib/shop-config.mjs';

export default function SiteFrame({children,settings}) {
 const [loaded,setLoaded]=useState(null),[menu,setMenu]=useState(false),[notice,setNotice]=useState('');
 const progress=useRef(null),pathname=usePathname();
 const s=settings||loaded||{name:'GriefTool',ip:'mc.GriefTool.fun',version:'Java Edition'};
 const a={...defaultAppearance,...s.appearance},content={...defaultContent,...s.content};
 useEffect(()=>{if(!settings)fetch('/api/store').then(r=>r.json()).then(d=>setLoaded(d.settings)).catch(()=>{});},[settings]);
 useEffect(()=>{setMenu(false);},[pathname]);
 useEffect(()=>{let frame;const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const length=document.documentElement.scrollHeight-innerHeight;progress.current?.style.setProperty('transform','scaleX('+(length>0?scrollY/length:0)+')');});};addEventListener('scroll',update,{passive:true});update();return()=>{removeEventListener('scroll',update);cancelAnimationFrame(frame);};},[]);
 useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(''),3000);return()=>clearTimeout(id);},[notice]);
 async function copy(){try{await navigator.clipboard.writeText(s.ip);setNotice('Адрес сервера скопирован');}catch{setNotice('Адрес сервера: '+s.ip);}}
 const links=[['/main','Главная'],['/main#shop','Магазин'],['/news','Новости'],['/rules','Правила']];
 return <div className="site-v2" style={{'--brand':a.accent,'--shop-bg':a.background,'--shop-surface':a.surface,'--shop-font':a.font==='montserrat'?'Montserrat':'Manrope'}}>
  <Season/>
  <header className="site-header"><div className="header-inner">
   <Link href="/main" className="brand"><Brand settings={s}/></Link>
   <nav className={'public-nav '+(menu?'nav-open':'')} aria-label="Основная навигация">{links.map(([href,label])=><Link key={href} className={pathname===href?'selected':''} href={href}>{label}</Link>)}</nav>
   <button className="nav-ip" onClick={copy}><span>ПОДКЛЮЧАЙСЯ</span><b>{s.ip}</b><Icon name="copy" size={20}/></button>
   <button className="icon-button mobile-menu-button" onClick={()=>setMenu(!menu)} aria-expanded={menu} aria-label="Открыть меню"><Icon name={menu?'close':'menu'}/></button>
  </div><div className="reading-progress" ref={progress}/></header>
  {children}
  <footer className="footer"><div className="footer-top">
   <div className="footer-brand"><Link href="/main" className="brand"><Brand settings={s} small/></Link><p>{content.footerText}<br/>{s.ip}</p></div>
   <div><h3>Сервер</h3><Link href="/main#shop">Магазин</Link><Link href="/rules">Правила сервера</Link><Link href="/news">Новости и обновления</Link></div>
   <div><h3>Информация</h3><Link href="/main#how-to-play">Как начать играть</Link><Link href="/privacy">Политика конфиденциальности</Link><Link href="/terms">Условия покупки</Link></div>
   <div className="footer-connect"><h3>Наши площадки</h3>{s.telegram&&<a href={s.telegram} target="_blank" rel="noreferrer"><Icon name="telegram"/>Telegram</a>}{s.discord&&<a href={s.discord} target="_blank" rel="noreferrer"><Icon name="discord"/>Discord</a>}<button className="footer-ip" onClick={copy}>{s.ip}<Icon name="copy"/></button></div>
  </div><div className="footer-bottom"><span>© {new Date().getFullYear()} {s.name}</span><span>Не является официальным продуктом Minecraft. Не связан с Mojang и Microsoft.</span><a href="#" aria-label="Наверх"><Icon name="arrow" size={22}/></a></div></footer>
  {notice&&<div className="toast" role="status"><Icon name="check" size={20}/>{notice}</div>}
 </div>;
}
