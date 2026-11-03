// Original Minecraft textures; provenance: public/images/minecraft/SOURCES.md.
const textures = {
 emerald: 'emerald', diamond: 'diamond', amethyst: 'amethyst_shard',
 crown: 'golden_helmet', coin: 'gold_ingot', key: 'trial_key',
 pickaxe: 'diamond_pickaxe', shield: 'totem_of_undying',
};
export default function PixelArt({type='diamond',className='',label='',src=''}) {
 return <img className={'pixel-art '+(src?'custom-product-image ':'minecraft-item ')+className}
  src={src||'/images/minecraft/'+(textures[type]||textures.diamond)+'.png'}
  width={128} height={128} alt={label} aria-hidden={label?undefined:true}
  loading="lazy" decoding="async" draggable={false}/>;
}
