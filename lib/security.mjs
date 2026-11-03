import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
const windows=new Map();
export function requestBudget(req,now=Date.now()) {
 const ip=process.env.TRUST_PROXY==='true'?req.headers.get('x-grieftool-client-ip'):'';
 const trusted=isIP(ip||'')?ip:'shared';
 const key=createHash('sha256').update(trusted).digest('hex');
 const current=windows.get(key);
 if(windows.size>10000)for(const [id,row] of windows)if(row.until<now)windows.delete(id);
 if(!current||current.until<now){if(windows.size>=12000)return false;windows.set(key,{count:1,until:now+60000});return true;}
 return ++current.count<=(trusted==='shared'?1200:300);
}
export async function readBody(req,max=262144,timeout=10000) {
 if(Number(req.headers.get('content-length')||0)>max)throw Object.assign(Error('Запрос слишком большой'),{status:413});
 const reader=req.body?.getReader();if(!reader)return Buffer.alloc(0);
 const chunks=[];let size=0,timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reader.cancel().catch(()=>{});reject(Object.assign(Error('Истекло время загрузки'),{status:408}));},timeout);});
 try{return await Promise.race([(async()=>{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Object.assign(Error('Запрос слишком большой'),{status:413});}chunks.push(value);}return Buffer.concat(chunks);})(),deadline]);}
 finally{clearTimeout(timer);reader.releaseLock();}
}
export function safeError(error) {
 if(error instanceof SyntaxError)return {message:'Некорректный JSON',status:400};
 if(error.code||error instanceof TypeError)return {message:'Не удалось обработать запрос',status:500};
 return {message:error.message||'Ошибка сервера',status:error.status||400};
}
