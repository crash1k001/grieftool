export const defaultAppearance = {
 accent:'#ff8b2c', background:'#0b101a', surface:'#121a29', font:'manrope',
 logoUrl:'', faviconUrl:'', bannerUrl:'', bannerTitle:'Твоя игра.\nТвои правила.',
 bannerText:'Привилегии, ключи и предметы для твоих приключений. Выбирай своё — и залетай на сервер.',
 bannerButton:'В магазин', bannerEnabled:true,
};
export const defaultLegal = {
 operator:'', contact:'', retention:'До 12 месяцев после последнего обращения или исполнения заказа, если закон не требует другого срока.',
 privacyExtra:'', termsExtra:'',
};
export const defaultContent = {
 joinEnabled:true,joinTitle:'Заходи на сервер\nи начинай играть уже сегодня!',joinText:'Твои друзья. Твоя база. Твоя история.',
 catalogTitle:'Выбирай своё.',guideEnabled:true,guideTitle:'До встречи на спавне.',
 guideSteps:[{title:'Запусти Minecraft',text:'Понадобится Java Edition. Поддерживаемая версия: {version}'},{title:'Добавь сервер',text:'В сетевой игре нажми «Добавить сервер» и введи {ip}'},{title:'Заходи и осваивайся',text:'Ознакомься с правилами, найди место для базы и начинай играть.'}],
 newsEnabled:true,newsTitle:'Новости GriefTool',purchasesEnabled:true,purchasesTitle:'Свежие покупки',
 faqEnabled:true,faqTitle:'Частые\nвопросы',faqText:'Подключение, покупки и правила — всё самое важное в одном месте.',
 footerText:'Гриферское выживание в Minecraft.',
};
export function contentSettings(value={}) {
 const result={};
 for(const [key,fallback] of Object.entries(defaultContent)) {
  if(key==='guideSteps')continue;
  if(typeof fallback==='boolean'){if(typeof value[key]!=='boolean')throw Error('Некорректная видимость секции');result[key]=value[key];}
  else {if(typeof value[key]!=='string'||!value[key].trim()||value[key].length>(key.endsWith('Text')?400:120))throw Error('Заполните тексты секций и соблюдайте ограничение длины');result[key]=value[key].trim();}
 }
 if(!Array.isArray(value.guideSteps)||value.guideSteps.length!==3)throw Error('Инструкция состоит из трёх шагов');
 result.guideSteps=value.guideSteps.map(step=>{if(!step||typeof step.title!=='string'||!step.title.trim()||step.title.length>100||typeof step.text!=='string'||!step.text.trim()||step.text.length>500)throw Error('Заполните заголовок и текст каждого шага');return {title:step.title.trim(),text:step.text.trim()};});
 return result;
}
export function imageUrl(value) {
 if(!value)return '';
 if(typeof value!=='string'||value.length>2048)throw Error('Некорректная ссылка на изображение');
 if(/^\/api\/media\/[a-f0-9]{64}\.(png|jpg|gif|webp)$/.test(value)||/^\/images\/[a-zA-Z0-9_./-]+$/.test(value)&&!value.includes('..'))return value;
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password)throw Error('Изображение: файл из медиатеки или HTTPS-ссылка');
 return url.href;
}
export function commands(value) {
 if(value===undefined)return [];
 const lines=Array.isArray(value)?value:typeof value==='string'?value.split('\n'):[null];
 const clean=lines.filter(x=>x!=='').map(x=>typeof x==='string'?x.trim():x);
 if(clean.length>20||clean.some(x=>typeof x!=='string'||!x||x.length>500||/[\r\n\x00-\x1f]/.test(x)||x.startsWith('/')||!/^[-a-zA-Z0-9_:]+(?: |$)/.test(x)))throw Error('До 20 команд, без начального / и переносов внутри команды');
 if(clean.some(x=>/\{(?!player\}|uuid\})/.test(x)))throw Error('Доступны только подстановки {player} и {uuid}');
 return clean;
}
export function activeCampaign(c,now=Date.now()) {
 return c.enabled&&(!c.starts||Date.parse(c.starts)<=now)&&(!c.ends||Date.parse(c.ends)>now);
}
export function offerProduct(product,campaigns,now=Date.now()) {
 if(!product)return null;
 const discount=Math.max(product.discount||0,...campaigns.filter(c=>activeCampaign(c,now)&&(!c.productIds.length||c.productIds.includes(product.id))).map(c=>c.percent));
 return {...product,discount};
}
export function publicProduct(product) {
 const {deliveryCommands,...safe}=product;return safe;
}
export function recentPurchases(orders,products) {
 return orders.filter(o=>o.payment==='paid').sort((a,b)=>(b.paidAt||b.createdAt).localeCompare(a.paidAt||a.createdAt)).slice(0,6).map((o,index)=>{
  const p=products.find(p=>p.id===o.product.id)||o.product;
  return {id:String(index),productName:o.product.name,amount:o.amount,nickname:String(o.nickname).slice(0,2)+'***',paidAt:o.paidAt||o.createdAt,art:p.art||'diamond',imageUrl:p.imageUrl||''};
 });
}
export function analytics(orders,days=30,now=Date.now()) {
 const start=new Date(now);start.setUTCHours(0,0,0,0);start.setUTCDate(start.getUTCDate()-days+1);
 const inPeriod=orders.filter(o=>o.payment!=='test'&&!o.isTest&&Number.isFinite(Date.parse(o.createdAt))&&Date.parse(o.createdAt)>=+start&&Date.parse(o.createdAt)<=now);
 const paid=inPeriod.filter(o=>o.payment==='paid');
 const revenue=paid.reduce((sum,o)=>sum+o.amount,0);
 const series=Array.from({length:days},(_,i)=>{const date=new Date(+start+i*86400000).toISOString().slice(0,10);const rows=paid.filter(o=>o.createdAt.slice(0,10)===date);return {date,revenue:rows.reduce((s,o)=>s+o.amount,0),count:rows.length};});
 const top=Object.values(paid.reduce((result,o)=>{const id=o.product.id;result[id]??={name:o.product.name,count:0,revenue:0};result[id].count++;result[id].revenue+=o.amount;return result;},{})).sort((a,b)=>b.revenue-a.revenue).slice(0,8);
 return {days,revenue,paid:paid.length,orders:inPeriod.length,average:paid.length?Math.round(revenue/paid.length):0,refunded:inPeriod.filter(o=>o.payment==='refunded').reduce((s,o)=>s+o.amount,0),series,top};
}
