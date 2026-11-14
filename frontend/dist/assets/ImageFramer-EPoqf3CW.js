import{l as o,w as k,j as t,x as v,y as p,z as M}from"./index-D_BxwqBM.js";import{b as x}from"./react-BEDKma9L.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E=o("ArrowDown",[["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"m19 12-7 7-7-7",key:"1idqje"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F=o("ArrowUp",[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=o("Maximize",[["path",{d:"M8 3H5a2 2 0 0 0-2 2v3",key:"1dcmit"}],["path",{d:"M21 8V5a2 2 0 0 0-2-2h-3",key:"1e4gt3"}],["path",{d:"M3 16v3a2 2 0 0 0 2 2h3",key:"wsl5sc"}],["path",{d:"M16 21h3a2 2 0 0 0 2-2v-3",key:"18trek"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=o("Move",[["path",{d:"M12 2v20",key:"t6zp3m"}],["path",{d:"m15 19-3 3-3-3",key:"11eu04"}],["path",{d:"m19 9 3 3-3 3",key:"1mg7y2"}],["path",{d:"M2 12h20",key:"9i4pu4"}],["path",{d:"m5 9-3 3 3 3",key:"j64kie"}],["path",{d:"m9 5 3-3 3 3",key:"l8vdw6"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R=o("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=o("ZoomIn",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"11",x2:"11",y1:"8",y2:"14",key:"1vmskp"}],["line",{x1:"8",x2:"14",y1:"11",y2:"11",key:"durymu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z=o("ZoomOut",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"8",x2:"14",y1:"11",y2:"11",key:"durymu"}]]),C=[{label:"Banner",aspect:"2 / 1"},{label:"Tile",aspect:"4 / 5"},{label:"Story",aspect:"1 / 1",round:!0}],P=({value:n,onChange:r,shapes:d=C})=>{const c=k(n),[s,l]=x.useState(c.frame),i=x.useRef(null);x.useEffect(()=>{l(k(n).frame)},[c.src]);const h=e=>{l(e),r(p(n,e))},u=e=>h({...s,z:Math.round(Math.min(3,Math.max(.5,e))*100)/100}),w=e=>{const a=e.currentTarget.getBoundingClientRect();i.current={x:e.clientX,y:e.clientY,f:s,w:a.width,h:a.height},e.currentTarget.setPointerCapture(e.pointerId)},j=e=>{const a=i.current;if(!a)return;const b=100/Math.max(1,a.f.z),f=Math.min(100,Math.max(0,a.f.x-(e.clientX-a.x)/a.w*b)),g=Math.min(100,Math.max(0,a.f.y-(e.clientY-a.y)/a.h*b));l({...a.f,x:f,y:g})},y=()=>{i.current&&r(p(n,s)),i.current=null};if(!c.src)return null;const m="p-2 border border-black/20 bg-white hover:bg-black hover:text-white";return t.jsxs("div",{className:"border border-black/10 bg-neutral-50 p-3 space-y-3",children:[t.jsxs("div",{className:"flex items-center justify-between gap-2",children:[t.jsxs("p",{className:"text-[11px] font-bold uppercase tracking-wider text-black flex items-center gap-1.5",children:[t.jsx(z,{className:"w-3.5 h-3.5"})," Adjust photo"]}),t.jsx("p",{className:"text-[10px] text-neutral-500",children:"Drag a preview to move · zoom with the slider"})]}),t.jsx("div",{className:"grid gap-2",style:{gridTemplateColumns:d.map(e=>e.aspect==="2 / 1"?"2fr":"1fr").join(" ")},children:d.map(e=>t.jsxs("div",{className:"space-y-1",children:[t.jsx("div",{onPointerDown:w,onPointerMove:j,onPointerUp:y,onPointerCancel:y,className:`relative overflow-hidden bg-neutral-200 cursor-grab active:cursor-grabbing touch-none select-none ${e.round?"rounded-full":""}`,style:{aspectRatio:e.aspect},children:t.jsx("img",{src:c.src,alt:"",draggable:!1,className:"absolute inset-0 w-full h-full pointer-events-none",style:v(s)})}),t.jsx("p",{className:"text-[9.5px] text-center uppercase tracking-wider text-neutral-500",children:e.label})]},e.label))}),t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("button",{type:"button",className:m,onClick:()=>u(s.z-.1),"aria-label":"Zoom out",title:"Zoom out",children:t.jsx(Z,{className:"w-3.5 h-3.5"})}),t.jsx("input",{type:"range",min:.5,max:3,step:.01,value:s.z,onChange:e=>l({...s,z:+e.target.value}),onPointerUp:()=>r(p(n,s)),onKeyUp:()=>r(p(n,s)),className:"flex-1 accent-black","aria-label":"Zoom"}),t.jsx("button",{type:"button",className:m,onClick:()=>u(s.z+.1),"aria-label":"Zoom in",title:"Zoom in",children:t.jsx(A,{className:"w-3.5 h-3.5"})}),t.jsxs("span",{className:"w-12 text-center text-[11px] font-mono font-bold",children:[Math.round(s.z*100),"%"]}),t.jsx("button",{type:"button",className:m,onClick:()=>h({x:50,y:50,z:.5}),"aria-label":"Show whole photo",title:"Show whole photo",children:t.jsx(N,{className:"w-3.5 h-3.5"})}),t.jsx("button",{type:"button",className:m,onClick:()=>h(M),"aria-label":"Reset",title:"Reset",children:t.jsx(R,{className:"w-3.5 h-3.5"})})]}),t.jsx("p",{className:"text-[10px] text-neutral-500",children:"Tip: below 100% the whole photo fits with a plain background around it. Remember to save."})]})};export{F as A,P as I,R,E as a};
