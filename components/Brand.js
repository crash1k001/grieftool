export default function Brand({settings={},small=false}) {
 const src=settings.appearance?.logoUrl;
 return <><span className={'brand-mark '+(small?'small':'')}>{src?<img src={src} alt="" width={56} height={56}/>:<span>GT</span>}</span><span className="brand-type">{settings.name||'GriefTool'}{!small&&<small>ТВОЁ МЕСТО В MINECRAFT</small>}</span></>;
}
