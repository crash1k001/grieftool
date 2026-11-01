import {NextResponse} from 'next/server';
import {randomUUID,randomBytes} from 'node:crypto';
import {get,list,put,remove,db,audit} from './store.mjs';
import {currentUser,publicUser,saveUser,tokenHash,rateLimit} from './auth.mjs';

const result=(value,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
const fail=(error,status=400)=>result({error},status);
const str=(value,max=2000)=>typeof value==='string'?value.trim().slice(0,max):'';
export const safeTicket=ticket=>{const {accessHash,...safe}=ticket;return {...safe,messages:safe.messages.map(({staffId,...message})=>message)};};
const publishedNews=()=>list('news').filter(n=>n.published).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
const rules=()=>list('rules').filter(r=>r.enabled).sort((a,b)=>a.position-b.position);

export async function communityRoute(req,path,readJson){
  const route=path.join('/'),method=req.method;
  if(route==='rules'&&method==='GET')return result({sections:rules()});
  if(path[0]==='news'&&method==='GET'){
    const all=publishedNews();
    if(path[1]){const article=all.find(n=>n.slug===path[1]);return article?result(article):fail('Новость не найдена',404);}
    return result({articles:all.map(({body,...item})=>item)});
  }
  if(path[0]==='support'&&path[1]==='tickets'){
    const id=path[2];
    if(!id&&method==='POST'){
      if(!rateLimit('support-new',60,3600000))return fail('Слишком много обращений. Попробуйте позже.',429);
      const b=await readJson(req),nickname=str(b.nickname,16),subject=str(b.subject,120),message=str(b.message,2000);
      if(!/^[a-zA-Z0-9_]{3,16}$/.test(nickname))return fail('Укажите игровой ник: 3–16 латинских букв, цифр или _');
      if(subject.length<3||message.length<5)return fail('Укажите тему (от 3 символов) и сообщение (от 5 символов)');
      const token=randomBytes(32).toString('hex'),now=new Date().toISOString();
      const ticket={id:randomUUID(),nickname,subject,status:'open',createdAt:now,updatedAt:now,accessHash:tokenHash(token),messages:[{id:randomUUID(),author:'player',text:message,at:now}]};
      put('tickets',ticket.id,ticket);audit('Новое обращение',ticket.id);
      return result({ticket:safeTicket(ticket),accessToken:token},201);
    }
    if(id){
      let ticket=get('tickets',id);const bearer=req.headers.get('authorization')||'';
      if(!ticket||!bearer.startsWith('Bearer ')||tokenHash(bearer.slice(7))!==ticket.accessHash)return fail('Обращение не найдено или ключ доступа недействителен',404);
      if(method==='GET')return result(safeTicket(ticket));
      if(path[3]==='messages'&&method==='POST'){
        if(!rateLimit('ticket:'+id,20,60000))return fail('Подождите перед отправкой следующего сообщения',429);
        const b=await readJson(req),message=str(b.message,2000);ticket=get('tickets',id);if(message.length<2)return fail('Напишите сообщение');
        if(ticket.messages.length>=200)return fail('Достигнут лимит переписки. Создайте новое обращение.');
        ticket.messages.push({id:randomUUID(),author:'player',text:message,at:new Date().toISOString()});ticket.updatedAt=new Date().toISOString();ticket.status='open';put('tickets',id,ticket);return result(safeTicket(ticket));
      }
    }
    return fail('Не найдено',404);
  }
  if(path[0]!=='admin'||!['community','news','rules','tickets','users'].includes(path[1]))return null;
  const user=currentUser(req);if(!user)return fail('Требуется вход',401);
  const kind=path[1],id=path[2];
  if(kind==='community'&&method==='GET')return result({user,rules:user.role==='support'?[]:list('rules').sort((a,b)=>a.position-b.position),news:user.role==='support'?[]:list('news').reverse(),tickets:list('tickets').map(safeTicket).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),users:user.role==='owner'?list('users').map(publicUser):[]});
  if(kind==='users'){
    if(user.role!=='owner')return fail('Управление аккаунтами доступно только владельцу',403);
    if(method==='POST'||method==='PUT'){const b=await readJson(req);const saved=saveUser(id,b,user);audit('Аккаунт сотрудника',saved.login+' · '+saved.role);return result(saved);}
    if(method==='DELETE'&&id){if(id==='owner'||id===user.id)return fail('Нельзя удалить владельца или собственный аккаунт');remove('users',id);db().prepare('DELETE FROM sessions WHERE user_id=?').run(id);audit('Удалён аккаунт сотрудника',id);return result({ok:true});}
  }
  if(kind==='tickets'){
    let ticket=id?get('tickets',id):null;if(!ticket)return fail('Обращение не найдено',404);
    if(method==='POST'&&path[3]==='messages'){
      const b=await readJson(req),message=str(b.message,2000);ticket=get('tickets',id);if(message.length<2)return fail('Напишите ответ');if(ticket.messages.length>=200)return fail('Достигнут лимит переписки');
      ticket.messages.push({id:randomUUID(),author:'staff',staffId:user.id,text:message,at:new Date().toISOString()});ticket.updatedAt=new Date().toISOString();ticket.status='answered';put('tickets',id,ticket);audit('Ответ поддержки',id+' · '+user.login);return result(safeTicket(ticket));
    }
    if(method==='PUT'){const b=await readJson(req);ticket=get('tickets',id);if(!['open','answered','closed'].includes(b.status))return fail('Некорректный статус');ticket.status=b.status;ticket.updatedAt=new Date().toISOString();put('tickets',id,ticket);audit('Статус обращения',id+' · '+b.status);return result(safeTicket(ticket));}
    return fail('Метод не поддерживается',405);
  }
  if(user.role==='support')return fail('Недостаточно прав для изменения сайта',403);
  if(['news','rules'].includes(kind)){
    if(method==='DELETE'&&id){remove(kind,id);audit('Удаление '+kind,id);return result({ok:true});}
    if(method==='POST'||method==='PUT'){
      const b=await readJson(req),previous=id?get(kind,id):null;if(id&&!previous)return fail('Запись не найдена',404);
      const title=str(b.title,140),body=str(b.body,20000);if(title.length<3||!body)return fail('Заполните заголовок и текст');
      let value;
      if(kind==='rules'){
        const position=Number(b.position);if(!Number.isInteger(position)||position<0||position>999)return fail('Порядок: целое число от 0 до 999');
        value={id:id||randomUUID(),title,body,position,enabled:Boolean(b.enabled)};
      }else{
        const key=id||randomUUID(),slug=str(b.slug,100)||key;
        if(!/^[a-z0-9-]{3,100}$/.test(slug))return fail('Адрес новости: латинские строчные буквы, цифры и дефис');
        if(list('news').some(n=>n.id!==id&&n.slug===slug))return fail('Этот адрес новости уже занят');
        value={id:key,slug,title,body,excerpt:str(b.excerpt,300),tag:str(b.tag,40)||'Новости',art:['pickaxe','crown','emerald','diamond','amethyst','coin','key','shield'].includes(b.art)?b.art:'pickaxe',published:Boolean(b.published),createdAt:previous?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
      }
      put(kind,value.id,value);audit('Сохранение '+kind,title);return result(value);
    }
  }
  return fail('Метод не поддерживается',405);
}
