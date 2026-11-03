const icons = {
 arrow:'arrow',copy:'paper',crown:'golden_helmet',coin:'gold_ingot',key:'trial_key',
 sword:'diamond_sword',flame:'blaze_powder',shield:'totem_of_undying',telegram:'feather',
 discord:'ender_pearl',help:'book',rules:'writable_book',close:'barrier',check:'slime_ball',
 chevron:'arrow',plus:'emerald',logout:'oak_door',chart:'comparator',box:'bundle',
 settings:'redstone',search:'spyglass',lock:'trial_key',menu:'book',gift:'bundle',
 leaf:'feather',snow:'snowball',rain:'water_bucket',circle:'gray_dye',
};
export default function Icon({name,size=20,className='',style,...props}) {
 return <img src={'/images/minecraft/'+(icons[name]||'bundle')+'.png'}
  width={size} height={size} alt="" aria-hidden="true" draggable={false}
  className={'game-icon '+className} style={{...style,width:size,height:size}} {...props}/>;
}
