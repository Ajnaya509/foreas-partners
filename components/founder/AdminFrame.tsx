'use client';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/foreas/AdminSidebar';
import { TopBar } from '@/components/foreas/TopBar';
export function AdminFrame({children,adminName,adminEmail}:{children:React.ReactNode;adminName:string;adminEmail:string}){
  const pathname=usePathname();
  if(pathname==='/admin/ajnaya')return <>{children}</>;
  return <div className="flex min-h-screen"><AdminSidebar adminName={adminName} adminEmail={adminEmail}/><div className="flex-1 flex flex-col min-w-0"><TopBar partnerName={adminName} notificationsCount={0}/><main className="flex-1 px-lg lg:px-xl py-lg lg:py-xl">{children}</main></div></div>;
}
