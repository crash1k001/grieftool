import {test} from 'node:test';
import assert from 'node:assert/strict';
import {commands,imageUrl,offerProduct,publicProduct,analytics} from '../lib/shop-config.mjs';
test('commands accept player/UUID templates and reject malformed lines',()=>{
 assert.deepEqual(commands('lp user {player} parent add hero\ngive {player} diamond 1'),['lp user {player} parent add hero','give {player} diamond 1']);
 for(const input of ['/op {player}','say {unknown}',['give {player}\nop other'],[null]])assert.throws(()=>commands(input));
});
test('media references reject active schemes, traversal and URL credentials',()=>{
 assert.equal(imageUrl('https://example.com/logo.gif'),'https://example.com/logo.gif');
 assert.equal(imageUrl('/api/media/'+'a'.repeat(64)+'.png'),'/api/media/'+'a'.repeat(64)+'.png');
 for(const value of ['javascript:alert(1)','data:text/html,x','/images/../secret','//evil.test/image','https://user:pass@example.com/file'])assert.throws(()=>imageUrl(value));
});
test('campaigns obey time/product scopes and choose the largest discount',()=>{
 const p={id:'one',discount:10},now=Date.parse('2026-11-02T12:00:00Z');
 const c=(percent,extra={})=>({enabled:true,percent,productIds:[],...extra});
 assert.equal(offerProduct(p,[c(20),c(30,{starts:'2026-11-03'}),c(40,{productIds:['two']}),c(50,{ends:'2026-11-02'})],now).discount,20);
 assert.equal(offerProduct(p,[c(5)],now).discount,10);
 assert.equal(offerProduct(p,[c(50,{enabled:false})],now).discount,10);
});
test('public products never disclose delivery commands',()=>{
 const p=publicProduct({id:'one',deliveryCommands:['secret command'],imageUrl:'/images/example.png'});
 assert.equal('deliveryCommands' in p,false);
});
test('revenue excludes pending, refunded and out-of-range orders',()=>{
 const now=Date.parse('2026-11-02T12:00:00Z'),base={product:{id:'one',name:'Hero'},createdAt:'2026-11-02T10:00:00Z',amount:10000};
 const a=analytics([{...base,payment:'paid'},{...base,payment:'unavailable'},{...base,payment:'refunded'},{...base,payment:'paid',createdAt:'2025-11-02T10:00:00Z'}],7,now);
 assert.equal(a.revenue,10000);assert.equal(a.refunded,10000);assert.equal(a.paid,1);assert.equal(a.orders,3);assert.equal(a.average,10000);assert.equal(a.series.length,7);assert.equal(a.top[0].count,1);
});
