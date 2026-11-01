// Original pixel illustrations. No external assets or image requests.
export default function PixelArt({type='diamond',className='',label=''}){
 let shapes;
 const diamond=(c)=> <><path fill={c[2]} d="M7 2h10v2h4v4h2v8h-2v4h-4v2H7v-2H3v-4H1V8h2V4h4Z"/><path fill={c[1]} d="M7 4h10v2h4v10h-4v4H7v-4H3V8h4Z"/><path fill={c[0]} d="M7 6h8v2H9v8H7Z"/><path fill={c[3]} d="M9 8h8v8h-2v2H9Z"/><path fill={c[0]} d="M9 8h4v4H9Z"/></>;
 if(type==='emerald')shapes=diamond(['#c1ffb2','#56cc81','#245d49','#339c67']);
 else if(type==='amethyst')shapes=<><path fill="#492a6e" d="m12 1 8 7-2 11-6 4-7-5L3 8Z"/><path fill="#8960d6" d="m12 2 6 6-3 10-3 4-5-6-2-8Z"/><path fill="#d2b7ff" d="m12 2 2 6-4 8-3-6Z"/><path fill="#b995ff" d="m14 8 4 0-3 10-3 4-2-6Z"/></>;
 else if(type==='crown')shapes=<><path fill="#8e4519" d="M2 6h4v4h4V4h4v6h4V6h4v14H2Z"/><path fill="#ffb33e" d="M2 4h4v6h4V2h4v8h4V4h4v13H2Z"/><path fill="#ffe08a" d="M2 4h2v9h16v2H2Zm8-2h2v8h-2Z"/><path fill="#e77e21" d="M4 17h16v3H4Z"/><path fill="#e65a3c" d="M10 11h4v4h-4Z"/></>;
 else if(type==='coin')shapes=<><path fill="#9a511b" d="M6 2h12v3h3v15h-3v3H6v-3H3V5h3Z"/><path fill="#ffb52f" d="M6 2h10v3h3v13h-3v3H6v-3H3V5h3Z"/><path fill="#ffe47e" d="M6 3h10v2H6v13H4V5h2Zm2 4h7v2h-5v2h5v6H8v-2h5v-2H8Z"/></>;
 else if(type==='key')shapes=<><path fill="#885320" d="M2 2h11v3h3v9h-3v2H9v7H5V12H2Z"/><path fill="#ffd36f" d="M2 1h9v2h3v8h-3v2H7v9H3V11H1V3h1Z"/><path fill="#9a622c" d="M5 4h5v5H5Z"/><path fill="#ffbd42" d="M5 14h6v3H7v3h4v3H3V12h4Z"/></>;
 else if(type==='pickaxe')shapes=<><path fill="#51372b" d="m2 20 2 2L19 7l-2-2Z"/><path fill="#b88547" d="m1 19 2 2L18 6l-2-2Z"/><path fill="#215963" d="M3 2h14v3h4v4h2v8h-4V9h-4V6H3Z"/><path fill="#7cdce1" d="M2 1h14v3h4v4h2v6h-3V8h-4V5H2Z"/><path fill="#cbffff" d="M2 1h14v2H2Zm17 7h2v5h-2Z"/></>;
 else if(type==='shield')shapes=<><path fill="#533c31" d="M2 2h20v13l-4 5-6 4-6-4-4-5Z"/><path fill="#e4904e" d="M3 1h18v13l-4 5-5 3-5-3-4-5Z"/><path fill="#ffc781" d="M3 1h18v3H6v10l6 5v3l-5-3-4-5Z"/><path fill="#a95b32" d="M9 5h6v11h-2v2h-2v-2H9Z"/></>;
 else shapes=diamond(['#c7fbff','#58cbdc','#265875','#2b9fbe']);
 return <svg className={'pixel-art '+className} viewBox="0 0 24 24" role={label?'img':undefined} aria-label={label||undefined} aria-hidden={!label} shapeRendering="crispEdges">{shapes}</svg>;
}
