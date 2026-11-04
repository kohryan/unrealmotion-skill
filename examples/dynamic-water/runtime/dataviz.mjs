import {clamp, mix, smoother} from './motion.mjs';

export const chartTypes = ['bar', 'race', 'line', 'donut', 'counter'];
const colors = ['#659ba8','#ddb26d','#8faf91','#bd8f7b','#8c99b7','#b9bc7d'];
const finite = n => typeof n === 'number' && Number.isFinite(n);

export function parseCSV(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  text = String(text).replace(/^\uFEFF/u, '');
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (c==='"') {
      if (quoted && text[i+1]==='"') {cell+='"';i++;}
      else if (!quoted && cell) throw new Error('Quote inside an unquoted CSV field');
      else quoted=!quoted;
    } else if (!quoted && (c===',' || c==='\n' || c==='\r')) {
      row.push(cell);cell='';
      if(c!==','){if(row.some(x=>x!==''))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}
    } else cell+=c;
  }
  if(quoted)throw new Error('Unclosed CSV quote');
  if(cell||row.length){row.push(cell);rows.push(row);}
  if(rows.length<2)throw new Error('CSV needs a header and data rows');
  const header=rows.shift().map(x=>x.trim());
  if(new Set(header).size!==header.length||header.some(x=>!x))throw new Error('CSV headers must be unique');
  return rows.map(values=>{if(values.length!==header.length)throw new Error('CSV column count mismatch');return Object.fromEntries(header.map((key,i)=>[key,values[i]]));});
}

export function dataFromCSV(text) {
  const rows=parseCSV(text), groups=new Map();
  for(const row of rows){
    if(!row.id||!Object.hasOwn(row,'value'))throw new Error('CSV requires id and value columns');
    const time=row.time===undefined?0:Number(row.time),value=row.value.trim()===''?null:Number(row.value);
    if(!finite(time)||time<0||(value!==null&&!finite(value)))throw new Error('CSV time/value must be finite machine-readable numbers');
    if(!groups.has(time))groups.set(time,[]);
    groups.get(time).push({id:row.id,label:row.label||row.id,value,...(row.x!==undefined?{x:Number(row.x)}:{})});
  }
  return {frames:[...groups].sort((a,b)=>a[0]-b[0]).map(([time,values])=>({time,values}))};
}

export function prepareData(input, {type='bar',domain,unit=''}={}) {
  if(!chartTypes.includes(type))throw new Error('Unknown chart type');
  const raw=Array.isArray(input)?{frames:[{time:0,values:input}]}:structuredClone(input);
  if(!raw?.frames?.length)throw new Error('Chart needs data frames');
  let ids,labels,xValues,previous=-Infinity;const all=[];
  for(const frame of raw.frames){
    if(!finite(frame.time)||frame.time<0||frame.time<=previous||!Array.isArray(frame.values)||!frame.values.length)throw new Error('Data frame times must increase and contain rows');
    previous=frame.time;const current=new Set();
    for(const row of frame.values){
      if(typeof row.id!=='string'||!row.id||current.has(row.id)||typeof row.label!=='string'||!row.label)throw new Error('Data rows need unique ids and labels');
      current.add(row.id);
      if(row.value===null){if(type!=='line')throw new Error('Only a line chart accepts missing values');}
      else if(!finite(row.value))throw new Error('Chart values must be finite numbers');
      else all.push(row.value);
      if(type==='donut'&&row.value<0)throw new Error('Donut values cannot be negative');
    }
    if(!ids){ids=frame.values.map(x=>x.id);labels=Object.fromEntries(frame.values.map(x=>[x.id,x.label]));xValues=frame.values.map((x,i)=>x.x??i);}
    if(current.size!==ids.length||!ids.every(id=>current.has(id)))throw new Error('Keep the same category ids across data frames');
    frame.values=ids.map(id=>frame.values.find(x=>x.id===id));
    if(frame.values.some((row,i)=>row.label!==labels[row.id]||(row.x??i)!==xValues[i]))throw new Error('Category labels and x coordinates must remain stable');
    if(type==='donut'){
      const sum=frame.values.reduce((n,row)=>n+row.value,0);
      if(!finite(sum)||!(sum>0))throw new Error('A donut needs a positive finite total');
      if(unit==='%'&&Math.abs(sum-100)>1e-6)throw new Error('Percentage donut values must sum to 100');
    }
  }
  if(!all.length)throw new Error('No numeric observations');
  if(type==='counter'&&ids.length!==1)throw new Error('A counter uses exactly one value');
  if(type==='line'&&xValues.some((x,i)=>!finite(x)||(i>0&&x<=xValues[i-1])))throw new Error('Line x coordinates must increase');
  const min=Math.min(0,...all),max=Math.max(0,...all),limits=domain||[min,max===min?min+1:max];
  if(!Array.isArray(limits)||limits.length!==2||!limits.every(finite)||limits[1]<=limits[0]||!finite(limits[1]-limits[0])||all.some(v=>v<limits[0]||v>limits[1]))throw new Error('Domain must contain every value; data cannot be silently clipped');
  if(['bar','race'].includes(type)&&(limits[0]>0||limits[1]<0))throw new Error('Bar domains must include zero');
  return {frames:raw.frames,ids,labels,xValues,domain:limits,type,unit};
}

