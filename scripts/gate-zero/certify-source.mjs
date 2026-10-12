#!/usr/bin/env node
// GATE0: read-only static audit. Never performs OTP, API, database or Git writes.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
const root=resolve(import.meta.dirname, '../..');
const read=(p)=>{try{return readFileSync(resolve(root,p),'utf8');}catch{return '';}};
const json=(p)=>JSON.parse(read(p)||'{}');
const app=json('app.json').expo||{}, eas=json('eas.json'), pkg=json('package.json');
const login=read('src/screens/LoginScreen.tsx');
const preflight=read('src/lib/login-preflight-action.ts');
const msg=read('src/lib/msg91-otp-contract.ts');
const build=read('scripts/validate-msg91-build-config.mjs');
const android=read('.github/workflows/android-uat-eas-build.yml');
const workflow=read('.github/workflows/buyer-mobile-golden-path-certification.yml');
const cut=(a,b)=>{const start=login.indexOf(a);return start<0?'':login.slice(start,login.indexOf(b,start+a.length)>=0?login.indexOf(b,start+a.length):undefined);};
const send=cut('async function requestOtp(','async function verifyOtp(');
const verify=cut('async function verifyOtp(','async function completeLogin(');
const bridge=cut('async function completeLogin(','async function resendOtp(');
const resend=cut('async function resendOtp(','return (');
const checks=[];
function test(id,description,pass,evidence){
 checks.push({id,description,status:pass?'PASS':'FAIL',evidence});
}
function pending(id,description,reason){
 checks.push({id,description,status:'BLOCKED',evidence:reason});
}
const sha=/^[0-9a-f]{40}$/, head=process.env.GATE0_HEAD_SHA||'UNBOUND', main=process.env.GATE0_MAIN_SHA||'UNBOUND';
test('G0-SHA','Exact source provenance',sha.test(head)&&sha.test(main),'Git SHA values bound from the checkout. Head is a candidate, not an installed APK.');
test('G0-APK-STATIC','Android internal APK configuration',app?.android?.package==='com.oasisbaklawa.customer'&&app?.extra?.eas?.projectId==='369e4480-3bbf-49cd-8a10-5bac5f8290a1'&&eas?.build?.preview?.distribution==='internal'&&eas?.build?.preview?.environment==='preview'&&!!eas?.build?.preview?.android,'app.json + eas.json; build metadata not physical-device proof.');
test('G0-MSG91-STATIC','Native MSG91 post-install configuration guard',pkg?.scripts?.['eas-build-post-install']==='node scripts/validate-msg91-build-config.mjs'&&['EXPO_PUBLIC_MSG91_WIDGET_ID','EXPO_PUBLIC_MSG91_TOKEN_AUTH','EXPO_PUBLIC_SUPABASE_ANON_KEY','CENTRAL_WEB_WIDGET_IDS'].every(k=>build.includes(k)),'Confirms a build-time safeguard exists, not provider delivery or widget registration.');
test('G0-PREFLIGHT','Eligibility preflight before OTP send',send.includes('invokeBuyerPreflight(')&&send.indexOf('decideLoginAction(')>send.indexOf('invokeBuyerPreflight(')&&send.indexOf('sendMsg91Otp(')>send.indexOf('decideLoginAction(')&&preflight.includes('preflight.state === "approved" && preflight.allowOtp === true'),'Static control-flow inspection; unit tests execute separately.');
test('G0-REQID','MSG91 provider acknowledgement needs request id',msg.includes('if (!reqId)')&&msg.includes('msg91_send_failed')&&send.includes('setReqId(sendResult.reqId)'),'A request ID is not SMS delivery confirmation.');
test('G0-HANDOFF','OTP verify then Supabase bridge then dashboard route',verify.includes('verifyMsg91Otp(')&&verify.indexOf('completeLogin(')>verify.indexOf('verifyMsg91Otp(')&&bridge.includes('bridgeMsg91SessionAndClaim(')&&bridge.indexOf('routeFromBuyerSnapshot(')>bridge.indexOf('bridgeMsg91SessionAndClaim('),'Static source wiring; actual session and UI navigation unverified.');
test('G0-RESEND','Resend must refresh preflight',resend.includes('invokeBuyerPreflight(')&&resend.indexOf('retryMsg91Otp(')>resend.indexOf('invokeBuyerPreflight('),'Existing source guard; provider still untested.');
test('G0-EAS','EAS APK release binds to main and exact release SHA',android.includes('RELEASE_SHA_INPUT')&&android.includes('refs/heads/main')&&android.includes('npx --yes "eas-cli@')&&android.includes('--profile preview'),'Provenance guard present, but no signed APK was verified or installed.');
test('G0-CERT-DISTINCTION','Email/password synthetic auth not conflated with MSG91 OTP',workflow.includes('BUYER_CERT_EMAIL')&&workflow.includes('BUYER_CERT_PASSWORD')&&!workflow.includes('verifyMsg91Otp('),'Existing scheduled golden path is NOT an actual OTP test.');
pending('G0-SCHEDULE','Green scheduled Buyer job must bind to release main',workflow.includes("cursor/buyer-tranche5-parity-594b")?'Existing scheduled workflow checks out a feature branch. Its green result must not be attributed to Buyer main.':'Separate exact deployed SHA comparison still required.');
pending('G0-APK-LIVE','Actual APK/device and backend binding','Installed APK SHA/EAS build ID, Supabase project and physical device evidence not provided.');
pending('G0-MSG91-LIVE','Real MSG91 OTP delivery and verification','No real SMS/email/provider interaction is performed by this read-only audit.');
pending('G0-SESSION-LIVE','Actual native buyer session, role, dashboard and restart','A synthetic authenticated RPC probe cannot prove these on Android hardware.');
pending('G0-AI','Independent adversarial AI review','Requires separate model review of exact bot evidence and code; model assertions without execution are not PASS.');
pending('G0-STAFF','Staff rehearsal on actual physical Android','Requires authorized test SIM, recorded APK and signed observations.');
pending('G0-OWNER','Owner final acceptance','Must not start until Bot, AI and staff physical evidence is complete.');
const failed=checks.filter(c=>c.status==='FAIL');
const report={schema:'oasis.gate0.v1',at:new Date().toISOString(),ownerIssue:'https://github.com/oasisbaklawa2006/Oasis-Baklawa-Central/issues/632',repository:'oasisbaklawa2006/oasis-baklawa',head,main,candidateEqualsMain:head===main,staticResult:failed.length?'FAIL':'PASS',overallReadiness:failed.length?'FAIL':'BLOCKED',note:'Source static PASS does not certify live-provider, physical device, or production readiness.',checks};
const dest=resolve(process.env.GATE0_REPORT_DIR||'gate-zero-evidence');
mkdirSync(dest,{recursive:true});
writeFileSync(resolve(dest,'report.json'),JSON.stringify(report,null,2)+'\n');
const md=['# Gate Zero / source-only audit','','- Candidate SHA: '+head,'- Main SHA: '+main,'- Static outcome: **'+report.staticResult+'**','- Overall mobile UAT readiness: **'+report.overallReadiness+'**','','| Gate | Status | Evidence |','|---|---|---|',...checks.map(c=>'| '+c.id+' | '+c.status+' | '+c.evidence.replaceAll('|','/').replaceAll('\n',' ')+' |'),'','No provider calls, SMS sends, production database writes or deployments were executed.',''].join('\n');
writeFileSync(resolve(dest,'report.md'),md);
console.log('GATE0_STATIC='+report.staticResult+' GATE0_OVERALL='+report.overallReadiness);
console.log('GATE0_PENDING='+checks.filter(c=>c.status==='BLOCKED').map(c=>c.id).join(','));
if(failed.length)process.exitCode=1;
