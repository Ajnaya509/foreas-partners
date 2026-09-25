import { createClient } from '@/lib/supabase/server';
import { authenticateFounder } from '@/lib/founder/access';
import { founderConfiguration } from '@/lib/founder/config';
import { handleFounderRequest } from '@/lib/founder/handler';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=30;
async function handle(req:Request,context:{params:Promise<{path?:string[]}>}){
  const config=founderConfiguration(), client=await createClient();
  return handleFounderRequest(req,(await context.params).path||[],{
    authenticate:sensitive=>authenticateFounder(client,config.identity,sensitive?120_000:300_000),
    configured:config.configured,sensitiveEnabled:config.sensitiveEnabled,codeReviewEnabled:config.codeReviewEnabled,payoutEnabled:config.payoutEnabled,
    origin:process.env.NODE_ENV==='development'?new URL(req.url).origin:'https://partners.foreas.xyz',
    gatewayOptions:{brainOrigin:config.origin,authority:config.authority,transport:fetch,timeoutMs:10000}
  });
}
export const GET=handle;
export const POST=handle;
