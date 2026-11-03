import {ordersCsv} from '../../../lib/export.mjs';
import {readBody,requestBudget,safeError} from '../../../lib/security.mjs';
import {recentPurchases} from '../../../lib/shop-config.mjs';
import {mediaRoute} from '../../../lib/media.mjs';
import {shopAdmin} from '../../../lib/shop-admin.mjs';
import {defaultAppearance,defaultLegal,defaultContent,commands,imageUrl,offerProduct,publicProduct,activeCampaign} from '../../../lib/shop-config.mjs';
import {eventRoute} from '../../../lib/events.mjs';
import {communityRoute} from '../../../lib/community.mjs';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { db, get, list, put, remove, audit, latestPaidOrders } from '../../../lib/store.mjs';
import { authenticate, createSession, logout, rateLimit, currentUser } from '../../../lib/auth.mjs';
import { quote } from '../../../lib/catalog.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const response=(value,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
const text=(v,max=300)=>typeof v==='string'?v.trim().slice(0,max):'';
const fail=(message,status=400)=>response({error:message},status);
function integer(v,min,max){if(!Number.isSafeInteger(v)||v<min||v>max)throw new Error('Недопустимое числовое значение');return v;}
function link(v){if(!v)return '';const url=new URL(v);if(url.protocol!=='https:')throw new Error('Ссылки должны начинаться с https://');return url.href;}
async function readJson(req){
 const value=JSON.parse((await readBody(req)).toString('utf8'));
 if(!value||typeof value!=='object'||Array.isArray(value))throw new SyntaxError();
 return value;
}
async function handler(req,context){
 const {path}=await context.params;const route=path.join('/');const method=req.method;
 try{
  if(!requestBudget(req))return response({error:'Слишком много запросов. Повторите через минуту.'},429);
  if(path[0]==='support'||path[0]==='admin'&&path[1]==='tickets')return fail('Раздел поддержки отключён',410);
  const media=await mediaRoute(req,path);if(media)return media;
  if(route==='health' && method==='GET'){db().prepare('SELECT 1').get();return response({ok:true});}
  if(route==='store' && method==='GET'){
   const products=list('products'),campaigns=list('campaigns');
   return response({settings:{...get('settings','site'),content:{...defaultContent,...get('settings','content')},appearance:{...defaultAppearance,...get('settings','appearance')}},categories:list('categories'),products:products.filter(p=>p.enabled).map(p=>publicProduct(offerProduct(p,campaigns))),campaigns:campaigns.filter(c=>activeCampaign(c)).map(({id,title,description,percent})=>({id,title,description,percent})),purchases:recentPurchases(latestPaidOrders(),products),testMode:get('settings','checkout')?.testMode===true,paymentsEnabled:false});
  }
  if(method!=='GET'&&!route.startsWith('bridge/')){
   const origin=req.headers.get('origin');const expected=process.env.APP_ORIGIN || new URL(req.url).origin;
   if(!origin || origin!==expected)return fail('Недопустимый источник запроса',403);
   if(Number(req.headers.get('content-length')||0)>262144)return fail('Запрос слишком большой',413);
  }
  if(route==='legal'&&method==='GET')return response({...defaultLegal,...get('settings','legal')});
  const management=await shopAdmin(req,path,readJson);if(management)return management;
  const event=await eventRoute(req,path,readJson);if(event)return event;
  const community=await communityRoute(req,path,readJson);if(community)return community;
  if(route==='auth' && method==='GET'){const user=currentUser(req);return response({authenticated:Boolean(user),user});}
  if(route==='auth' && method==='POST'){
   // Global quota works even behind a proxy that does not overwrite client IP headers.
   if(!rateLimit('login',20))return fail('Слишком много попыток. Повторите через 15 минут.',429);
   const body=await readJson(req);if(typeof body.password!=='string'||body.password.length>256)return fail('Некорректный пароль');
   if(typeof body.login!=='string'||body.login.length>40)return fail('Введите логин');
   const user=authenticate(body.login,body.password);if(!user)return fail('Неверный логин или пароль',401);
   const res=response({ok:true,user});res.cookies.set('gt_session',createSession(user.id),{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:8*3600});audit('Вход сотрудника',user.login);return res;
  }
  if(route==='auth' && method==='DELETE'){logout(req);const res=response({ok:true});res.cookies.set('gt_session','',{path:'/',maxAge:0});return res;}
  if(route==='quote' && method==='POST'){
   if(!rateLimit('quotes',120,60000))return fail('Слишком много запросов',429);
   const body=await readJson(req);const code=text(body.promo,40).toUpperCase();const promo=code?get('promos',code):null;
   if(code&&!promo)return fail('Промокод не найден');const price=quote(offerProduct(get('products',text(body.productId,80)),list('campaigns')),promo),testMode=get('settings','checkout')?.testMode===true;return response({...price,amount:testMode?0:price.amount,quotedAmount:price.amount,testMode});
  }
  if(route==='orders' && method==='POST'){
   if(!rateLimit('orders',30,60000))return fail('Слишком много запросов',429);
   const body=await readJson(req);if(typeof body.nickname!=='string'||!/^[A-Za-z0-9_]{3,16}$/.test(body.nickname))return fail('Ник: 3–16 латинских букв, цифр или символов _');
   if(body.accepted!==true)return fail('Подтвердите, что ознакомились с условиями');
   const code=text(body.promo,40).toUpperCase(),promo=code?get('promos',code):null;if(code&&!promo)return fail('Промокод не найден');
   const product=offerProduct(get('products',text(body.productId,80)),list('campaigns')),price=quote(product,promo);
   const testMode=get('settings','checkout')?.testMode===true;
   if(testMode!==(body.testMode===true))return fail('Режим магазина изменился. Обнови страницу и попробуй снова.',409);
   const id=randomUUID();const order={id,nickname:body.nickname,product:{id:product.id,name:product.name,duration:product.duration},amount:testMode?0:price.amount,quotedAmount:price.amount,isTest:testMode,promo:code,payment:testMode?'test':'unavailable',delivery:'not_started',createdAt:new Date().toISOString()};put('orders',id,order);audit(testMode?'Создан тестовый заказ':'Создан заказ',id);
   return response({id,amount:order.amount,payment:order.payment,message:testMode?'Тестовая покупка оформлена бесплатно. Деньги не списаны. Выдача в Minecraft пока не подключена.':'Заказ сохранён. Оплата и выдача пока не подключены. Деньги не списаны.'},201);
  }
  if(!route.startsWith('admin/'))return fail('Не найдено',404);
  const user=currentUser(req);if(!user)return fail('Требуется вход',401);
  if(user.role==='support'){if(route==='admin/overview'&&method==='GET')return response({products:[],categories:[],promos:[],orders:[],settings:null,audit:[]});return fail('Недостаточно прав',403);}
  const kind=path[1],id=path[2];
  if(kind==='export'&&id==='orders'&&method==='GET') {
   const params=new URL(req.url).searchParams,status=params.get('status')||'all',q=(params.get('q')||'').slice(0,120).toLowerCase();
   if(!['all','paid','unavailable','test','refunded'].includes(status))return fail('Некорректный фильтр');
   const rows=list('orders').filter(o=>(status==='all'||o.payment===status)&&(!q||o.nickname.toLowerCase().includes(q)||o.id.toLowerCase().includes(q))).reverse();
   audit('Экспорт заказов',String(rows.length)+' · '+user.login);
   return new Response(ordersCsv(rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="orders-'+new Date().toISOString().slice(0,10)+'.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  if(kind==='products'&&id==='bulk'&&method==='PUT') {
   const b=await readJson(req);
   if(!Array.isArray(b.ids)||!b.ids.length||b.ids.length>100||b.ids.some(id=>typeof id!=='string')||typeof b.enabled!=='boolean')return fail('Выберите от 1 до 100 товаров и их видимость');
   const products=[...new Set(b.ids)].map(id=>get('products',id));if(products.some(p=>!p))return fail('Один из товаров уже удалён',409);
   db().exec('BEGIN');try{for(const p of products)put('products',p.id,{...p,enabled:b.enabled});audit(b.enabled?'Товары опубликованы':'Товары скрыты',String(products.length)+' · '+user.login);db().exec('COMMIT');}catch(error){db().exec('ROLLBACK');throw error;}
   return response({updated:products.length});
  }
  if(kind==='overview'&&method==='GET')return response({products:list('products'),categories:list('categories'),promos:list('promos'),orders:list('orders').reverse(),settings:{...get('settings','site'),appearance:{...defaultAppearance,...get('settings','appearance')}},audit:list('audit').slice(-100).reverse()});
  if(kind==='settings'&&method==='PUT'){
   const b=await readJson(req);const current=get('settings','site');const settings={...current,name:text(b.name,40),ip:text(b.ip,100),version:text(b.version,80),headline:text(b.headline,120),announcement:text(b.announcement,100),telegram:link(b.telegram),discord:link(b.discord),support:link(b.support),rules:text(b.rules,8000),faq:Array.isArray(b.faq)?b.faq.slice(0,20).filter(f=>f&&typeof f==='object').map(f=>({q:text(f.q,200),a:text(f.a,2000)})):current.faq};
   if(!settings.name||!settings.ip||!settings.headline)throw new Error('Название, IP и заголовок обязательны');put('settings','site',settings);audit('Настройки сайта','Обновлены');return response(settings);
  }
  if(!['products','categories','promos'].includes(kind))return fail('Не найдено',404);
  if(method==='DELETE'&&id){
   if(kind==='categories'&&list('products').some(p=>p.category===id))return fail('Сначала перенесите товары из этой категории');
   remove(kind,id);audit('Удаление '+kind,id);return response({ok:true});
  }
  if(method==='POST'||method==='PUT'){
   const b=await readJson(req);let item;
   if(kind==='products'){
    if(user.role!=='owner'&&JSON.stringify(commands(b.deliveryCommands))!==JSON.stringify(get('products',id)?.deliveryCommands||[]))return fail('Команды выдачи изменяет владелец',403);
    if(!get('categories',b.category))throw new Error('Выберите категорию');
    item={id:id||randomUUID(),name:text(b.name,60),description:text(b.description,2000),category:b.category,price:integer(b.price,100,100000000),discount:integer(b.discount??0,0,95),enabled:Boolean(b.enabled),duration:text(b.duration,80),art:['emerald','diamond','amethyst','crown','coin','key','pickaxe','shield'].includes(b.art)?b.art:'diamond',color:/^#[a-f0-9]{6}$/i.test(b.color)?b.color:'#ff9a48',tag:text(b.tag,50),imageUrl:imageUrl(b.imageUrl),deliveryCommands:commands(b.deliveryCommands)};
   }else if(kind==='categories'){item={id:id||randomUUID(),name:text(b.name,60),icon:['crown','coin','key','sword','flame'].includes(b.icon)?b.icon:'crown'};}
   else{
    const code=text(b.code,40).toUpperCase();if(!/^[A-Z0-9_-]{2,40}$/.test(code))throw new Error('Промокод: 2–40 латинских букв, цифр, _ или -');
    for(const key of ['starts','ends'])if(b[key]&&!Number.isFinite(Date.parse(b[key])))throw new Error('Некорректная дата');
    if(b.starts&&b.ends&&Date.parse(b.starts)>Date.parse(b.ends))throw new Error('Дата окончания раньше начала');
    item={id:code,code,percent:integer(b.percent,1,95),minimum:integer(b.minimum||0,0,100000000),limit:integer(b.limit||0,0,1000000),used:get('promos',code)?.used||0,enabled:Boolean(b.enabled),starts:b.starts||'',ends:b.ends||''};
   }
   if(kind!=='promos'&&!item.name)throw new Error('Введите название');put(kind,item.id,item);audit('Сохранение '+kind,item.name||item.code);return response(item);
  }
  return fail('Метод не поддерживается',405);
 }catch(e){const error=safeError(e);if(error.status>=500)console.error('[api] Request failed');return fail(error.message,error.status);}
}
export {handler as GET,handler as POST,handler as PUT,handler as DELETE};
