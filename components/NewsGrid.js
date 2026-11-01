import Link from 'next/link';
import Icon from './Icons';
import PixelArt from './PixelArt';
import Reveal from './Reveal';
export default function NewsGrid({articles,compact=false}){
 if(!articles?.length)return <div className="news-empty"><span className="news-empty-icon"><Icon name="rules" size={32}/></span><div><h3>Пока без новостей</h3><p>Объявления, обновления и события сервера появятся здесь.</p></div></div>;
 return <div className={'news-grid '+(compact?'compact-news':'')}>{articles.map((n,i)=><Reveal as="article" className="news-card" key={n.id} delay={i*60}><Link href={'/news/'+n.slug}><div className={'news-cover cover-'+(i%3)}><span>{n.tag}</span><PixelArt type={n.art}/><div className="news-cover-grid"/></div><div className="news-card-content"><time dateTime={n.createdAt}>{new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(n.createdAt))}</time><h3>{n.title}</h3><p>{n.excerpt}</p><span className="news-read">Читать новость <Icon name="arrow" size={17}/></span></div></Link></Reveal>)}</div>;
}
