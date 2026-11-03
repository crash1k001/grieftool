'use client';
import {useEffect,useState} from 'react';
import Icon from './Icons';
import Modal from './Modal';

export default function AdminCheckout({owner=false,onChange}) {
 const [data,setData]=useState(null),[enabled,setEnabled]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
 async function request(method='GET',body) {
  const r=await fetch('/api/admin/checkout',{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  const d=await r.json();if(!r.ok)throw Error(d.error);return d;
 }
 useEffect(()=>{let live=true;request().then(d=>{if(live){setData(d);setEnabled(d.testMode);}}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[]);
 async function save(e) {
  e.preventDefault();setBusy(true);setError('');setNotice('');
  try{const d=await request('PUT',{testMode:enabled});setData(d);setNotice(d.testMode?'Тестовый режим включён. Покупки бесплатные.':'Тестовый режим выключен.');onChange?.();}catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function clear() {
  setBusy(true);setError('');setNotice('');
  try{const d=await request('DELETE');setData(d);setConfirm(false);setNotice('Тестовые заказы удалены: '+d.deleted);onChange?.();}catch(e){setError(e.message);}finally{setBusy(false);}
 }
 if(!data)return <p role="status">{error||'Загрузка режима магазина…'}</p>;
 return <div className="checkout-management">
  <section className={'test-mode-card '+(data.testMode?'enabled':'')}><Icon name="gift" size={56}/><div><span className="eyebrow">ПРОВЕРКА МАГАЗИНА</span><h2>{data.testMode?'Тестовые покупки включены':'Тестовые покупки выключены'}</h2><p>Проверь оформление заказа от выбора товара до подтверждения. Карта и оплата не нужны.</p></div><span className="test-mode-price">0 ₽</span></section>
  <form className="admin-panel settings-section admin-form" onSubmit={save}><h2>Тестовый режим</h2><p>После включения все посетители смогут оформить бесплатный тестовый заказ. Обычные цены каталога сохраняются, сумма тестовой покупки — 0 ₽.</p><label className="checkbox-label mode-toggle"><input type="checkbox" checked={enabled} disabled={!owner||busy} onChange={e=>{setEnabled(e.target.checked);setNotice('');}}/><span>Разрешить тестовые покупки</span></label><p className="admin-text-note">Тестовые заказы отмечаются отдельно, не попадают в выручку и свежие покупки и не расходуют лимиты промокодов. Выполнение команд в Minecraft пока не подключено.</p>{!owner&&<p className="admin-notice">Режим меняет только владелец сайта.</p>}<div className="mode-actions"><button className="button button-orange" disabled={!owner||busy}>{busy?'Сохраняем…':'Сохранить режим'}</button><a className="button button-secondary" href="/main#shop" target="_blank" rel="noreferrer">Открыть магазин<Icon name="arrow"/></a></div></form>
  <section className="admin-panel settings-section test-order-cleanup"><div><h2>Тестовых заказов: {data.testOrders}</h2><p>После проверки можно очистить тестовые покупки. Обычные заказы сохранятся.</p></div><button className="button button-secondary" disabled={!owner||busy||!data.testOrders} onClick={()=>setConfirm(true)}>Очистить тестовые заказы</button></section>
  {error&&<p className="form-error" role="alert">{error}</p>}{notice&&<p className="admin-success" role="status">{notice}</p>}
  {confirm&&<Modal title="Очистить тестовые заказы?" onClose={()=>{if(!busy)setConfirm(false);}}><p>Будут удалены только тестовые покупки за 0 ₽. Запись об очистке останется в журнале.</p><div className="confirm-actions"><button className="button button-secondary" disabled={busy} onClick={()=>setConfirm(false)}>Отмена</button><button className="button button-danger" disabled={busy} onClick={clear}>Удалить тестовые заказы</button></div></Modal>}
 </div>;
}
