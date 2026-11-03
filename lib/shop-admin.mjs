import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {currentUser} from './auth.mjs';
import {get,list,put,remove,audit,db} from './store.mjs';
import {defaultAppearance,defaultLegal,defaultContent,contentSettings,imageUrl,analytics} from './shop-config.mjs';
const result=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
const str=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
export async function shopAdmin(req,path,readJson) {
 const kind=path[1],id=path[2];
 if(path[0]!=='admin'||!['appearance','legal','content','analytics','campaigns','checkout'].includes(kind))return null;
 const user=currentUser(req);
 if(!user)return result({error:'Требуется вход'},401);
 if(user.role==='support')return result({error:'Недостаточно прав'},403);
 if(kind==='checkout') {
  const state=()=>({testMode:get('settings','checkout')?.testMode===true,testOrders:Number(db().prepare("SELECT COUNT(*) n FROM documents WHERE kind='orders' AND json_extract(value,'$.payment')='test' AND json_extract(value,'$.isTest')=1").get().n)});
  if(req.method==='GET')return result(state());
  if(user.role!=='owner')return result({error:'Тестовый режим доступен только владельцу'},403);
  if(req.method==='PUT') {
   const b=await readJson(req);if(typeof b.testMode!=='boolean')throw Error('Укажите состояние тестового режима');
   put('settings','checkout',{testMode:b.testMode});audit(b.testMode?'Включён тестовый режим':'Выключен тестовый режим',user.login);return result(state());
  }
  if(req.method==='DELETE') {
   const deleted=db().prepare("DELETE FROM documents WHERE kind='orders' AND json_extract(value,'$.payment')='test' AND json_extract(value,'$.isTest')=1").run().changes;
   audit('Очищены тестовые заказы',String(deleted)+' · '+user.login);return result({...state(),deleted:Number(deleted)});
  }
 }
 if(kind==='analytics'&&req.method==='GET') {
  const days=Number(new URL(req.url).searchParams.get('days')||30);
  if(![7,30,90].includes(days))return result({error:'Выберите 7, 30 или 90 дней'},400);
  return result(analytics(list('orders'),days));
 }
 if(kind==='campaigns') {
  if(req.method==='GET')return result({campaigns:list('campaigns')});
  if(req.method==='DELETE'&&id){remove('campaigns',id);audit('Удалена акция',id+' · '+user.login);return result({ok:true});}
  if(req.method==='POST'||req.method==='PUT') {
   const b=await readJson(req);
   if(!str(b.title,100)||!Number.isInteger(b.percent)||b.percent<1||b.percent>95)throw Error('Название и скидка от 1 до 95% обязательны');
   for(const key of ['starts','ends'])if(b[key]&&!Number.isFinite(Date.parse(b[key])))throw Error('Некорректная дата');
   if(b.starts&&b.ends&&Date.parse(b.starts)>=Date.parse(b.ends))throw Error('Окончание должно быть позже начала');
   if(!Array.isArray(b.productIds)||b.productIds.length>100||b.productIds.some(p=>!get('products',p)))throw Error('Выберите существующие товары');
   if(id&&!get('campaigns',id))return result({error:'Акция не найдена'},404);
   const value={id:id||randomUUID(),title:str(b.title,100),description:str(b.description,300),percent:b.percent,productIds:[...new Set(b.productIds)],starts:b.starts||'',ends:b.ends||'',enabled:Boolean(b.enabled)};
   put('campaigns',value.id,value);audit('Сохранена акция',value.title+' · '+user.login);return result(value);
  }
 }
 if(['appearance','legal','content'].includes(kind)) {
  const defaults=kind==='appearance'?defaultAppearance:kind==='content'?defaultContent:defaultLegal;
  if(req.method==='GET')return result({...defaults,...get('settings',kind)});
  if(req.method==='PUT') {
   if(user.role!=='owner')return result({error:'Оформление и юридические сведения меняет владелец'},403);
   const b=await readJson(req);let value;
   if(kind==='appearance') {
    for(const key of ['accent','background','surface'])if(!/^#[a-f0-9]{6}$/i.test(b[key]))throw Error('Укажите цвет в формате #RRGGBB');
    value={accent:b.accent,background:b.background,surface:b.surface,font:['manrope','montserrat'].includes(b.font)?b.font:'manrope',logoUrl:imageUrl(b.logoUrl),faviconUrl:imageUrl(b.faviconUrl),bannerUrl:imageUrl(b.bannerUrl),bannerTitle:str(b.bannerTitle,120),bannerText:str(b.bannerText,400),bannerButton:str(b.bannerButton,40)||'В магазин',bannerEnabled:Boolean(b.bannerEnabled)};
    if(!value.bannerTitle)throw Error('Укажите заголовок баннера');
   } else if(kind==='content')value=contentSettings(b);
   else value={operator:str(b.operator,500),contact:str(b.contact,300),retention:str(b.retention,1500),privacyExtra:str(b.privacyExtra,12000),termsExtra:str(b.termsExtra,12000)};
   put('settings',kind,value);audit('Обновлено '+kind,user.login);return result(value);
  }
 }
 return result({error:'Метод не поддерживается'},405);
}
