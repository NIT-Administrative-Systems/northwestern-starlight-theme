import{p as tt}from"./chunk-JWPE2WC7.D5lYjplX.js";import{g as et,s as at,a as rt,b as it,m as nt,k as ot,_ as l,l as E,c as st,x as lt,A as ct,B as dt,d as gt,n as pt,y as ht}from"./mermaid.core.WiM8U5ou.js";import{p as ft}from"./cynefin-VYW2F7L2.D0H1mgCh.js";import"./rough.esm.B5QAivMZ.js";import{o as ut}from"./ordinal.BYWQX77i.js";import{d as I}from"./arc.DVl-NS11.js";import{d as mt}from"./pie.bKRGJjwA.js";var vt=ht.pie,R={sections:new Map,showData:!1},T=R.sections,L=R.showData,St=structuredClone(vt),xt=l(()=>structuredClone(St),"getConfig"),wt=l(()=>{T=new Map,L=R.showData,pt()},"clear"),Ct=l(({label:t,value:a})=>{if(a<0)throw new Error(`"${t}" has invalid value: ${a}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);T.has(t)||(T.set(t,a),E.debug(`added new section: ${t}, with value: ${a}`))},"addSection"),$t=l(()=>T,"getSections"),yt=l(t=>{L=t},"setShowData"),Dt=l(()=>L,"getShowData"),U={getConfig:xt,clear:wt,setDiagramTitle:ot,getDiagramTitle:nt,setAccTitle:it,getAccTitle:rt,setAccDescription:at,getAccDescription:et,addSection:Ct,getSections:$t,setShowData:yt,getShowData:Dt},Tt=l((t,a)=>{tt(t,a),a.setShowData(t.showData),t.sections.map(a.addSection)},"populateDb"),bt={parse:l(async t=>{const a=await ft("pie",t);E.debug(a),Tt(a,U)},"parse")},At=l(t=>`
  .pieCircle{
    stroke: ${t.pieStrokeColor};
    stroke-width : ${t.pieStrokeWidth};
    opacity : ${t.pieOpacity};
  }
  .pieCircle.highlighted{
    scale: 1.05;
    opacity: 1;
  }
  .pieCircle.highlightedOnHover:hover{
    transition-duration: 250ms;
    scale: 1.05;
    opacity: 1;
  }
  .pieOuterCircle{
    stroke: ${t.pieOuterStrokeColor};
    stroke-width: ${t.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${t.pieTitleTextSize};
    fill: ${t.pieTitleTextColor};
    font-family: ${t.fontFamily};
  }
  .slice {
    font-family: ${t.fontFamily};
    fill: ${t.pieSectionTextColor};
    font-size:${t.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${t.pieLegendTextColor};
    font-family: ${t.fontFamily};
    font-size: ${t.pieLegendTextSize};
  }
`,"getStyles"),kt=At,_t=l(t=>{const a=[...t.values()].reduce((o,m)=>o+m,0),W=[...t.entries()].map(([o,m])=>({label:o,value:m})).filter(o=>o.value/a*100>=1);return mt().value(o=>o.value).sort(null)(W)},"createPieArcs"),zt=l((t,a,W,F)=>{E.debug(`rendering pie chart
`+t);const o=F.db,m=st(),h=lt(o.getConfig(),m.pie),H=40,i=18,c=4,C=450,S=C,b=ct(a),$=b.append("g");$.attr("transform","translate("+S/2+","+C/2+")");const{themeVariables:n}=m;let[M]=dt(n.pieOuterStrokeWidth);M??=2;const V=h.legendPosition,O=h.textPosition,X=h.donutHole>0&&h.donutHole<=.9?h.donutHole:0,f=Math.min(S,C)/2-H,Z=I().innerRadius(X*f).outerRadius(f),j=I().innerRadius(f*O).outerRadius(f*O),x=$.append("g");x.append("circle").attr("cx",0).attr("cy",0).attr("r",f+M/2).attr("class","pieOuterCircle");const y=o.getSections(),q=_t(y),J=[n.pie1,n.pie2,n.pie3,n.pie4,n.pie5,n.pie6,n.pie7,n.pie8,n.pie9,n.pie10,n.pie11,n.pie12];let A=0;y.forEach(e=>{A+=e});const P=q.filter(e=>(e.data.value/A*100).toFixed(0)!=="0"),k=ut(J).domain([...y.keys()]);x.selectAll("mySlices").data(P).enter().append("path").attr("d",Z).attr("fill",e=>k(e.data.label)).attr("class",e=>{let r="pieCircle";return h.highlightSlice==="hover"?r+=" highlightedOnHover":h.highlightSlice===e.data.label&&(r+=" highlighted"),r}),x.selectAll("mySlices").data(P).enter().append("text").text(e=>(e.data.value/A*100).toFixed(0)+"%").attr("transform",e=>"translate("+j.centroid(e)+")").style("text-anchor","middle").attr("class","slice");const K=$.append("text").text(o.getDiagramTitle()).attr("x",0).attr("y",-400/2).attr("class","pieTitleText"),w=[...y.entries()].map(([e,r])=>({label:e,value:r})),u=$.selectAll(".legend").data(w).enter().append("g").attr("class","legend");u.append("rect").attr("width",i).attr("height",i).style("fill",e=>k(e.label)).style("stroke",e=>k(e.label)),u.append("text").attr("x",i+c).attr("y",i-c).text(e=>o.getShowData()?`${e.label} [${e.value}]`:e.label);const v=Math.max(...u.selectAll("text").nodes().map(e=>e?.getBoundingClientRect().width??0));let D=C,_=S+H;const s=i+c,z=w.length*s;switch(V){case"center":u.attr("transform",(e,r)=>{const d=s*w.length/2,g=-v/2-(i+c),p=r*s-d;return"translate("+g+","+p+")"});break;case"top":D+=z,u.attr("transform",(e,r)=>{const d=f,g=-v/2-(i+c),p=r*s-d;return`translate(${g}, ${p})`}),x.attr("transform",()=>`translate(0, ${z+s})`);break;case"bottom":D+=z,u.attr("transform",(e,r)=>{const d=-f-s,g=-v/2-(i+c),p=r*s-d;return"translate("+g+","+p+")"});break;case"left":_+=i+c+v,u.attr("transform",(e,r)=>{const d=s*w.length/2,g=-f-(i+c),p=r*s-d;return"translate("+g+","+p+")"}),x.attr("transform",()=>`translate(${v+i+c}, 0)`);break;default:_+=i+c+v,u.attr("transform",(e,r)=>{const d=s*w.length/2,g=12*i,p=r*s-d;return"translate("+g+","+p+")"});break}const B=K.node()?.getBoundingClientRect().width??0,Q=S/2-B/2,Y=S/2+B/2,G=Math.min(0,Q),N=Math.max(_,Y)-G;b.attr("viewBox",`${G} 0 ${N} ${D}`),gt(b,D,N,h.useMaxWidth)},"draw"),Et={draw:zt},Bt={parser:bt,db:U,renderer:Et,styles:kt};export{Bt as diagram};
