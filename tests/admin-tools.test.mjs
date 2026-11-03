import {test} from 'node:test';
import assert from 'node:assert/strict';
import {csvCell,ordersCsv} from '../lib/export.mjs';
import {defaultContent,contentSettings} from '../lib/shop-config.mjs';
test('CSV prevents spreadsheet formulas and escapes quotes/newlines',()=>{
 for(const value of ['=1+1',' +SUM(A1)','@SUM(A1)','-1+2','\t=1'])assert.ok(csvCell(value).startsWith('"\''));
 assert.equal(csvCell('a"b'),'"a""b"');
 const csv=ordersCsv([{id:'one',nickname:'Steve',product:{name:'=HYPERLINK("bad")'},createdAt:'2026-11-02',amount:0,payment:'test',isTest:true}]);
 assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));assert.ok(csv.includes('"0.00"'));assert.ok(csv.endsWith('\r\n'));
});
test('content settings validate structure and ignore unexpected fields',()=>{
 assert.deepEqual(contentSettings({...defaultContent,untrusted:'value'}),defaultContent);
 for(const patch of [{joinEnabled:'false'},{guideSteps:[]},{guideSteps:[null,null,null]},{catalogTitle:''},{footerText:'a'.repeat(401)}])assert.throws(()=>contentSettings({...defaultContent,...patch}));
});