function ranks(values) {
  return Object.fromEntries([...values].sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id)).map((v,i)=>[v.id,i]));
}

export function sampleData(data,seconds,reveal=1) {
  let index=data.frames.findIndex(frame=>frame.time>seconds)-1;
  if(index<0)index=seconds<data.frames[0].time?0:data.frames.length-1;
  const a=data.frames[index],b=data.frames[Math.min(index+1,data.frames.length-1)];
  const u=a===b?0:smoother(clamp((seconds-a.time)/(b.time-a.time)));
  const fromRanks=ranks(a.values),toRanks=ranks(b.values);
  return a.values.map((row,i)=>{
    const end=b.values[i].value;
    // A missing observation remains a visible gap until a keyframe actually supplies it.
    const value=u===0?row.value:u===1?end:row.value===null||end===null?null:mix(row.value,end,u);
    return {id:row.id,label:row.label,x:data.xValues[i],value:value===null?null:value*clamp(reveal),rank:mix(fromRanks[row.id],toRanks[row.id],u)};
  });
}

export function linePath(points,xScale,yScale) {
  let pen=false;return points.map(row=>{if(row.value===null){pen=false;return '';}const command=pen?'L':'M';pen=true;return `${command}${xScale(row.x)},${yScale(row.value)}`;}).join('');
}

