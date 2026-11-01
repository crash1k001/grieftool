import { DatabaseSync, backup } from 'node:sqlite';
import { resolve } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
const source=resolve(process.env.DATA_DIR||'../grieftool-data','grieftool.sqlite');
if(!existsSync(source))throw Error('База ещё не создана: сначала запустите приложение');
const dir=resolve(process.env.DATA_DIR||'../grieftool-data','backups');mkdirSync(dir,{recursive:true});
const destination=resolve(dir,'grieftool-'+new Date().toISOString().replaceAll(':','-')+'.sqlite');
const database=new DatabaseSync(source,{readOnly:true});await backup(database,destination);database.close();console.log('Резервная копия:',destination);
