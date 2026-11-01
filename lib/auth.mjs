import { randomBytes, createHash, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import { db, get, put, list } from './store.mjs';
let synchronized;
export const publicUser = user => user ? {id:user.id,login:user.login,role:user.role,enabled:user.enabled,createdAt:user.createdAt} : null;
export function passwordHash(password) {
  if(typeof password!=='string'||password.length<8||password.length>256) throw Error('Пароль должен содержать от 8 до 256 символов');
  const salt=randomBytes(32).toString('hex');
  return {salt,hash:scryptSync(password,salt,64).toString('hex')};
}
function matches(password,record) {return timingSafeEqual(scryptSync(password,record.salt,64),Buffer.from(record.hash,'hex'));}
export function initializeOwner() {
  const password=process.env.ADMIN_PASSWORD, login=process.env.ADMIN_LOGIN||'crashovh';
  if(!password||password.length<8) throw Error('Задайте ADMIN_LOGIN и ADMIN_PASSWORD (минимум 8 символов) в окружении сервера');
  if(!/^[a-zA-Z0-9_-]{3,40}$/.test(login))throw Error('Некорректный ADMIN_LOGIN');
  const signature=login+'\0'+password;
  if(synchronized===signature)return;
  const owner=get('users','owner');
  if(!owner||owner.login!==login||!matches(password,owner)){
    if(list('users').some(u=>u.id!=='owner'&&u.login.toLowerCase()===login.toLowerCase()))throw Error('ADMIN_LOGIN уже занят другим сотрудником');
    put('users','owner',{id:'owner',login,role:'owner',enabled:true,...passwordHash(password),createdAt:owner?.createdAt||new Date().toISOString()});
    db().prepare('DELETE FROM sessions WHERE user_id=?').run('owner');
  }
  synchronized=signature;
}
export function authenticate(login,password) {
  initializeOwner();
  const user=list('users').find(u=>u.login.toLowerCase()===String(login).toLowerCase());
  if(!user){scryptSync(String(password),'grieftool-invalid-login',64);return null;}
  if(!matches(password,user)||!user.enabled)return null;
  return publicUser(user);
}
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export function createSession(userId) {
  const user=get('users',userId);if(!user?.enabled)throw Error('Аккаунт отключён');
  const token=randomBytes(32).toString('hex');
  db().prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
  db().prepare('INSERT INTO sessions(token,expires,user_id) VALUES(?,?,?)').run(tokenHash(token),Date.now()+8*3600000,userId);
  return token;
}
export function currentUser(req) {
  const token=req.cookies.get('gt_session')?.value;if(!token)return null;
  if(!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<8)return null;
  initializeOwner();
  const row=db().prepare('SELECT user_id FROM sessions WHERE token=? AND expires>?').get(tokenHash(token),Date.now());
  const user=row?get('users',row.user_id):null;
  return user?.enabled?publicUser(user):null;
}
export const session = req => Boolean(currentUser(req));
export function logout(req) {const token=req.cookies.get('gt_session')?.value;if(token)db().prepare('DELETE FROM sessions WHERE token=?').run(tokenHash(token));}
export function saveUser(id,body,actor) {
  if(actor.role!=='owner')throw Error('Только владелец управляет аккаунтами');
  const previous=id?get('users',id):null;if(id&&!previous)throw Error('Аккаунт не найден');
  if(id==='owner')throw Error('Данные владельца меняются через окружение сервера');
  const login=typeof body.login==='string'?body.login.trim():'';
  if(!/^[a-zA-Z0-9_-]{3,40}$/.test(login))throw Error('Логин: 3–40 латинских букв, цифр, _ или -');
  if(list('users').some(u=>u.id!==id&&u.login.toLowerCase()===login.toLowerCase()))throw Error('Этот логин уже занят');
  if(!['admin','support'].includes(body.role))throw Error('Выберите роль');
  const credentials=body.password?passwordHash(body.password):previous&&{hash:previous.hash,salt:previous.salt};
  if(!credentials)throw Error('Задайте пароль для нового сотрудника');
  const user={id:id||randomUUID(),login,role:body.role,enabled:Boolean(body.enabled),...credentials,createdAt:previous?.createdAt||new Date().toISOString()};
  put('users',user.id,user);if(id)db().prepare('DELETE FROM sessions WHERE user_id=?').run(id);
  return publicUser(user);
}
export function rateLimit(id,limit=10,window=900000) {
  const now=Date.now();db().prepare('DELETE FROM attempts WHERE expires<?').run(now);
  const row=db().prepare('SELECT * FROM attempts WHERE id=?').get(id);
  if(row&&row.count>=limit)return false;
  db().prepare('INSERT INTO attempts VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET count=count+1').run(id,1,now+window);return true;
}
