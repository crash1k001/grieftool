'use client';
import * as Select from '@radix-ui/react-select';
import Icon from './Icons';
export default function ShopSelect({value,onChange,options,label='Сортировка'}) {
 return <Select.Root value={value} onValueChange={onChange}>
  <Select.Trigger className="shop-select-trigger" aria-label={label}><Select.Value/><Select.Icon><Icon name="chevron" size={16}/></Select.Icon></Select.Trigger>
  <Select.Portal><Select.Content className="shop-select-content" position="popper" sideOffset={8}><Select.Viewport>
   {options.map(([id,text])=><Select.Item className="shop-select-item" value={id} key={id}><Select.ItemText>{text}</Select.ItemText><Select.ItemIndicator><Icon name="check" size={16}/></Select.ItemIndicator></Select.Item>)}
  </Select.Viewport></Select.Content></Select.Portal>
 </Select.Root>;
}
