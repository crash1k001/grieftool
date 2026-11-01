import {execFileSync} from 'node:child_process';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
process.env.DATA_DIR=mkdtempSync(tmpdir()+'/gt-events-');process.env.BRIDGE_TOKEN=randomBytes(32).toString('hex');
const {eventRoute,spots}=await import('../lib/events.mjs');const {put,get,list}=await import('../lib/store.mjs');
const cfg={theme:'halloween',campaign:'halloween-2026'};put('season','settings',cfg);
async function api(route,body={},bridge=false){if(route==='bridge/redeem'&&!('availableCampaigns' in body))body.availableCampaigns=[get('season','settings').campaign];const req=new Request('http://localhost/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',...(bridge?{Authorization:'Bearer '+process.env.BRIDGE_TOKEN}:{})},body:JSON.stringify(body)});const res=await eventRoute(req,route.split('/'),r=>r.json());return {status:res.status,data:await res.json()};}
async function hunt(name){const start=await api('events/start');for(const spot of spots)await api('events/collect',{token:start.data.token,spot});const claim=await api('events/claim',{token:start.data.token,nickname:name});return claim.data.command?.split(' ')[1];}
let code,id;
test('bridge rejects unauthenticated server calls',async()=>{assert.equal((await api('bridge/heartbeat')).status,401);});
test('collection is validated on the server',async()=>{const {data}=await api('events/start');assert.equal((await api('events/claim',{token:data.token,nickname:'PlayerOne'})).status,400);assert.equal((await api('events/collect',{token:data.token,spot:'fake'})).status,400);const first=await api('events/collect',{token:data.token,spot:spots[0]});const second=await api('events/collect',{token:data.token,spot:spots[0]});assert.deepEqual(first.data,second.data);});
test('nickname entry alone does not consume the reward',async()=>{code=await hunt('PlayerOne');assert.equal(list('rewards').length,0);assert.equal((await api('bridge/redeem',{code,nickname:'WrongName',uuid:'11111111-1111-1111-1111-111111111111'},true)).status,400);});
test('concurrent redemptions reserve one reward only',async()=>{const body={code,nickname:'PlayerOne',uuid:'11111111-1111-1111-1111-111111111111'};const results=await Promise.all([api('bridge/redeem',body,true),api('bridge/redeem',body,true)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);id=results.find(r=>r.status===200).data.id;assert.equal(list('rewards').length,1);});
test('another browser and nickname case cannot obtain a second prize',async()=>{assert.equal(await hunt('playerone'),undefined);assert.equal((await api('bridge/redeem',{code,nickname:'PLAYERONE',uuid:'22222222-2222-2222-2222-222222222222'},true)).status,409);});
test('UUID prevents repeated rewards after nickname change',async()=>{const other=await hunt('OtherName');assert.equal((await api('bridge/redeem',{code:other,nickname:'OtherName',uuid:'11111111-1111-1111-1111-111111111111'},true)).status,409);});
test('acknowledgement retries are idempotent',async()=>{assert.equal((await api('bridge/ack',{id,status:'delivered'},true)).status,200);await api('bridge/ack',{id,status:'review'},true);assert.equal(get('rewards',id).status,'delivered');});
test('disabling and enabling a theme preserves claimed nicknames',async()=>{put('season','settings',{...cfg,theme:'snow'});assert.equal((await api('events/start')).status,400);put('season','settings',cfg);assert.equal(await hunt('PlayerOne'),undefined);});
test('new campaign permits a new prize, old proof rejected',async()=>{put('season','settings',{...cfg,campaign:'halloween-2027'});assert.equal((await api('bridge/redeem',{code,nickname:'PlayerOne',uuid:'11111111-1111-1111-1111-111111111111'},true)).status,400);const next=await hunt('PlayerOne');assert.equal((await api('bridge/redeem',{code:next,nickname:'PlayerOne',uuid:'11111111-1111-1111-1111-111111111111'},true)).status,200);});

test('missing plugin reward configuration does not consume a prize',async()=>{const code=await hunt('ConfigTest');const before=list('rewards').length;assert.equal((await api('bridge/redeem',{code,nickname:'ConfigTest',uuid:'33333333-3333-3333-3333-333333333333',availableCampaigns:[]},true)).status,400);assert.equal(list('rewards').length,before);});

test('reward records survive process restart',()=>{const output=execFileSync(process.execPath,['--input-type=module','-e',"import {list} from './lib/store.mjs'; console.log(list('rewards').length)"],{env:process.env,encoding:'utf8'});assert.equal(Number(output.trim()),list('rewards').length);});
