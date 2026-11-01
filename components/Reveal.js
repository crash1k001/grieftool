'use client';
import {useEffect,useRef} from 'react';
export default function Reveal({children,className='',delay=0,as:Tag='section',...props}){
 const ref=useRef(null);
 useEffect(()=>{
  const element=ref.current;if(!element||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){element.animate([{opacity:0,transform:'translateY(22px)'},{opacity:1,transform:'translateY(0)'}],{duration:600,delay,easing:'cubic-bezier(0.23, 1, 0.32, 1)',fill:'backwards'});observer.unobserve(element);}},{threshold:.08});
  observer.observe(element);return()=>observer.disconnect();
 },[delay]);
 return <Tag ref={ref} className={className} {...props}>{children}</Tag>;
}
