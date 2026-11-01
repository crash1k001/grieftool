import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { seedProducts, categories } from './catalog.mjs';
let database;
export function db(){
 if(database) return database;
 const directory=path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR||'../grieftool-data'); mkdirSync(directory,{recursive:true});
 database=new DatabaseSync(path.join(directory,'grieftool.sqlite')); database.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
 database.exec(`CREATE TABLE IF NOT EXISTS documents (kind TEXT NOT NULL,id TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(kind,id)); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY,expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);`);
 if(!database.prepare('PRAGMA table_info(sessions)').all().some(c=>c.name==='user_id')){
  database.exec("ALTER TABLE sessions ADD COLUMN user_id TEXT; DELETE FROM sessions;");
 }
 if(!get('meta','initialized')){
  database.exec('BEGIN');
  try{ for(const p of seedProducts) put('products',p.id,p); for(const c of categories)put('categories',c.id,c);
   put('settings','site',{name:'GriefTool',ip:'mc.GriefTool.fun',version:'Java 1.16.5 — 1.21.x',headline:'Гриферское\nвыживание',announcement:'НОВЫЙ УРОВЕНЬ ТВОЕЙ ИГРЫ',telegram:'',discord:'',support:'',rules:'Уважай других игроков. Запрещены читы, эксплуатация уязвимостей, угрозы и реклама. Полные правила публикует администрация сервера.',faq:[{q:'Как зайти на сервер?',a:'Открой Minecraft Java Edition, выбери «Сетевая игра» → «Добавить сервер» и введи mc.GriefTool.fun.'},{q:'Как получить покупку?',a:'Выдача станет доступна после подключения администрацией платёжной системы и интеграции с сервером.'},{q:'Можно ли улучшить привилегию?',a:'Условия улучшения привилегий уточняй у администрации сервера.'},{q:'Что делать, если я ошибся в нике?',a:'Перед оформлением внимательно проверь ник. Если ошибка уже произошла, обратись в поддержку с номером заказа.'}]});
   put('meta','initialized',{at:Date.now()}); database.exec('COMMIT');
  }catch(e){database.exec('ROLLBACK');throw e;}
 }
 if(!get('meta','content-v2')){
  const settings=get('settings','site');
  if(settings?.headline==='Твоя игра.\nТвои правила.')put('settings','site',{...settings,headline:'Гриферское\nвыживание'});
  if(settings?.rules)put('rules','general',{id:'general',title:'Общие правила',body:settings.rules,position:1,enabled:true});
  put('meta','content-v2',{at:Date.now()});
 }
 return database;
}
export function get(kind,id){const row=db().prepare('SELECT value FROM documents WHERE kind=? AND id=?').get(kind,id);return row?JSON.parse(row.value):null;}
export function list(kind){return db().prepare('SELECT value FROM documents WHERE kind=? ORDER BY rowid').all(kind).map(x=>JSON.parse(x.value));}
export function put(kind,id,value){db().prepare('INSERT INTO documents(kind,id,value) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value').run(kind,id,JSON.stringify(value));return value;}
export function remove(kind,id){db().prepare('DELETE FROM documents WHERE kind=? AND id=?').run(kind,id);}
export function audit(action,detail){const id=randomUUID();put('audit',id,{id,action,detail,at:new Date().toISOString()});}
