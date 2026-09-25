import {timingSafeEqual} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {adminDb,rpc,settings} from '@/lib/partner-enrollment/server';
import {deliverEnrollmentMail} from '@/lib/partner-enrollment/mail';

export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:NextRequest){
  const secret=process.env.CRON_SECRET||'';
  const provided=request.headers.get('authorization')||'';
  const expected='Bearer '+secret;
  if(secret.length<32||Buffer.byteLength(provided)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(provided),Buffer.from(expected)))return NextResponse.json({error:'Unauthorized'},{status:401});
  try{
    settings();const db=adminDb(),start=Date.now();let mailUsers=0,reconciled=0,failed=0;
    const {data:jobs,error}=await db.from('partner_enrollment_mail').select('user_id').in('state',['pending','failed','sending']).order('created_at').limit(50);
    if(error)throw new Error('UNAVAILABLE');
    for(const userId of new Set((jobs||[]).map(row=>row.user_id))){
      if(Date.now()-start>42000)break;
      try{await deliverEnrollmentMail(userId);mailUsers++;}catch{failed++;}
    }
    const {data:rows,error:readError}=await db.from('partner_enrollment_checkouts').select('checkout_id,user_id,customer_id,subscription_id').not('subscription_id','is',null).order('reconciled_at',{ascending:true,nullsFirst:true}).limit(20);
    if(readError)throw new Error('UNAVAILABLE');
    for(const row of rows||[]){
      if(Date.now()-start>50000)break;
      try{
        await rpc('partner_enrollment_checkout_bind',{p_checkout:row.checkout_id,p_user:row.user_id,p_customer:row.customer_id,p_subscription:row.subscription_id});
        await rpc('partner_enrollment_reconcile',{p_subscription:row.subscription_id});
        const {error:saveError}=await db.from('partner_enrollment_checkouts').update({reconciled_at:new Date().toISOString()}).eq('checkout_id',row.checkout_id);
        if(saveError)throw saveError;reconciled++;
      }catch{failed++;}
    }
    // Counts only: identity, message contents and credentials never enter job logs.
    return NextResponse.json({mailUsers,reconciled,failed},{status:failed?503:200});
  }catch{return NextResponse.json({error:'Job unavailable'},{status:503});}
}
