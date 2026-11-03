// Runs against disposable databases and a fresh production server for each suite.
import {spawn} from 'node:child_process';
import {mkdtemp,rm,cp} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const cwd=fileURLToPath(new URL('../',import.meta.url));
const suites=['tests/api.test.mjs','tests/community.test.mjs','tests/events-api.test.mjs','tests/shop-admin.test.mjs','tests/test-mode.test.mjs','scripts/browser-smoke.py','scripts/community-smoke.py','scripts/events-smoke.py','scripts/shop-admin-smoke.py','scripts/test-mode-smoke.py'];
const selected=process.argv.slice(2);
if(selected.some(s=>!suites.includes(s)))throw Error('Unknown test suite');
await cp(join(cwd,'public'),join(cwd,'.next/standalone/public'),{recursive:true});
await cp(join(cwd,'.next/static'),join(cwd,'.next/standalone/.next/static'),{recursive:true});
for(const file of selected.length?selected:suites) {
 const listener=createServer();await new Promise((resolve,reject)=>{listener.once('error',reject);listener.listen(0,'127.0.0.1',resolve);});const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
 const directory=await mkdtemp(join(tmpdir(),'grieftool-check-')),base='http://localhost:'+port;
 const password=randomBytes(24).toString('hex'),bridge=randomBytes(32).toString('hex');
 const env={...process.env,NODE_ENV:'production',HOSTNAME:'127.0.0.1',PORT:String(port),TRUST_PROXY:'false',DATA_DIR:directory,APP_ORIGIN:base,ADMIN_LOGIN:'test_owner',ADMIN_PASSWORD:password,BRIDGE_TOKEN:bridge,TEST_BASE_URL:base,TEST_ADMIN_LOGIN:'test_owner',TEST_ADMIN_PASSWORD:password,TEST_BRIDGE_TOKEN:bridge};
 const server=spawn(process.execPath,['.next/standalone/server.js'],{cwd,env,stdio:['ignore','pipe','pipe']});let ready=false,log='';
 server.stdout.on('data',chunk=>{const line=String(chunk);log+=line;if(line.includes('Ready'))ready=true;});server.stderr.on('data',chunk=>{log+=String(chunk);});
 const stopped=new Promise(resolve=>server.once('exit',resolve));
 try {
  for(let i=0;i<100&&!ready&&server.exitCode===null;i++)await new Promise(resolve=>setTimeout(resolve,100));
  if(!ready||server.exitCode!==null)throw Error('Test server failed: '+log);
  if(!(await fetch(base+'/api/health')).ok)throw Error('Health check failed');
  console.log('Running '+file);
  const python=file.endsWith('.py');
  await new Promise((resolve,reject)=>{const child=spawn(python?'python3':process.execPath,python?['-u',file]:[file],{cwd,env,stdio:'inherit'});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(file+' failed: '+code)));});
 } finally {if(server.exitCode===null)server.kill('SIGTERM');await stopped;await rm(directory,{recursive:true,force:true});}
}
console.log('All selected integration and browser suites passed.');
