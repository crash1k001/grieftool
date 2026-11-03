import {get} from '../../lib/store.mjs';
export const dynamic='force-dynamic';
export function GET(req) {
 const url=get('settings','appearance')?.faviconUrl||get('settings','appearance')?.logoUrl||'/favicon-default.png';
 return new Response(null,{status:302,headers:{Location:new URL(url,req.url).href,'Cache-Control':'no-store'}});
}
