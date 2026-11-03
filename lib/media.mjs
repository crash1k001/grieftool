import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {readBody} from './security.mjs';
import {currentUser,rateLimit} from './auth.mjs';
const limit=5*1024*1024;
const types={png:'image/png',jpg:'image/jpeg',gif:'image/gif',webp:'image/webp'};
const fail=(error,status=400)=>NextResponse.json({error},{status});
const directory=()=>path.resolve(/*turbopackIgnore: true*/process.env.DATA_DIR||'../grieftool-data','media');
export async function mediaRoute(req,parts) {
 if(parts[0]==='media'&&req.method==='GET') {
  const id=parts[1];if(parts.length!==2||!/^([a-f0-9]{64})\.(png|jpg|gif|webp)$/.test(id||''))return fail('Не найдено',404);
  try{return new Response(await readFile(path.join(/*turbopackIgnore: true*/directory(),id)),{headers:{'Content-Type':types[id.split('.').at(-1)],'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=31536000, immutable','Content-Security-Policy':"default-src 'none'; sandbox"}});}catch(e){if(e.code==='ENOENT')return fail('Не найдено',404);throw e;}
 }
 if(parts.join('/')!=='admin/media'||req.method!=='POST')return null;
 const user=currentUser(req);if(!user)return fail('Требуется вход',401);if(user.role==='support')return fail('Недостаточно прав',403);
 if(req.headers.get('origin')!==(process.env.APP_ORIGIN||new URL(req.url).origin))return fail('Недопустимый источник запроса',403);
 if(!rateLimit('media:'+user.id,30,60000))return fail('Слишком много загрузок',429);
 if(Number(req.headers.get('content-length')||0)>limit)return fail('Размер файла — до 5 МБ',413);
 const bytes=await readBody(req,limit,15000);let metadata;
 try{metadata=await sharp(bytes,{limitInputPixels:16777216}).metadata();}catch{return fail('Не удалось прочитать изображение');}
 const ext=metadata.format==='jpeg'?'jpg':metadata.format;
 if(!types[ext]||!metadata.width||!metadata.height||metadata.width>4096||metadata.height>4096||(metadata.pages||1)>200||metadata.width*metadata.height*(metadata.pages||1)>33554432)return fail('PNG, JPEG, WebP или GIF до 4096 × 4096, не более 200 кадров и 32 млн пикселей суммарно');
 if(req.headers.get('content-type')!==types[ext])return fail('Тип файла не соответствует содержимому');
 const id=createHash('sha256').update(bytes).digest('hex')+'.'+ext;
 await mkdir(directory(),{recursive:true});await writeFile(path.join(/*turbopackIgnore: true*/directory(),id),bytes,{mode:0o600});
 return NextResponse.json({url:'/api/media/'+id,width:metadata.width,height:metadata.height},{status:201});
}
