import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {db,get,put,list,audit} from './store.mjs';
import {currentUser,rateLimit} from './auth.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(error,status=400)=>json({error},status);
export const spots=['main-top','main-bottom','rules-top','rules-bottom','news-top','news-bottom'];
export function season(){return get('season','settings')||{theme:'none',campaign:'halloween-2026'};}
function transaction(fn){db().exec('BEGIN IMMEDIATE');try{const result=fn();db().exec('COMMIT');return result;}catch(e){db().exec('ROLLBACK');throw e;}}
function bridgeAllowed(req){const key=process.env.BRIDGE_TOKEN||'',provided=(req.headers.get('authorization')||'').replace(/^Bearer /,'');return key.length>=32&&timingSafeEqual(Buffer.from(hash(key)),Buffer.from(hash(provided)));}
export async function eventRoute(req,path,readJson){
 const route=path.join('/'),method=req.method;
 if(route.startsWith('bridge/')){
  if(!bridgeAllowed(req))return fail('Неверный ключ подключения',401);
  if(method!=='POST')return fail('Метод не поддерживается',405);
  const b=await readJson(req);
  if(route==='bridge/heartbeat'){
   put('bridge','status',{lastSeen:Date.now(),version:String(b.version||'').slice(0,40),online:Number.isSafeInteger(b.online)?Math.max(0,b.online):0});return json({ok:true});
  }
  if(route==='bridge/redeem'){
   if(!/^[A-Za-z0-9_]{3,16}$/.test(b.nickname||'')||! /^[a-f0-9-]{36}$/i.test(b.uuid||'')||! /^[a-f0-9]{32}$/i.test(b.code||''))return fail('Неверные данные игрока');
   return transaction(()=>{
    const proof=get('eventCodes',hash(b.code));
    if(!proof||proof.expires<Date.now()||proof.nickname!==b.nickname.toLowerCase())return fail('Код недействителен, истёк или выдан другому нику');
    const cfg=season();if(cfg.theme!=='halloween'||proof.campaign!==cfg.campaign)return fail('Акция завершена');
    if(!Array.isArray(b.availableCampaigns)||!b.availableCampaigns.includes(cfg.campaign))return fail('Награда ещё не настроена в плагине. Обратитесь к администрации.');
    const id=hash(proof.campaign+':'+proof.nickname),uuidId=hash(proof.campaign+':'+b.uuid.toLowerCase());
    if(get('rewards',id)||get('rewardUuids',uuidId))return fail('Приз за эту акцию уже получен или находится на проверке',409);
    const reward={id,campaign:proof.campaign,nickname:b.nickname,uuid:b.uuid.toLowerCase(),status:'reserved',createdAt:new Date().toISOString()};
    put('rewards',id,reward);put('rewardUuids',uuidId,{id});audit('Приз зарезервирован',b.nickname);return json(reward);
   });
  }
  if(route==='bridge/ack'){
   if(!['delivered','review'].includes(b.status))return fail('Неверный статус');
   const item=get('rewards',String(b.id));if(!item)return fail('Награда не найдена',404);
   if(item.status==='reserved'){put('rewards',item.id,{...item,status:b.status,updatedAt:new Date().toISOString()});audit('Результат выдачи приза',item.nickname+': '+b.status);}return json({ok:true});
  }
  return fail('Не найдено',404);
 }
 if(route==='admin/events'){
  const user=currentUser(req);if(!user)return fail('Требуется вход',401);if(user.role==='support')return fail('Недостаточно прав',403);
  if(method==='GET')return json({settings:season(),bridge:{...get('bridge','status'),configured:(process.env.BRIDGE_TOKEN||'').length>=32},rewards:list('rewards').reverse().slice(0,200)});
  if(method==='PUT'){
   const b=await readJson(req);if(!['none','snow','rain','halloween'].includes(b.theme)||! /^[a-z0-9_-]{3,48}$/.test(b.campaign||''))return fail('Проверьте тему и идентификатор акции');
   const value={theme:b.theme,campaign:b.campaign};put('season','settings',value);audit('Сезонное оформление',value.theme+' / '+value.campaign);return json(value);
  }
 }
 if(route==='events'&&method==='GET')return json({...season(),total:spots.length});
 if(!route.startsWith('events/'))return null;
 if(method!=='POST')return fail('Метод не поддерживается',405);
 if(!rateLimit('event-requests',600,60000))return fail('Слишком много запросов, попробуйте через минуту',429);
 const cfg=season();if(cfg.theme!=='halloween')return fail('Охота за тыквами сейчас выключена');
 const b=await readJson(req);
 if(route==='events/start'){
  // Keep abandoned browser sessions bounded and expire collection proofs after 24 hours.
  db().prepare("DELETE FROM documents WHERE kind IN ('hunts','eventCodes') AND json_extract(value,'$.expires') < ?").run(Date.now());
  const old=typeof b.token==='string'?get('hunts',hash(b.token)):null;
  if(old&&old.expires>Date.now()&&old.campaign===cfg.campaign)return json({token:b.token,collected:old.collected});
  if(!rateLimit('event-start',200,60000))return fail('Попробуйте начать чуть позже',429);
  const token=randomBytes(24).toString('hex');put('hunts',hash(token),{campaign:cfg.campaign,collected:[],expires:Date.now()+86400000});return json({token,collected:[]});
 }
 const key=hash(typeof b.token==='string'?b.token:''),hunt=get('hunts',key);
 if(!hunt||hunt.expires<Date.now()||hunt.campaign!==cfg.campaign)return fail('Начните сбор заново');
 if(route==='events/collect'){
  if(!spots.includes(b.spot))return fail('Тыква не найдена');
  const collected=[...new Set([...hunt.collected,b.spot])];put('hunts',key,{...hunt,collected});return json({collected});
 }
 if(route==='events/claim'){
  if(hunt.collected.length!==spots.length)return fail('Сначала соберите все тыквы');
  if(!/^[A-Za-z0-9_]{3,16}$/.test(b.nickname||''))return fail('Ник: 3–16 латинских букв, цифр или _');
  const nickname=b.nickname.toLowerCase();
  if(get('rewards',hash(cfg.campaign+':'+nickname)))return fail('Этот ник уже участвовал в выдаче приза',409);
  if(!rateLimit('event-code:'+key,5,60000))return fail('Подождите минуту перед новым кодом',429);
  const code=randomBytes(16).toString('hex');put('eventCodes',hash(code),{nickname,campaign:cfg.campaign,expires:Date.now()+900000});return json({command:'/gtclaim '+code,expiresIn:900});
 }
 return fail('Не найдено',404);
}