export function formatValue(value,{unit='',decimals=0,locale='id-ID'}={}) {
  if(value===null)return '—';
  if(!finite(value)||!Number.isInteger(decimals)||decimals<0||decimals>6)throw new Error('Invalid numeric display precision');
  const power=10**decimals,scaled=value*power,rounded=Number.isFinite(scaled)?Math.round(scaled)/power:value;
  return new Intl.NumberFormat(locale,{minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(Object.is(rounded,-0)?0:rounded)+(unit?` ${unit}`:'');
}

export async function createDataGraphic(stage,spec) {
  if(!spec.id||typeof spec.id!=='string')throw new Error('A graphic needs a stable id');
  if(!(typeof spec.source==='string'&&spec.source.trim())&&spec.illustrative!==true)throw new Error('Supply a data source or mark the data illustrative');
  if(!finite(spec.start??0)||(spec.start??0)<0||((spec.end??Infinity)!==Infinity&&!finite(spec.end))||(spec.end??Infinity)<=(spec.start??0)||!finite(spec.enter??.6)||(spec.enter??.6)<=0||!finite(spec.timeScale??1)||(spec.timeScale??1)<=0)throw new Error('Invalid graphic timing');
  if(spec.sample&&(!spec.domain||spec.type==='race'))throw new Error('A live model binding needs a fixed domain and non-race chart');
  let input=spec.data;
  if(typeof input==='string'){
    if(!/^\.?(?:\/)?(?:[\w-]+\/)*[\w.-]+\.(?:csv|json)$/i.test(input)||input.split('/').includes('..'))throw new Error('Data must be a local CSV/JSON path');
    const response=await fetch(input);if(!response.ok)throw new Error(`Missing chart data: ${input}`);
    input=input.toLowerCase().endsWith('.csv')?dataFromCSV(await response.text()):await response.json();
  }
  if(spec.anchor&&(!Array.isArray(spec.anchor)||spec.anchor.length!==3||!spec.anchor.every(finite)||!finite(spec.worldWidth)||spec.worldWidth<=0))throw new Error('Invalid world chart anchor');
  const data=prepareData(input,spec),rect={x:7,y:29,width:86,height:33,...spec.rect};
  if(!Object.values(rect).every(finite)||rect.x<0||rect.y<0||rect.width<=0||rect.height<=0||rect.x+rect.width>100||rect.y+rect.height>100)throw new Error('Chart rectangle must fit the frame');
  const element=document.createElement('div');element.className='um-data';element.dataset.safe=spec.anchor?'world':'visual';element.dataset.chartId=spec.id;
  Object.assign(element.style,{position:'absolute',left:`${rect.x}%`,top:`${rect.y}%`,width:`${rect.width}%`,height:`${rect.height}%`,color:'#233e48',fontFamily:'UnrealInter,Arial,sans-serif'});
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 720 400');svg.setAttribute('width','100%');svg.setAttribute('height','100%');svg.setAttribute('role','img');svg.setAttribute('aria-label',spec.title||spec.id);element.append(svg);
  (spec.anchor?stage.worldOverlay:stage.overlay||document.querySelector('#stage')).append(element);
  function node(tag,attrs={},text,parent=svg){const el=document.createElementNS(svg.namespaceURI,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);if(text!==undefined)el.textContent=text;parent.append(el);return el;}
  const base=node('rect',{x:0,y:0,width:720,height:400,rx:24,fill:'#fff8e8'});
  const title=node('text',{x:28,y:37,fill:'#233e48','font-size':25,'font-weight':780},spec.title||'');
  const source=node('text',{x:28,y:375,fill:'#516d70','font-size':15},spec.illustrative?'DATA ILUSTRATIF'+(spec.source?` · ${spec.source}`:''):`SUMBER: ${spec.source}`);
  if(spec.unit)node('text',{x:690,y:37,'text-anchor':'end',fill:'#516d70','font-size':18},spec.unit);
  await document.fonts.ready;
  function fitText(el,max){const full=el.textContent;let count=full.length;while(el.getComputedTextLength()>max&&count>1){count--;el.textContent=full.slice(0,count)+'…';}if(count<full.length)node('title',{},full,el);}
  fitText(title,spec.unit?560:664);fitText(source,664);
  const longest=Math.max(...data.domain.map(value=>formatValue(value,{decimals:spec.decimals||0}).length));
  const left=data.type==='line'?Math.max(95,longest*10+22):150,right=['bar','race'].includes(data.type)?700-Math.max(65,longest*11+20):675,top=76,bottom=311,width=right-left,height=bottom-top;
  if(width<150)throw new Error('Number labels need a smaller, explicitly declared unit');
  const scale=value=>left+(value-data.domain[0])/(data.domain[1]-data.domain[0])*width;
  const yScale=value=>bottom-(value-data.domain[0])/(data.domain[1]-data.domain[0])*height;
  const zero=scale(0), palette=spec.colors||colors,items=new Map();
  if(['bar','race','line'].includes(data.type)){
    for(let i=0;i<=4;i++){
      const value=mix(...data.domain,i/4),p=data.type==='line'?yScale(value):scale(value);
      node('line',data.type==='line'?{x1:left,x2:right,y1:p,y2:p,stroke:'#d8e1d9'}:{x1:p,x2:p,y1:top,y2:bottom,stroke:'#d8e1d9'});
      node('text',data.type==='line'?{x:left-12,y:p+5,'text-anchor':'end','font-size':15,fill:'#516d70'}:{x:p,y:338,'text-anchor':'middle','font-size':15,fill:'#516d70'},formatValue(value,{decimals:spec.decimals||0}));
    }
  }
  let path,number;
  if(data.type==='line')path=node('path',{fill:'none',stroke:palette[0],'stroke-width':5,'stroke-linejoin':'round','stroke-linecap':'round'});
  if(data.type==='counter'){
    number=node('text',{x:360,y:216,'text-anchor':'middle',fill:palette[0],'font-size':94,'font-weight':850,style:'font-variant-numeric:tabular-nums'});
    node('text',{x:360,y:270,'text-anchor':'middle',fill:'#516d70','font-size':25},data.labels[data.ids[0]]);
  }
  if(data.type==='donut')node('circle',{cx:225,cy:196,r:94,fill:'none',stroke:'#e2e7dc','stroke-width':30});
  data.ids.forEach((id,i)=>{
    const g=node('g',{'data-id':id}),color=palette[i%palette.length];let mark,label,value;
    if(['bar','race'].includes(data.type)){
      mark=node('rect',{x:zero,y:0,width:0,height:Math.min(34,height/data.ids.length*.63),rx:5,fill:color},undefined,g);
      label=node('text',{x:left-13,y:0,'text-anchor':'end','font-size':19,'font-weight':650},data.labels[id],g);fitText(label,left-25);
      value=node('text',{x:zero,y:0,'font-size':18,'font-weight':700,style:'font-variant-numeric:tabular-nums'},'',g);
    }else if(data.type==='line'){
      mark=node('circle',{r:5,fill:palette[0]},undefined,g);label=node('text',{y:338,'text-anchor':'middle','font-size':16},data.labels[id],g);fitText(label,Math.min(110,width/Math.max(1,data.ids.length-1)));value=node('text',{'text-anchor':'middle','font-size':17,'font-weight':700},'',g);
    }else if(data.type==='donut'){
      mark=node('circle',{cx:225,cy:196,r:94,fill:'none',stroke:color,'stroke-width':30,transform:'rotate(-90 225 196)'},undefined,g);
      node('rect',{x:375,y:102+i*39,width:15,height:15,rx:4,fill:color},undefined,g);
      label=node('text',{x:400,y:115+i*39,'font-size':20},data.labels[id],g);fitText(label,150);value=node('text',{x:660,y:115+i*39,'text-anchor':'end','font-size':20,'font-weight':750},'',g);
    }
    items.set(id,{g,mark,label,value,color});
  });
  let current=[],active=false;
  function update(seconds,state={}) {
    active=(!spec.scene||state.scene===spec.scene)&&(!spec.beats||spec.beats.includes(state.beat?.id))&&seconds>=(spec.start||0)&&seconds<(spec.end??Infinity);
    element.style.display=active&&(!stage.projectGraphic||stage.projectGraphic(element,spec))?'block':'none';
    const local=(seconds-(spec.start||0))*(spec.timeScale||1),reveal=1-(1-clamp((seconds-(spec.start||0))/(spec.enter||.6)))**3;
    current=sampleData(data,local,reveal);
    if(spec.sample){const values=spec.sample(seconds);if(!Array.isArray(values)||values.length!==data.ids.length)throw new Error('Model data binding changed category count');current=current.map(row=>{const next=values.find(v=>v.id===row.id);if(!next||!finite(next.value)||next.value<data.domain[0]||next.value>data.domain[1])throw new Error('Model value lies outside the fixed data domain');return {...row,value:next.value*reveal};});}
    const formatter=value=>formatValue(value,{unit:spec.type==='counter'?spec.unit:'',decimals:spec.decimals||0,locale:spec.locale||'id-ID'});
    if(number){number.textContent=formatter(current[0].value);number.setAttribute('data-value',current[0].value);}
    const total=current.reduce((sum,row)=>sum+(row.value||0),0);let angle=0;
    const xs=value=>data.xValues.length===1?(left+right)/2:left+(value-data.xValues[0])/(data.xValues.at(-1)-data.xValues[0])*width;
    if(path)path.setAttribute('d',linePath(current,xs,yScale));
    current.forEach((row,i)=>{
      const {g,mark,label,value}=items.get(row.id);g.setAttribute('data-value',row.value===null?'missing':row.value);g.style.opacity=String(reveal);
      if(['bar','race'].includes(data.type)){
        const slot=data.type==='race'?row.rank:i,y=top+(slot+.5)*height/data.ids.length,w=Math.abs(scale(row.value)-zero);
        mark.setAttribute('x',Math.min(zero,scale(row.value)));mark.setAttribute('y',y-Number(mark.getAttribute('height'))/2);mark.setAttribute('width',w);
        label.setAttribute('y',y+6);value.setAttribute('x',scale(row.value)+8);value.setAttribute('text-anchor','start');value.setAttribute('y',y+6);value.textContent=formatter(row.value);
      }else if(data.type==='line'){
        const x=xs(row.x);label.setAttribute('x',x);label.setAttribute('text-anchor',i===0?'start':i===current.length-1?'end':'middle');mark.style.display=row.value===null?'none':'block';value.style.display=row.value===null?'none':'block';
        if(row.value!==null){const y=yScale(row.value);mark.setAttribute('cx',x);mark.setAttribute('cy',y);value.setAttribute('y',Math.max(56,y-14));value.textContent=formatter(row.value);const half=value.getComputedTextLength()/2;value.setAttribute('x',clamp(x,half+12,708-half));}
      }else if(data.type==='donut'){
        const portion=total?row.value/total:0,length=2*Math.PI*94;
        mark.setAttribute('stroke-dasharray',`${portion*length} ${length}`);mark.setAttribute('stroke-dashoffset',-angle*length);angle+=portion;value.textContent=formatter(row.value);
      }
    });
  }
  const graphic={id:spec.id,element,update,inspect:()=>({id:spec.id,type:data.type,active,anchor:spec.anchor,domain:data.domain,source:spec.source||'illustrative',illustrative:Boolean(spec.illustrative),values:current.map(({id,value,rank})=>({id,value,rank})),invalid:current.some(row=>row.value!==null&&!finite(row.value))})};
  stage.registerGraphic?.(graphic);return graphic;
}
