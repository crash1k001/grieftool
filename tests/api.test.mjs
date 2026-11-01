import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL;
const password=process.env.TEST_ADMIN_PASSWORD;
if(!base||!password)throw Error('Используйте изолированную тестовую базу и задайте TEST_BASE_URL и TEST_ADMIN_PASSWORD');
let cookie='';let count=0;
async function request(path,method='GET',body,{auth=true,origin=base}={}){
 const res=await fetch(base+'/api/'+path,{method,headers:{...(method!=='GET'?{'Content-Type':'application/json',Origin:origin}:{}),...(auth&&cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
 const data=await res.json();return {res,data};
}
function checked(message){console.log('PASS',message);count++;}
assert.equal((await request('health')).res.status,200);checked('health и SQLite');
assert.equal((await request('admin/overview')).res.status,401);checked('анонимный доступ к админке запрещён');
assert.equal((await request('auth','POST',{login:process.env.TEST_ADMIN_LOGIN||'crashovh',password},{origin:'https://foreign.example'})).res.status,403);checked('проверка Origin');
assert.equal((await request('auth','POST',{login:process.env.TEST_ADMIN_LOGIN||'crashovh',password:'wrong-password'})).res.status,401);checked('неверный пароль отклонён');
const login=await request('auth','POST',{login:process.env.TEST_ADMIN_LOGIN||'crashovh',password});assert.equal(login.res.status,200);cookie=login.res.headers.get('set-cookie').split(';')[0];assert.ok(login.res.headers.get('set-cookie').includes('HttpOnly'));checked('вход и защищённая cookie');
const original=(await request('admin/overview')).data;const category=original.categories[0];
const product={name:'QA_PRODUCT',price:9999,discount:15,category:category.id,description:'Test item',enabled:true,duration:'30 дней',art:'crown',color:'#ff9900',tag:'TEST'};
const created=await request('admin/products','POST',product);assert.equal(created.res.status,200);const id=created.data.id;checked('создание товара');
assert.ok((await request('store')).data.products.some(p=>p.id===id));checked('товар виден на витрине');
const code='QA_'+Date.now();assert.equal((await request('admin/promos','POST',{code,percent:10,minimum:0,limit:0,enabled:true})).res.status,200);
assert.equal((await request('quote','POST',{productId:id,promo:code})).data.amount,7649);checked('серверная цена с двумя скидками');
assert.equal((await request('orders','POST',{productId:id,nickname:'<bad>',accepted:true})).res.status,400);checked('валидация игрового ника');
const order=await request('orders','POST',{productId:id,nickname:'QA_Player',promo:code,accepted:true,amount:1,payment:'paid'});assert.equal(order.res.status,201);assert.equal(order.data.amount,7649);assert.equal(order.data.payment,'unavailable');checked('нельзя подменить цену или статус оплаты');
assert.ok((await request('admin/overview')).data.orders.some(o=>o.id===order.data.id));checked('заказ записан в базу');
assert.equal((await request('admin/products/'+id,'PUT',{...product,enabled:false})).res.status,200);
assert.equal((await request('quote','POST',{productId:id})).res.status,400);checked('скрытый товар нельзя заказать');
assert.equal((await request('admin/settings','PUT',{...original.settings,telegram:'javascript:alert(1)'})).res.status,400);checked('опасные ссылки не принимаются');
assert.equal((await request('admin/categories/'+category.id,'DELETE')).res.status,400);checked('категорию с товарами нельзя удалить');
await request('admin/products/'+id,'DELETE');await request('admin/promos/'+code,'DELETE');checked('удаление товара и промокода');
await request('auth','DELETE');assert.equal((await request('admin/overview')).res.status,401);checked('выход отменяет серверную сессию');
console.log(`${count} API checks passed`);
