import { chromium } from 'playwright-core';
const K=[['同一间屋(窗框)',0.69,[60,40,240,200]],['同一个晚上(月亮)',1.59,[70,55,225,185]],['蚊子(入画)',1.99,[0,60,420,220]],['你(头被选中)',2.49,[540,120,720,300]],['他(头脉动)',2.97,[240,120,420,300]],['睡(Zzz)',3.97,[180,60,300,170]],['腿',4.59,[700,360,930,450]],['包(红包)',5.19,[780,370,930,440]],['爬起来(坐起)',5.97,[540,80,720,300]],['开灯',6.41,[820,160,960,470]],['错觉(打叉)',7.95,[640,40,760,150]],['招蚊子(群蚊)',9.03,[380,40,960,360]]];
const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome'});const p=await b.newPage({viewport:{width:960,height:540}});
await p.goto('file://'+process.cwd()+'/index.html');await p.waitForFunction(()=>window.READY);
for(const[n,t,r]of K){const d=await p.evaluate(([t,r])=>{const c=document.getElementById('c').getContext('2d');const get=tt=>{render(tt);return c.getImageData(r[0],r[1],r[2]-r[0],r[3]-r[1]).data};
 // compare same-hold-parity frames to cancel boil: luminance mean change
 const m=a=>{let s=0;for(let i=0;i<a.length;i+=4)s+=a[i]+a[i+1]+a[i+2];return s/(a.length/4)/3};return[m(get(t-0.25)),m(get(t+0.4))]},[t,r]);
 console.log(n.padEnd(14),'t='+t.toFixed(2),'区域平均亮度',d[0].toFixed(1),'→',d[1].toFixed(1),'Δ',(d[1]-d[0]).toFixed(1))}
await b.close();
