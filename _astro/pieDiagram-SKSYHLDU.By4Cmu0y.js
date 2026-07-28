import"./rough.esm.CguOkHQJ.js";import{f as e,r as t}from"./chunk-GEFDOKGD.CYRGcHem.js";import{t as n}from"./mermaid-parser.core.DrrbZW6j.js";import{n as r,r as i}from"./chunk-AGHRB4JF.BdfjvxF1.js";import{B as a,C as o,V as s,W as c,_ as l,a as u,b as d,c as f,d as p,v as m}from"./chunk-7R4GIKGN.DqKaHhd3.js";import{t as h}from"./ordinal.CysACInB.js";import{t as g}from"./arc.XFYF_Vwo.js";import{t as _}from"./pie.Cy27NvK9.js";import{t as v}from"./chunk-HHEYEP7N.8PwvNq0R.js";import{t as y}from"./chunk-4BX2VUAB.CuLIY670.js";var b=p.pie,x={sections:new Map,showData:!1,config:b},S=x.sections,C=x.showData,w=structuredClone(b),T={getConfig:r(()=>structuredClone(w),`getConfig`),clear:r(()=>{S=new Map,C=x.showData,u()},`clear`),setDiagramTitle:c,getDiagramTitle:o,setAccTitle:s,getAccTitle:m,setAccDescription:a,getAccDescription:l,addSection:r(({label:e,value:t})=>{if(t<0)throw Error(`"${e}" has invalid value: ${t}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);S.has(e)||(S.set(e,t),i.debug(`added new section: ${e}, with value: ${t}`))},`addSection`),getSections:r(()=>S,`getSections`),setShowData:r(e=>{C=e},`setShowData`),getShowData:r(()=>C,`getShowData`)},E=r((e,t)=>{y(e,t),t.setShowData(e.showData),e.sections.map(t.addSection)},`populateDb`),D={parse:r(async e=>{let t=await n(`pie`,e);i.debug(t),E(t,T)},`parse`)},O=r(e=>`
  .pieCircle{
    stroke: ${e.pieStrokeColor};
    stroke-width : ${e.pieStrokeWidth};
    opacity : ${e.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${e.pieOuterStrokeColor};
    stroke-width: ${e.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${e.pieTitleTextSize};
    fill: ${e.pieTitleTextColor};
    font-family: ${e.fontFamily};
  }
  .slice {
    font-family: ${e.fontFamily};
    fill: ${e.pieSectionTextColor};
    font-size:${e.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${e.pieLegendTextColor};
    font-family: ${e.fontFamily};
    font-size: ${e.pieLegendTextSize};
  }
`,`getStyles`),k=r(e=>{let t=[...e.values()].reduce((e,t)=>e+t,0),n=[...e.entries()].map(([e,t])=>({label:e,value:t})).filter(e=>e.value/t*100>=1).sort((e,t)=>t.value-e.value);return _().value(e=>e.value)(n)},`createPieArcs`),A={parser:D,db:T,renderer:{draw:r((n,r,a,o)=>{i.debug(`rendering pie chart
`+n);let s=o.db,c=d(),l=t(s.getConfig(),c.pie),u=v(r),p=u.append(`g`);p.attr(`transform`,`translate(225,225)`);let{themeVariables:m}=c,[_]=e(m.pieOuterStrokeWidth);_??=2;let y=l.textPosition,b=g().innerRadius(0).outerRadius(185),x=g().innerRadius(185*y).outerRadius(185*y);p.append(`circle`).attr(`cx`,0).attr(`cy`,0).attr(`r`,185+_/2).attr(`class`,`pieOuterCircle`);let S=s.getSections(),C=k(S),w=[m.pie1,m.pie2,m.pie3,m.pie4,m.pie5,m.pie6,m.pie7,m.pie8,m.pie9,m.pie10,m.pie11,m.pie12],T=0;S.forEach(e=>{T+=e});let E=C.filter(e=>(e.data.value/T*100).toFixed(0)!==`0`),D=h(w);p.selectAll(`mySlices`).data(E).enter().append(`path`).attr(`d`,b).attr(`fill`,e=>D(e.data.label)).attr(`class`,`pieCircle`),p.selectAll(`mySlices`).data(E).enter().append(`text`).text(e=>(e.data.value/T*100).toFixed(0)+`%`).attr(`transform`,e=>`translate(`+x.centroid(e)+`)`).style(`text-anchor`,`middle`).attr(`class`,`slice`),p.append(`text`).text(s.getDiagramTitle()).attr(`x`,0).attr(`y`,-400/2).attr(`class`,`pieTitleText`);let O=[...S.entries()].map(([e,t])=>({label:e,value:t})),A=p.selectAll(`.legend`).data(O).enter().append(`g`).attr(`class`,`legend`).attr(`transform`,(e,t)=>{let n=22*O.length/2;return`translate(216,`+(t*22-n)+`)`});A.append(`rect`).attr(`width`,18).attr(`height`,18).style(`fill`,e=>D(e.label)).style(`stroke`,e=>D(e.label)),A.append(`text`).attr(`x`,22).attr(`y`,14).text(e=>s.getShowData()?`${e.label} [${e.value}]`:e.label);let j=512+Math.max(...A.selectAll(`text`).nodes().map(e=>e?.getBoundingClientRect().width??0));u.attr(`viewBox`,`0 0 ${j} 450`),f(u,450,j,l.useMaxWidth)},`draw`)},styles:O};export{A as diagram};