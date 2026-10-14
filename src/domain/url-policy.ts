import type {AppLink,Resource,ResourceVersion} from './types';
import {resourceForVersion} from './visibility';
export const ALLOWED_APP_HOSTS = ['gayageum-fingering-edu.vercel.app'];
export interface UrlValidation { valid:boolean; url:string|null; reason:string|null }
export function validateAppUrl(input:string|null,allowedHosts:readonly string[]=ALLOWED_APP_HOSTS):UrlValidation {
 const bad=(reason:string):UrlValidation=>({valid:false,url:null,reason});
 if(!input)return bad('연결 주소가 없습니다.');
 if(input!==input.trim()||input.startsWith('//')||/[\u0000-\u0020\\]/u.test(input))return bad('올바른 HTTPS 주소를 입력하세요.');
 let url:URL;try{url=new URL(input);}catch{return bad('주소 형식이 올바르지 않습니다.');}
 if(url.protocol!=='https:')return bad('HTTPS 주소만 허용합니다.');
 if(url.username||url.password)return bad('사용자 정보가 포함된 주소는 허용하지 않습니다.');
 if(url.port&&url.port!=='443')return bad('비표준 포트는 허용하지 않습니다.');
 const host=url.hostname.toLowerCase().replace(/\.$/,'');
 if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')||host.includes(':')||/^[0-9.]+$/.test(host))return bad('내부망 또는 IP 주소는 허용하지 않습니다.');
 if(!allowedHosts.includes(host))return bad('허용 호스트 목록에 없는 주소입니다.');
 for(const [key,value] of url.searchParams){if(/token|secret|api.?key|auth|email|student|school|name|phone|session|password|user/i.test(key)||/@/.test(value))return bad('개인 정보 또는 인증 정보 query는 허용하지 않습니다.');}
 if(/(?:token|secret|auth|password|email|student)=/i.test(url.hash))return bad('인증 정보 또는 개인 정보 fragment는 허용하지 않습니다.');
 return {valid:true,url:url.href,reason:null};
}
export function canUseApp(app:AppLink,resource:Resource,version:ResourceVersion):boolean {
 resource=resourceForVersion(resource,version);
 return Boolean(app.enabled&&app.status==='available'&&validateAppUrl(app.url).valid&&app.sourceEvidence?.trim()&&app.checkedAt&&app.checkEvidence?.trim()&&app.availabilityCheck&&app.contentCompatibilityCheck&&app.privacyPermissionCheck&&app.contentAccuracyChecked&&app.requiresCamera==='no'&&app.requiresMicrophone==='no'&&app.requiresLogin==='no'&&app.scope!=='excluded_mismatch'&&app.instruments.includes(resource.instrument)&&app.instrumentSystem&&app.instrumentSystem!=='unknown'&&resource.instrumentSystem!=='unknown'&&app.instrumentSystem===resource.instrumentSystem&&version.gugakContext.variant.value&&app.instrumentSystem===version.gugakContext.variant.value&&version.gugakContext.instrumentId===resource.instrument&&app.notationKinds.length&&app.notationKinds.every(n=>n!=='unknown'&&version.gugakContext.notationKinds.includes(n))&&app.objectives.length&&app.objectives.some(o=>resource.objectives.includes(o)));
}
