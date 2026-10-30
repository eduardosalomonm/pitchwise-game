// Lossless geometry: compress generated originals for the web; never crop or stretch.
import {readFile,mkdir,access} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const manifest=JSON.parse(await readFile(process.argv[2],'utf8'));
const assets=Array.isArray(manifest)?manifest:manifest.assets;
const target=path.resolve('public/illustrations/actions');
await mkdir(target,{recursive:true});
for(const asset of assets){
 const id=asset.id??asset.scenarioId;
 if(!/^[a-z0-9-]+$/.test(id))throw new Error('Invalid asset identifier');
 const source=asset.path??asset.imagePath;
 const destination=path.join(target,`${id}.webp`);
 try{await access(destination);throw new Error(`Refusing to replace ${destination}`);}catch(error){if(error.code!=='ENOENT')throw error;}
 const metadata=await sharp(source).metadata();
 if(Math.abs(metadata.width/metadata.height-1.5)>.02)throw new Error(`Unexpected aspect ratio for ${id}: ${metadata.width}x${metadata.height}`);
 await sharp(source).resize(1536,1024,{fit:'contain',background:'#173c27'}).webp({quality:82,effort:5}).toFile(destination);
 console.log(`${id}: 1536x1024`);
}
