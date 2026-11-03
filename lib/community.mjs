import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {get,list,put,remove,db,audit} from './store.mjs';
import {currentUser,publicUser,saveUser} from './auth.mjs';

const result=(value,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
const fail=(error,status=400)=>result({error},status);
const str=(value,max=2000)=>typeof value==='string'?value.trim().slice(0,max):'';
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
  if(path[0]!=='admin'||!['community','news','rules','tickets','users'].includes(path[1]))return null;
  const user=currentUser(req);if(!user)return fail('Требуется вход',401);if(user.role==='support')return fail('Раздел поддержки отключён',403);
  const kind=path[1],id=path[2];
  if(kind==='community'&&method==='GET')return result({user,rules:list('rules').sort((a,b)=>a.position-b.position),news:list('news').reverse(),tickets:[],users:user.role==='owner'?list('users').map(publicUser):[]});
  if(kind==='users'){
    if(user.role!=='owner')return fail('Управление аккаунтами доступно только владельцу',403);
    if(method==='POST'||method==='PUT'){const b=await readJson(req);const saved=saveUser(id,b,user);audit('Аккаунт сотрудника',saved.login+' · '+saved.role);return result(saved);}
    if(method==='DELETE'&&id){if(id==='owner'||id===user.id)return fail('Нельзя удалить владельца или собственный аккаунт');remove('users',id);db().prepare('DELETE FROM sessions WHERE user_id=?').run(id);audit('Удалён аккаунт сотрудника',id);return result({ok:true});}
  }
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
