import 'server-only';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {cache} from 'react';
export const kitBrand=cache(async()=>{
  const folder=join(process.cwd(),'public');
  const [inter,genos,svg]=await Promise.all([readFile(join(folder,'fonts/Inter-Regular.ttf')),readFile(join(folder,'fonts/Genos-Variable.ttf')),readFile(join(folder,'logo-full.svg'),'utf8')]);
  const logo=svg.replace('viewBox="0 0 375 374.999991"','viewBox="0 165 375 53"').replace('width="500"','width="180"').replace('height="500"','height="26"');
  return {css:`@font-face{font-family:Inter;src:url(data:font/ttf;base64,${inter.toString('base64')}) format('truetype');font-weight:400}@font-face{font-family:Genos;src:url(data:font/ttf;base64,${genos.toString('base64')}) format('truetype');font-weight:100 900}.brand{background:#111528;padding:20px;display:inline-block;line-height:0}`,logo:`<div class="brand">${logo}</div>`};
});
