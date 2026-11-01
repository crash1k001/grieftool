'use client';
import {useEffect,useRef} from 'react';
import Icon from './Icons';
export default function Modal({title,children,onClose,wide=false}){
 const ref=useRef(null);
 useEffect(()=>{const before=document.activeElement;const old=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.focus();function key(e){if(e.key==='Escape')onClose();if(e.key==='Tab'){const all=ref.current?.querySelectorAll('button,input,select,textarea,a[href]');const items=[...all].filter(n=>!n.disabled);if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}document.addEventListener('keydown',key);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',key);before?.focus();};},[onClose]);
 return <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={ref} tabIndex={-1} className={'modal '+(wide?'modal-wide':'')} role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Закрыть"><Icon name="close"/></button></div>{children}</section></div>;
}
