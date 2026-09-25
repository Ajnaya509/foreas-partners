import {NextResponse} from 'next/server';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {previewEnabled} from '@/lib/partner/model';
export const dynamic='force-dynamic';
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]??char));
const inline=(value:string)=>escapeHtml(value).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
export async function GET(){
  if(!previewEnabled())return new NextResponse('Document introuvable',{status:404});
  const markdown=await readFile(join(process.cwd(),'content/partner/conditions/CONDITIONS_PROGRAMME_2026-09-24.1.md'),'utf8');
  const content=markdown.trim().split(/\n\s*\n/).map(block=>{
    if(block.startsWith('## '))return `<h2>${inline(block.slice(3))}</h2>`;
    if(block.startsWith('# '))return `<h1>${inline(block.slice(2))}</h1>`;
    return `<p>${inline(block.replace(/\n/g,' '))}</p>`;
  }).join('');
  const body=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conditions partenaires FOREAS · Aperçu</title><style>@font-face{font-family:ForeasInter;src:url('/fonts/Inter-Regular.ttf')}@font-face{font-family:ForeasInter;src:url('/fonts/Inter-Bold.ttf');font-weight:700}@font-face{font-family:ForeasGenos;src:url('/fonts/Genos-Variable.ttf')}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f6f7fb;color:#1d1d1f;font:16px/1.7 ForeasInter,Arial,sans-serif}header{background:#20183a;color:white;padding:28px max(24px,calc((100vw - 940px)/2))}header span{font:28px/1 ForeasGenos,Arial,sans-serif;letter-spacing:.08em}main{max-width:940px;margin:32px auto;padding:clamp(24px,5vw,70px);background:white;border:1px solid #e7e5ee;border-radius:24px;box-shadow:0 18px 52px rgba(25,19,53,.07)}h1,h2{font-family:ForeasGenos,Arial,sans-serif;line-height:1.15;letter-spacing:-.015em}h1{font-size:clamp(32px,5vw,52px);margin:0 0 18px}h2{font-size:clamp(26px,3.3vw,36px);margin:56px 0 16px;padding-top:24px;border-top:1px solid #e7e5ee}p{margin:0 0 20px;color:#34313b}strong{color:#17131f}footer{text-align:center;padding:0 20px 32px;color:#676374;font-size:13px}@media(max-width:600px){body{background:white}header{padding:20px}main{margin:0;padding:28px 20px;border:0;border-radius:0;box-shadow:none}h2{margin-top:40px}}</style></head><body><header><span>FOREAS/</span></header><main>${content}</main><footer>© 2026 FOREAS. Tous droits réservés.</footer></body></html>`;
  return new NextResponse(body,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
}
