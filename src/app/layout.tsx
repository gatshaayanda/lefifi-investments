import type {Metadata,Viewport} from "next";
import {headers} from "next/headers";
import {Analytics} from "@vercel/analytics/next";
import {SpeedInsights} from "@vercel/speed-insights/next";
import PwaRegister from "@/app/pwa-register";
import Script from "next/script";
import "./globals.css"; import "./pwa.css"; import "./install-card.css";
const siteUrl=process.env.NEXT_PUBLIC_BASE_URL||"https://lefifi.co.bw";
const EMBEDDED_BROWSER_PATTERN=/WhatsApp|Instagram|FBAN|FBAV|Messenger|Line[/]|Twitter|TikTok|Snapchat/i;
export const metadata:Metadata={metadataBase:new URL(siteUrl),title:{default:"Lefifi Investments | Events & Production",template:"%s | Lefifi"},description:"Event planning, equipment hire and technical production by Lefifi Investments in Gaborone, Botswana.",applicationName:"Lefifi",keywords:["Lefifi Investments","event planning","equipment hire","LED screens","sound","lighting","stage production","Botswana"],alternates:{canonical:"/"},openGraph:{type:"website",url:siteUrl,siteName:"Lefifi",title:"Lefifi Investments | Events & Production",description:"Plan an event or request equipment and production services from Lefifi Investments."},twitter:{card:"summary",title:"Lefifi Investments | Events & Production",description:"Plan an event or request equipment and production services from Lefifi Investments."},icons:{icon:[{url:"/lefifi.jpg",type:"image/jpeg"}],apple:"/lefifi.jpg"},manifest:"/manifest.webmanifest",appleWebApp:{capable:true,title:"Lefifi",statusBarStyle:"default"}};
export const viewport:Viewport={themeColor:"#09131e",colorScheme:"light"};
export default async function RootLayout({children}:{children:React.ReactNode}){
 const requestHeaders=await headers();
 const userAgent=requestHeaders.get("user-agent")||"";
 const requestedWith=requestHeaders.get("x-requested-with")||"";
 // A social referrer does not prove this browser is embedded: Chrome opened from WhatsApp
 // must not be trapped in the in-app-browser install gate.
 const embedded=EMBEDDED_BROWSER_PATTERN.test(userAgent)
   || (/Android/i.test(userAgent)&&/\bwv\b/i.test(userAgent))
   || /^(com\.whatsapp|com\.instagram\.android|com\.facebook\.katana|com\.facebook\.lite|com\.facebook\.orca)$/i.test(requestedWith);
 const android=/Android/i.test(userAgent);
 return <html lang="en"><body style={embedded?{overflow:"hidden"}:undefined}><Script id="iteration13-early-install-capture" strategy="beforeInteractive">{`
(function () {
  window.addEventListener("beforeinstallprompt", function (event) {
    var standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    if (standalone || window.__iteration13PwaListenerReady === true) return;
    event.preventDefault();
    window.__iteration13InstallPrompt = event;
  });
})();
`}</Script><PwaRegister initialEmbedded={embedded} initialAndroid={android}/>{children}<Analytics/><SpeedInsights/></body></html>
}
