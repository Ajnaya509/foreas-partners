import type {Metadata} from 'next';
import localFont from 'next/font/local';

const inter = localFont({src: '../../public/fonts/Inter-Regular.ttf', variable: '--font-foreas-inter', display: 'swap'});
const genos = localFont({src: '../../public/fonts/Genos-Variable.ttf', variable: '--font-foreas-genos', display: 'swap'});
export const metadata:Metadata={title:'FOREAS — Espace partenaire',robots:{index:false,follow:false}};
export default function PartnerLayout({children}:{children:React.ReactNode}){return <div className={`${inter.variable} ${genos.variable}`}>{children}</div>;}
