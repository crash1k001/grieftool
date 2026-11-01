export const categories = [ {id:'ranks',name:'Привилегии',icon:'crown'}, {id:'currency',name:'Монеты',icon:'coin'}, {id:'keys',name:'Ключи',icon:'key'}, {id:'items',name:'Предметы',icon:'sword'}, {id:'other',name:'Другое',icon:'flame'} ];
export const seedProducts = [
 {id:'scout',name:'SCOUT',category:'ranks',price:4900,color:'#88d780',art:'emerald',tag:'ПЕРВЫЙ ШАГ',description:'Начни свой путь с дополнительными возможностями. Пример комплектации: /hat, 2 точки дома и набор Scout.'},
 {id:'hero',name:'HERO',category:'ranks',price:9900,color:'#6bc9f6',art:'diamond',tag:'',description:'Больше свободы для твоей игры. Пример комплектации: 4 точки дома, набор Hero и цветной префикс.'},
 {id:'legend',name:'LEGEND',category:'ranks',price:24900,color:'#bca0ff',art:'amethyst',tag:'ВЫБОР ИГРОКОВ',description:'Оставь свой след в истории сервера. Пример комплектации: набор Legend, 6 точек дома и особый префикс.'},
 {id:'overlord',name:'OVERLORD',category:'ranks',price:49900,color:'#ffae5b',art:'crown',tag:'МАКСИМУМ ВОЗМОЖНОСТЕЙ',description:'Твой мир — твои правила. Пример комплектации: эксклюзивный набор, расширенные лимиты и префикс Overlord.'},
 {id:'coins-500',name:'500 монет',category:'currency',price:50000,color:'#ffba54',art:'coin',tag:'',description:'Игровая валюта для внутриигрового магазина. 500 монет на твой баланс.'},
 {id:'key',name:'Ключ удачи',category:'keys',price:7900,color:'#e9b75c',art:'key',tag:'',description:'Один ключ к игровому кейсу. Состав и шансы указываются на сервере до открытия.'},
 {id:'pickaxe',name:'Кирка шахтёра',category:'items',price:12900,color:'#9ed9e9',art:'pickaxe',tag:'',description:'Особый инструмент для твоих приключений. Характеристики уточняются администрацией перед включением продаж.'},
 {id:'unban',name:'Заявка на разбан',category:'other',price:19900,color:'#f18e7b',art:'shield',tag:'',description:'Рассмотрение заявки администрацией. Условия должны быть опубликованы перед включением продаж.'}
].map(p=>({...p,enabled:true,discount:0,duration:p.category==='ranks'?'30 дней':'Разовая покупка'}));
export function quote(product, promo, now=Date.now()) {
 if (!product?.enabled) throw new Error('Товар недоступен');
 let amount=Math.round(product.price*(100-product.discount)/100);
 let promoApplied=false;
 if(promo) {
  if(!promo.enabled || (promo.starts && Date.parse(promo.starts)>now) || (promo.ends && Date.parse(promo.ends)<now) || (promo.limit>0 && promo.used>=promo.limit) || amount<promo.minimum) throw new Error('Промокод недействителен или его условия не выполнены');
  amount=Math.round(amount*(100-promo.percent)/100); promoApplied=true;
 }
 return {amount:Math.max(0,amount),original:product.price,promoApplied};
}
