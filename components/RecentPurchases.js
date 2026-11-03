import PixelArt from './PixelArt';
import Icon from './Icons';
const money=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n/100)+' ₽';
export default function RecentPurchases({purchases=[],title='Свежие покупки'}) {
 const first=purchases[0];
 return <section className="recent-purchases"><div className="section-heading"><h2>{title}</h2><span className="subtle-note">Спасибо каждому, кто поддерживает сервер</span></div>{!first?<div className="purchases-placeholder"><Icon name="gift" size={48}/><div><h3>Здесь скоро появятся покупки</h3><p>Показываем только подтверждённые оплаты. Ники игроков скрываются частично.</p></div></div>:<div className="purchases-layout"><article className="latest-purchase"><span className="purchase-badge">Последняя покупка</span><PixelArt type={first.art} src={first.imageUrl}/><h3>{first.productName} · {money(first.amount)}</h3><p>{first.nickname}</p></article><div className="purchase-feed">{purchases.slice(1).map(p=><article key={p.id}><PixelArt type={p.art} src={p.imageUrl}/><div><h3>{p.productName}</h3><p>{p.nickname} · {money(p.amount)}</p></div><time dateTime={p.paidAt}>{new Date(p.paidAt).toLocaleDateString('ru-RU')}</time></article>)}</div></div>}</section>;
}
