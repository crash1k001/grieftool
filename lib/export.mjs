export function csvCell(value) {
 let text=String(value??'');
 if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
}
export function ordersCsv(orders) {
 const rows=[['Номер заказа','Создан (UTC)','Игрок','Товар','Сумма (RUB)','Статус','Тестовый','Промокод']];
 for(const o of orders)rows.push([o.id,o.createdAt,o.nickname,o.product.name,(o.amount/100).toFixed(2),o.payment,o.isTest?'Да':'Нет',o.promo||'']);
 return '\ufeff'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n')+'\r\n';
}
