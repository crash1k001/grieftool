import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=process.env.TEST_BASE_URL,key=process.env.TEST_BRIDGE_TOKEN;
if(!base||!key)throw Error('Use an isolated server with TEST_BASE_URL and TEST_BRIDGE_TOKEN');
async function call(path,body,headers={}){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),headers:r.headers};}
const logged=await call('auth',{login:process.env.TEST_ADMIN_LOGIN,password:process.env.TEST_ADMIN_PASSWORD},{Origin:base});assert.equal(logged.status,200);const cookie=logged.headers.get('set-cookie').split(';')[0];
const settings=await call('admin/events',null,{Cookie:cookie});const campaign='api-'+Date.now();
const save=await fetch(base+'/api/admin/events',{method:'PUT',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({theme:'halloween',campaign})});assert.equal(save.status,200);
try{
 assert.equal((await call('bridge/heartbeat',{online:1})).status,401);
 assert.equal((await call('bridge/heartbeat',{online:3,version:'api-test'},{Authorization:'Bearer '+key})).status,200);
 const overview=await call('admin/events',null,{Cookie:cookie});assert.equal(overview.data.bridge.online,3);assert.ok(!JSON.stringify(overview.data).includes(key));
 assert.equal((await call('events/start',{})).status,403);
 const start=await call('events/start',{},{Origin:base});const token=start.data.token;
 for(const spot of ['main-top','main-bottom','rules-top','rules-bottom','news-top','news-bottom'])assert.equal((await call('events/collect',{token,spot},{Origin:base})).status,200);
 const nickname='HTTP_'+Date.now().toString(36);const proof=await call('events/claim',{token,nickname},{Origin:base});const code=proof.data.command.split(' ')[1];
 const body={nickname,uuid:randomUUID(),code,availableCampaigns:[campaign]},auth={Authorization:'Bearer '+key};
 const results=await Promise.all([call('bridge/redeem',body,auth),call('bridge/redeem',body,auth)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const id=results.find(r=>r.status===200).data.id;
 assert.equal((await call('bridge/ack',{id,status:'delivered'},auth)).status,200);
 const final=await call('admin/events',null,{Cookie:cookie});assert.equal(final.data.rewards.find(r=>r.id===id).status,'delivered');
 console.log('PASS: HTTP bridge authentication, Origin boundaries, heartbeat, secret isolation, hunt, concurrent one-time redemption, acknowledgement and admin journal');
}finally{
 await fetch(base+'/api/admin/events',{method:'PUT',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(settings.data.settings)});
}
