import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readBody,requestBudget,safeError} from '../lib/security.mjs';
import {recentPurchases} from '../lib/shop-config.mjs';
test('recent purchases disclose only paid orders and masked nicknames',()=>{
 const base={id:'private-order-id',nickname:'SecretPlayer',amount:9900,product:{id:'hero',name:'Hero'},createdAt:'2026-11-02T12:00:00Z'};
 const feed=recentPurchases([{...base,payment:'paid'},{...base,payment:'unavailable'}],[{id:'hero',art:'diamond',deliveryCommands:['secret']}]);
 assert.equal(feed.length,1);assert.equal(feed[0].nickname,'Se***');
 assert.ok(!JSON.stringify(feed).includes('private-order-id'));assert.ok(!JSON.stringify(feed).includes('SecretPlayer'));assert.ok(!JSON.stringify(feed).includes('secret'));
});
test('oversized JSON is rejected with and without a content length',async()=>{
 await assert.rejects(readBody(new Request('http://localhost',{method:'POST',body:'a'.repeat(100)}),10),e=>e.status===413);
 await assert.rejects(readBody(new Request('http://localhost',{method:'POST',headers:{'Content-Length':'100'},body:'x'}),10),e=>e.status===413);
});
test('slow bodies time out and release the reader',async()=>{
 const body=new ReadableStream({start(){}});
 await assert.rejects(readBody(new Request('http://localhost',{method:'POST',body,duplex:'half'}),100,20),e=>e.status===408);
});
test('rate limit ignores untrusted forwarded IPs and enforces a bounded window',()=>{
 const old=process.env.TRUST_PROXY;delete process.env.TRUST_PROXY;
 try {let accepted=0;for(let i=0;i<1202;i++)if(requestBudget(new Request('http://localhost',{headers:{'x-grieftool-client-ip':'1.2.3.'+i}}),100))accepted++;assert.equal(accepted,1200);assert.equal(requestBudget(new Request('http://localhost'),60101),true);}
 finally{if(old===undefined)delete process.env.TRUST_PROXY;else process.env.TRUST_PROXY=old;}
});
test('internal errors do not expose filesystem paths',()=>{
 const safe=safeError(Object.assign(Error('/secret/file failed'),{code:'EACCES'}));assert.equal(safe.status,500);assert.ok(!safe.message.includes('/secret'));
});
