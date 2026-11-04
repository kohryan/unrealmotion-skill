import {clamp, progress, random, smoother} from './runtime/motion.mjs';
import {storyState, validateStoryboard, waterSystemAt} from './runtime/story.mjs';

const ns='http://www.w3.org/2000/svg';
const label=(id,text,x,y,w=210)=>`<g id="${id}"><rect x="${x}" y="${y}" width="${w}" height="45" rx="21" fill="#f7f3df" stroke="#294450" stroke-width="2.5"/><text x="${x+w/2}" y="${y+29}" text-anchor="middle" fill="#294450" font-size="21" font-weight="750">${text}</text></g>`;

export async function createScene(config) {
  const story=validateStoryboard(await(await fetch('./storyboard.json')).json(),config.duration);
  const frame=document.querySelector('#frame');frame.classList.add('explainer');
  document.querySelector('#mark').style.display='none';
  const style=document.createElement('style');style.textContent=`
    @font-face{font-family:UnrealInter;src:url('./runtime/fonts/inter-latin-wght-normal.woff2') format('woff2');font-weight:100 900;font-display:block}
    #frame.explainer{font-family:UnrealInter,Arial,sans-serif;background:#e6eee8}#frame.explainer #stage svg{display:block;width:100%;height:100%;font-family:UnrealInter,Arial,sans-serif}
    #frame.explainer #copy{left:0;top:0;width:100%;height:100%;transform:none!important;opacity:1!important}
    .story-top{position:absolute;left:7%;right:7%;top:4.3%;display:flex;justify-content:space-between;align-items:center;gap:2cqw;color:#294450;font-size:2.1cqw;font-weight:750;letter-spacing:.14em;text-transform:uppercase}
    .story-top .story-count{padding:1.1cqw 1.8cqw;border:1px solid #29445040;border-radius:8cqw;background:#f7f3dfd9;letter-spacing:.08em;font-size:1.9cqw;white-space:nowrap}
    .story-top>span:first-child{padding:1.1cqw 1.5cqw;background:#f7f3dfed;border-radius:1.4cqw}
    .story-caption{position:absolute;left:7%;right:7%;bottom:6%;text-align:center;color:#f7f4e7}
    #frame.explainer .story-caption h1{display:inline-block;font-size:5.1cqw;font-weight:760;line-height:1.18;letter-spacing:-.045em;white-space:pre-line;margin:0;padding:1.6cqw 2.5cqw;background:#294450;border-radius:2cqw;box-shadow:0 .5cqw 0 #17313a25}
    #frame.explainer .story-caption p{font-size:2.7cqw;font-weight:560;line-height:1.5;color:#294450;background:#f7f3dfe8;border-radius:1.3cqw;padding:1.5cqw 2cqw;margin:1.4cqw auto 0;max-width:100%;display:table;letter-spacing:-.01em}
    .story-progress{position:absolute;bottom:3.4%;left:7%;right:7%;height:.4cqw;border-radius:1cqw;background:#29445020;overflow:hidden}.story-progress span{display:block;height:100%;width:100%;transform-origin:left;background:#d3aa54}
    #frame.explainer .story-foot{position:absolute;bottom:1.3%;left:7%;right:7%;color:#29445090;font-size:1.5cqw;letter-spacing:.13em;text-align:center;text-transform:uppercase}
  `;document.head.append(style);
  const copy=document.querySelector('#copy');copy.replaceChildren();
  const top=document.createElement('div');top.className='story-top';
  const title=document.createElement('span');title.textContent=story.title;
  const counter=document.createElement('span');counter.className='story-count';top.append(title,counter);
  const caption=document.createElement('div');caption.className='story-caption';caption.dataset.safe='true';
  const heading=document.createElement('h1'),detail=document.createElement('p');caption.append(heading,detail);
  const bar=document.createElement('div');bar.className='story-progress';const fill=document.createElement('span');bar.append(fill);
  const foot=document.createElement('div');foot.className='story-foot';foot.textContent='Skema konseptual · kontrol berbasis level';copy.append(top,caption,bar,foot);
  const rng=random(config.seed),specks=Array.from({length:35},()=>`<circle cx="${rng()*120}" cy="${rng()*120}" r="${0.5+rng()*1.4}" fill="#294450" opacity=".1"/>`).join('');
  const fins=Array.from({length:9},(_,i)=>`<path d="M${345+i*10} 1015V1101" stroke="#294450" stroke-width="4" opacity=".6"/>`).join('');
  const bolts=Array.from({length:8},(_,i)=>{const a=i/8*Math.PI*2;return `<circle cx="${455+Math.cos(a)*56}" cy="${1075+Math.sin(a)*56}" r="5" fill="#d8c79b" stroke="#294450" stroke-width="2"/>`;}).join('');
  const blades=Array.from({length:6},(_,i)=>`<path d="M449 1069Q476 1060 487 1036L500 1046Q490 1075 461 1084Z" transform="rotate(${i*60} 455 1075)" fill="#d8b964" stroke="#294450" stroke-width="2.2"/>`).join('');
  const windows=Array.from({length:3},(_,i)=>`<path d="M${455+i*33} 748V876" stroke="#acc2c1" stroke-width="3"/>`).join('');
  const pipeIn='M180 1460V1190Q180 1075 290 1075H395';
  const pipeOut='M455 1010V975Q455 940 490 940H590Q620 940 620 910V335Q620 300 655 300H725Q745 300 745 320V371';
  const pipeUse='M870 520H920Q947 520 947 548V865Q947 920 900 920H835V961';
  const pipe=(id,d)=>`<path d="${d}" fill="none" stroke="#294450" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#bac9ca" stroke-width="21" stroke-linecap="round"/><path id="${id}" d="${d}" fill="none" stroke="#63b5d7" stroke-width="9" stroke-linecap="round"/>`;
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 -40 1080 1920');svg.setAttribute('aria-label','Diagram ilustratif sistem pengisian toren: sumber air, pompa sentrifugal, pipa, toren dan kontrol level.');
  svg.innerHTML=`
    <defs>
      <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#dcecf1"/><stop offset="1" stop-color="#f0f1df"/></linearGradient>
      <linearGradient id="water" x2="0" y2="1"><stop stop-color="#a1d4df"/><stop offset="1" stop-color="#67aacc"/></linearGradient>
      <linearGradient id="steel" x2="1" y2=".3"><stop stop-color="#a4b6bd"/><stop offset=".45" stop-color="#e6eae0"/><stop offset="1" stop-color="#829da9"/></linearGradient>
      <pattern id="paper" width="120" height="120" patternUnits="userSpaceOnUse">${specks}</pattern>
      <clipPath id="tank-clip"><rect x="681" y="361" width="183" height="176" rx="11"/></clipPath>
      <clipPath id="well-clip"><rect x="125" y="1175" width="120" height="350" rx="8"/></clipPath>
      <clipPath id="pump-clip"><circle cx="455" cy="1075" r="48"/></clipPath>
    </defs>
    <rect x="-3000" y="-3000" width="7000" height="7000" fill="url(#sky)"/>
    <circle cx="160" cy="260" r="39" fill="#eddaa0" opacity=".85"/>
    <g fill="#f8f8eb" opacity=".9"><ellipse cx="320" cy="210" rx="53" ry="15" transform="rotate(-8 320 210)"/><ellipse cx="960" cy="400" rx="62" ry="17" transform="rotate(-8 960 400)"/></g>
    <g stroke="#8b9f8d" stroke-width="3"><path d="M15 1070V817L112 728 212 817V1070Z" fill="#e4ddbf"/><path d="M0 820L112 728 225 820Z" fill="#be846e"/><rect x="89" y="972" width="48" height="98" fill="#aecbd5"/>
    <path d="M215 1090V910Q236 851 269 902Q300 813 336 885Q377 841 391 940V1090" fill="#b5c5a2"/><path d="M310 1080V969M310 1009L274 974M310 1031L345 994" fill="none"/></g>
    <path d="M0 1110H1080V1165H0Z" fill="#a9ba90"/>
    <path d="M0 1150H1080V1350H0Z" fill="#c3ac83"/>
    <path d="M0 1265H1080V1310H0Z" fill="#ccb993" opacity=".7"/>
    <rect x="-2000" y="1350" width="5000" height="3500" fill="#8cb8c4"/>
    <rect x="-1000" y="1120" width="3500" height="3000" fill="url(#paper)"/>
    <path d="M0 1150H1080M0 1350H1080" fill="none" stroke="#294450" stroke-width="3" opacity=".3"/>
    <g stroke="#294450" stroke-width="3.4" stroke-linejoin="round">
      <path d="M383 612L925 590V1110L383 1134Z" fill="#eee8d0"/>
      <path d="M383 612L347 586V1110L383 1134Z" fill="#c3c9b4"/>
      <path d="M347 586L885 564 950 590 383 614Z" fill="#dedcc4"/>
      <path d="M383 936L925 914V944L383 966Z" fill="#c6cbb8"/>
      <path d="M383 1110L925 1088V1130L383 1150Z" fill="#b8bead"/>
      <rect x="448" y="742" width="150" height="145" rx="4" fill="#e4efec"/>${windows}
      <path d="M448 802H598" stroke="#acc2c1"/>
      <rect x="697" y="700" width="166" height="143" rx="4" fill="#d7e8e5"/>
      <path d="M707 822L752 771 787 800 833 750 853 822Z" fill="#aabf9c" stroke="none"/>
      <path d="M697 843H863" stroke="#294450"/>
      <rect x="422" y="893" width="169" height="12" rx="4" fill="#af9375"/>
      <path d="M455 892V855M455 869Q427 838 436 823Q463 827 455 866M455 874Q488 842 487 826Q459 830 455 866" fill="#9aaf86"/>
      <path d="M433 871H478L470 892H442Z" fill="#b18168"/>
      <path d="M775 1010H903V1094H775Z" fill="#c3c4ac"/>
      <path d="M767 1000H910V1020H767Z" fill="#e2ddc5"/>
      <path d="M794 1000Q833 1029 881 1000" fill="#a8bec4"/>
      <path d="M785 1092V1132M891 1092V1125" fill="none"/>
    </g>
    <g stroke="#294450" stroke-width="3.4">
      <rect x="108" y="1141" width="153" height="400" rx="12" fill="#e2e1c9"/>
      <rect x="125" y="1175" width="120" height="350" rx="8" fill="#d4e3de"/>
      <g clip-path="url(#well-clip)"><rect x="120" y="1350" width="135" height="190" fill="url(#water)" stroke="none"/><path d="M121 1352Q155 1344 185 1352T250 1352" fill="none" stroke="#e6f3ee" stroke-width="4"/></g>
      <path d="M109 1210H128M109 1260H128M109 1310H128M109 1360H128M109 1410H128M109 1460H128M109 1510H128" fill="none" stroke="#778e96"/>
      <rect x="90" y="1125" width="190" height="42" rx="8" fill="#d2d2b9"/>
    </g>
    <g id="inlet-pipes">${pipe('inlet-flow',pipeIn)}<rect x="164" y="1443" width="33" height="38" rx="7" fill="#607d89" stroke="#294450" stroke-width="3"/><path d="M168 1451H194M168 1458H194M168 1465H194" stroke="#c0d1ce" stroke-width="3"/></g>
    <g id="riser-pipes">${pipe('riser-flow',pipeOut)}</g>
    <g id="use-pipes">${pipe('use-flow',pipeUse)}<path d="M814 964H855V977H843V989H828V977H814Z" fill="url(#steel)" stroke="#294450" stroke-width="3"/><path d="M824 958H846M835 952V964" stroke="#294450" stroke-width="5" stroke-linecap="round"/></g>
    <g id="tank" stroke="#294450" stroke-width="3.3">
      <path d="M650 555L888 549 915 567 672 575Z" fill="#e0dcc3"/><path d="M672 575H915V594H672Z" fill="#b8c2b5"/>
      <rect x="665" y="328" width="215" height="226" rx="28" fill="#5487a7"/>
      <ellipse cx="772.5" cy="329" rx="107.5" ry="29" fill="#477b9d"/>
      <rect x="681" y="361" width="183" height="176" rx="11" fill="#edf1df"/>
      <g clip-path="url(#tank-clip)"><rect id="tank-water" x="680" y="495" width="185" height="50" fill="url(#water)" stroke="none"/><path id="tank-surface" d="M680 495H865" fill="none" stroke="#e7f4ed" stroke-width="3"/></g>
      <path d="M772 361V537" fill="none" stroke="#294450" stroke-opacity=".25" stroke-width="2"/>
      <g id="thresholds" font-size="16" font-weight="700" stroke-width="1.3"><path d="M686 393H858M686 467H858" stroke="#294450" stroke-dasharray="7 7"/><text x="690" y="387" fill="#294450" stroke="none">OFF</text><text x="690" y="487" fill="#294450" stroke="none">ON</text></g>
      <path d="M843 368V528" stroke="#6f8f98" stroke-width="4"/>
      <g id="float"><rect x="830" y="440" width="26" height="24" rx="11" fill="#e0bf67"/><circle cx="843" cy="452" r="3" fill="#294450" stroke="none"/></g>
      <path id="tank-inflow" d="M745 371V490" fill="none" stroke="#62b5d9" stroke-width="6" stroke-dasharray="8 8" stroke-linecap="round"/>
    </g>
    <g id="pump" stroke="#294450" stroke-width="3.2" stroke-linejoin="round">
      <path d="M315 1126H534L550 1151H327Z" fill="#d0cfb6"/><path d="M327 1151H550V1170H327Z" fill="#b1bba9"/>
      <rect x="333" y="1005" width="114" height="104" rx="24" fill="#617e8a"/>${fins}
      <rect x="376" y="984" width="59" height="30" rx="8" fill="#aac0c3"/>
      <path d="M352 1107V1126H380V1108M478 1112V1126H510V1104" fill="#38596b"/>
      <circle cx="455" cy="1075" r="65" fill="#38596b"/>
      <g clip-path="url(#pump-clip)"><circle cx="455" cy="1075" r="49" fill="#87bfcd" stroke="none"/><g id="impeller">${blades}</g><g id="internal-stream" fill="#edf9f0" stroke="#4c9dc2" stroke-width="1.3"></g><circle cx="455" cy="1075" r="13" fill="#3c7ca1" stroke-width="3"/></g>
      <g id="pump-cover"><circle cx="455" cy="1075" r="64" fill="#ceb16b"/>${bolts}<circle cx="455" cy="1075" r="43" fill="none" stroke="#ad914e" stroke-width="4"/><path d="M433 1064L448 1047 474 1050 487 1070 477 1092 451 1100 433 1085" fill="none" stroke="#294450" stroke-opacity=".3" stroke-width="3"/></g>
      <rect x="488" y="997" width="33" height="39" rx="8" fill="#d9c17d"/><circle id="pump-status" cx="504" cy="1010" r="5" fill="#6d9b7b" stroke="none"/>
    </g>
    <g id="streams" fill="#ebf8ed" stroke="#4c9dc2" stroke-width="2"></g>
    <g id="tap-drops" fill="#6cb6d1" stroke="#294450" stroke-width="1.8"></g>
    <path id="signal-wire" d="M850 355H912V595H568V1008H521" fill="none" stroke="#cc9d46" stroke-width="4" stroke-dasharray="9 9" opacity="0"/>
    <g id="labels">
      ${label('source-label','SUMBER AIR',56,1281,230)}
      ${label('pump-label','POMPA',322,1191,220)}
      ${label('tank-label','TOREN',653,240,233)}
      ${label('impeller-label','IMPELLER',372,1156,178)}
      ${label('riser-label','PIPA TEGAK',646,752,207)}
      ${label('control-label','KONTROL LEVEL',670,607,242)}
    </g>
    <rect x="-1500" y="-1500" width="4000" height="5000" fill="url(#paper)" opacity=".28" pointer-events="none"/>
  `;
  document.querySelector('#stage').append(svg);
  const $=id=>svg.querySelector('#'+id);
  const streams=$('streams'),drops=$('tap-drops');
  const makeCircle=(parent,r)=>{const e=document.createElementNS(ns,'circle');e.setAttribute('r',r);parent.append(e);return e;};
  const paths=[$('inlet-flow'),$('riser-flow'),$('use-flow')];
  const flowParticles=paths.map((path,p)=>Array.from({length:p===1?20:10},()=>makeCircle(streams,p===1?4.5:5)));
  const tapDrops=Array.from({length:7},()=>makeCircle(drops,4.5));
  const internalDrops=Array.from({length:7},()=>makeCircle($('internal-stream'),2.7));
  let state;
  return {
    update(seconds,u) {
      state=storyState(story,seconds);const t=u*60,system=waterSystemAt(t),{beat,index,camera}=state;
      const width=1080/camera.scale,height=width*config.height/config.width;
      svg.setAttribute('viewBox',`${camera.x-width/2} ${camera.y-height/2} ${width} ${height}`);
      heading.textContent=beat.caption;detail.textContent=beat.detail;caption.style.opacity=state.captionOpacity;
      counter.textContent=`${String(index+1).padStart(2,'0')} / ${String(story.beats.length).padStart(2,'0')}`;fill.style.transform=`scaleX(${u})`;
      const cutaway=smoother(progress(t,9.6,10.4))*(1-smoother(progress(t,22,23)));
      $('pump-cover').setAttribute('opacity',String(1-cutaway*0.97));$('impeller').setAttribute('transform',`rotate(${system.impellerAngle} 455 1075)`);
      internalDrops.forEach((dot,i)=>{const phase=(system.travel*1.4+i/7)%1,r=5+42*phase,angle=-Math.PI/2-1.1*(1-phase);dot.setAttribute('cx',455+Math.cos(angle)*r);dot.setAttribute('cy',1075+Math.sin(angle)*r);dot.setAttribute('opacity',String(system.pump*cutaway*0.95));});
      $('pump-status').setAttribute('fill',system.pump>0.5?'#5b9f79':'#bf8064');
      const waterY=537-176*system.level;
      $('tank-water').setAttribute('y',waterY);$('tank-water').setAttribute('height',537-waterY+2);
      const wave=system.pump*1.3*Math.sin(t*3.8)-system.draw*0.7*Math.sin(t*2.5);
      $('tank-surface').setAttribute('d',`M680 ${waterY}Q726 ${waterY-wave*2} 772 ${waterY}T865 ${waterY}`);
      $('float').setAttribute('transform',`translate(0 ${waterY-452})`);
      $('tank-inflow').setAttribute('d',`M745 371V${waterY}`);$('tank-inflow').setAttribute('opacity',String(system.pump));$('tank-inflow').setAttribute('stroke-dashoffset',String(-system.travel*40));
      $('thresholds').setAttribute('opacity',String(index>=6?0.8:0));
      paths.forEach((path,p)=>{
        const length=path.getTotalLength(),clock=p===2?system.drawTravel:system.travel,speed=p===2?system.draw:system.pump;
        flowParticles[p].forEach((dot,i)=>{const position=path.getPointAtLength((i/flowParticles[p].length*length+clock*95)%length);dot.setAttribute('cx',position.x);dot.setAttribute('cy',position.y);dot.setAttribute('opacity',String(speed*0.85));});
      });
      tapDrops.forEach((dot,i)=>{const phase=(system.drawTravel*1.5+i/7)%1;dot.setAttribute('cx',835+Math.sin(i*1.9)*2);dot.setAttribute('cy',989+phase*24);dot.setAttribute('opacity',String(system.draw*(1-phase)*0.8));});
      const signal=index===6||index===9;
      $('signal-wire').setAttribute('opacity',signal?'.8':'0');$('signal-wire').setAttribute('stroke-dashoffset',String(-t*48));
      const opacities={'source-label':index<=1?1:0,'pump-label':index===0||index===10?1:0,'tank-label':index===0||index===5||index===10?1:0,'impeller-label':index===2||index===3?1:0,'riser-label':index===4?1:0,'control-label':signal||index===8?1:0};
      for(const [id,opacity] of Object.entries(opacities))$(id).setAttribute('opacity',String(opacity*(index===0?smoother(progress(t,id==='source-label'?0:id==='pump-label'?1.2:2.4,id==='source-label'?0.5:id==='pump-label'?1.7:2.9)):1)));
      state.system=system;state.cutaway=cutaway;
    },
    draw(){},
    inspect(){
      const values=[...Object.values(state.camera),...Object.values(state.system)];
      return {renderer:'svg',elements:svg.querySelectorAll('path,rect,circle,ellipse,polygon').length,invalid:values.every(Number.isFinite)?[]:['story-state'],beat:state.beat.id,beatIndex:state.index,action:state.beat.action,purpose:state.beat.purpose,camera:state.camera,system:state.system,cutaway:state.cutaway};
    }
  };
}
