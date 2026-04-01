import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
// MATH & EASING
// ═══════════════════════════════════════════════════════════
const ease = {
  outCubic:   t => 1 - Math.pow(1-t, 3),
  inOutCubic: t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2,
  outBack:    t => { const c=1.70158,c3=c+1; return 1+c3*Math.pow(t-1,3)+c*Math.pow(t-1,2); },
  outElastic: t => t===0||t===1 ? t : Math.pow(2,-10*t)*Math.sin((t*10-0.75)*(2*Math.PI)/3)+1,
};
const lerp  = (a,b,t) => a+(b-a)*t;
const clamp = (v,lo=0,hi=1) => Math.max(lo,Math.min(hi,v));

function hexToRgb(hex){ return {r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)}; }
function ca(hex,a){ const {r,g,b}=hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

// ═══════════════════════════════════════════════════════════
// CANVAS ENGINE
// ═══════════════════════════════════════════════════════════
function CanvasScene({ width=700, height=320, draw, sceneKey="" }) {
  const ref = useRef(null);
  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = {}; // reset state on remount
    const canvas = ref.current; if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio||1;
    canvas.width = width*dpr; canvas.height = height*dpr;
    canvas.style.width = width+"px"; canvas.style.height = height+"px";
    ctx.scale(dpr,dpr);
    let raf, last=0;
    const loop = ts => {
      const dt = Math.min(ts-last, 64); last=ts;
      ctx.clearRect(0,0,width,height);
      draw(ctx, dt, stateRef.current, width, height);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(t=>{ last=t; raf=requestAnimationFrame(loop); });
    return () => cancelAnimationFrame(raf);
  }, [sceneKey]); // eslint-disable-line
  return <canvas ref={ref} style={{width,height,maxWidth:"100%",display:"block",borderRadius:"8px"}}/>;
}

// ═══════════════════════════════════════════════════════════
// DRAW PRIMITIVES
// ═══════════════════════════════════════════════════════════
function glowBall(ctx, x, y, r, color, alpha=1) {
  const gr = r*3.5;
  const grd = ctx.createRadialGradient(x,y,0,x,y,gr);
  grd.addColorStop(0, ca(color,alpha*0.55)); grd.addColorStop(1, ca(color,0));
  ctx.beginPath(); ctx.arc(x,y,gr,0,Math.PI*2); ctx.fillStyle=grd; ctx.fill();
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle=ca(color,alpha);
  ctx.shadowBlur=20; ctx.shadowColor=color; ctx.fill(); ctx.shadowBlur=0;
}

function trail(ctx, pts, color) {
  if(!pts||pts.length<2) return;
  for(let i=1;i<pts.length;i++){
    const a=(i/pts.length)*0.55;
    ctx.beginPath(); ctx.moveTo(pts[i-1].x,pts[i-1].y); ctx.lineTo(pts[i].x,pts[i].y);
    ctx.strokeStyle=ca(color,a); ctx.lineWidth=2.5; ctx.stroke();
  }
}

function dashed(ctx, x1,y1,x2,y2, color="#1e3a5f", dash=[5,5], w=1.5) {
  ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
  ctx.strokeStyle=color; ctx.lineWidth=w; ctx.stroke(); ctx.setLineDash([]);
}

function bgGrid(ctx, w, h, color="rgba(34,211,238,0.04)") {
  ctx.fillStyle="#020b18"; ctx.fillRect(0,0,w,h);
  ctx.setLineDash([1,32]); ctx.strokeStyle=color; ctx.lineWidth=1;
  for(let x=0;x<w;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for(let y=0;y<h;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.setLineDash([]);
}

function node(ctx, x, y, size=44, color="#22d3ee", label="", icon="server", pulse=0, shakeX=0) {
  const hs=size/2, nx=x-hs+shakeX, ny=y-hs;
  if(pulse>0){
    ctx.beginPath(); ctx.arc(x+shakeX,y,hs+pulse*20,0,Math.PI*2);
    ctx.strokeStyle=ca(color,(1-pulse)*0.6); ctx.lineWidth=2; ctx.stroke();
  }
  ctx.beginPath(); ctx.roundRect(nx,ny,size,size,8);
  ctx.fillStyle=ca(color,0.09); ctx.fill();
  ctx.strokeStyle=ca(color,0.4); ctx.lineWidth=1.4; ctx.stroke();

  const s=hs*0.52, cx2=nx+hs+shakeX;
  ctx.strokeStyle=color; ctx.lineWidth=1.7; ctx.fillStyle=color;
  if(icon==="server"){
    ctx.strokeRect(cx2-s,ny+hs-s*0.9,s*2,s*0.72);
    ctx.strokeRect(cx2-s,ny+hs-s*0.9+s*0.9,s*2,s*0.72);
    ctx.beginPath();ctx.arc(cx2+s*0.62,ny+hs-s*0.54,s*0.17,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(cx2+s*0.62,ny+hs+s*0.36,s*0.17,0,Math.PI*2);ctx.fill();
  } else if(icon==="user"){
    ctx.beginPath();ctx.arc(cx2,ny+hs-s*0.4,s*0.52,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(cx2,ny+hs+s*1.3,s*1.0,Math.PI,Math.PI*2);ctx.stroke();
  } else if(icon==="cloud"){
    ctx.beginPath();ctx.arc(cx2-s*0.35,ny+hs,s*0.52,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(cx2+s*0.35,ny+hs,s*0.52,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(cx2,ny+hs-s*0.3,s*0.58,0,Math.PI*2);ctx.stroke();
  } else if(icon==="laptop"){
    ctx.strokeRect(cx2-s*0.95,ny+hs-s*0.55,s*1.9,s*1.15);
    ctx.beginPath();ctx.moveTo(cx2-s*1.1,ny+hs+s*0.65);ctx.lineTo(cx2+s*1.1,ny+hs+s*0.65);ctx.stroke();
  } else if(icon==="phone"){
    ctx.strokeRect(cx2-s*0.42,ny+hs-s*1.0,s*0.84,s*2.0);
    ctx.beginPath();ctx.arc(cx2,ny+hs+s*0.7,s*0.13,0,Math.PI*2);ctx.fill();
  } else if(icon==="database"){
    ctx.beginPath();ctx.ellipse(cx2,ny+hs-s*0.55,s*0.82,s*0.32,0,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx2-s*0.82,ny+hs-s*0.55);ctx.lineTo(cx2-s*0.82,ny+hs+s*0.55);
    ctx.bezierCurveTo(cx2-s*0.82,ny+hs+s*1.0,cx2+s*0.82,ny+hs+s*1.0,cx2+s*0.82,ny+hs+s*0.55);
    ctx.lineTo(cx2+s*0.82,ny+hs-s*0.55);ctx.stroke();
    ctx.beginPath();ctx.ellipse(cx2,ny+hs,s*0.82,s*0.32,0,0,Math.PI*2);ctx.stroke();
  }

  if(label){
    ctx.font="10px 'JetBrains Mono',monospace";
    ctx.fillStyle="#e2e8f0"; ctx.textAlign="center";
    ctx.fillText(label, x+shakeX, y+hs+15);
  }
}

function particles_tick(ps, dt) {
  ps.forEach(p=>{
    p.x+=p.vx*(dt/16); p.y+=p.vy*(dt/16);
    p.vy+=0.05*(dt/16); p.life-=0.028*(dt/16);
  });
  return ps.filter(p=>p.life>0);
}
function particles_draw(ctx, ps) {
  ps.forEach(p=> glowBall(ctx,p.x,p.y,p.r*p.life,p.color,p.life));
}
function particles_spawn(ps, x, y, color, n=8) {
  for(let i=0;i<n;i++){
    const a=(i/n)*Math.PI*2, spd=1.4+Math.random()*2.2;
    ps.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,color,r:2+Math.random()*2.5});
  }
}

function addTrail(b, x, y, max=22) {
  if(!b.trail) b.trail=[];
  b.trail.push({x,y}); if(b.trail.length>max) b.trail.shift();
}

// ═══════════════════════════════════════════════════════════
// SCENE 1 — INTRODUCTION
// ═══════════════════════════════════════════════════════════
function IntroCanvas() {
  const draw = useCallback((ctx,dt,s,w,h)=>{
    if(!s.init){Object.assign(s,{init:true,t:0,phase:"idle",ball:null,innerLit:[],particles:[],idleT:0,innerTs:[0,0,0,0]});}
    s.t+=dt; s.idleT+=dt; s.particles=particles_tick(s.particles,dt);

    const uX=80,uY=h/2, sysL=320,sysR=w-40;
    const ins=[{x:368,y:h/2-40},{x:460,y:h/2-40},{x:368,y:h/2+40},{x:460,y:h/2+40}];
    const sysCx=(sysL+sysR)/2;

    if(s.phase==="idle"&&s.idleT>700){s.phase="sending";s.ball={prog:0,trail:[]};s.innerLit=[];s.idleT=0;s.innerTs=[0,0,0,0];}
    if(s.phase==="sending"){
      s.ball.prog=clamp(s.ball.prog+dt/850);
      if(s.ball.prog>=1){s.phase="distributing";s.ball=null;s.distT=0;}
    }
    if(s.phase==="distributing"){
      s.distT=(s.distT||0)+dt;
      ins.forEach((_,i)=>{ s.innerTs[i]=clamp(s.innerTs[i]+dt/(480+i*70)); });
      ins.forEach((_,i)=>{
        if(!s.innerLit.includes(i)&&s.innerTs[i]>=1){
          s.innerLit=[...s.innerLit,i];
          particles_spawn(s.particles,ins[i].x,ins[i].y,"#a855f7",8);
        }
      });
      if(s.distT>3800){s.phase="idle";s.innerLit=[];s.idleT=0;}
    }

    bgGrid(ctx,w,h);

    // system box
    ctx.beginPath(); ctx.roundRect(sysL,uY-85,sysR-sysL,170,10);
    const bx2=ctx.createLinearGradient(sysL,0,sysR,0);
    bx2.addColorStop(0,ca("#a855f7",0.07)); bx2.addColorStop(1,ca("#22d3ee",0.04));
    ctx.fillStyle=bx2; ctx.fill();
    ctx.strokeStyle=s.innerLit.length===4?ca("#a855f7",0.7):ca("#22d3ee",0.15);
    ctx.lineWidth=1.5; if(s.innerLit.length===4){ctx.shadowBlur=12;ctx.shadowColor="#a855f7";} ctx.stroke(); ctx.shadowBlur=0;
    ctx.font="11px 'JetBrains Mono',monospace"; ctx.fillStyle="#cbd5e1"; ctx.textAlign="center";
    ctx.fillText("«Distributed System»",sysCx,uY-95);

    dashed(ctx,uX+22,uY,sysL-2,uY,"#1e3a5f");

    // inner mesh
    if(s.innerLit.length===4){
      [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]].forEach(([a,b])=>{
        ctx.beginPath();ctx.moveTo(ins[a].x,ins[a].y);ctx.lineTo(ins[b].x,ins[b].y);
        ctx.strokeStyle=ca("#a855f7",0.13);ctx.lineWidth=1;ctx.stroke();
      });
    }
    ins.forEach((n,i)=>{
      const lit=s.innerLit.includes(i);
      node(ctx,n.x,n.y,36,lit?"#a855f7":"#334155","","server",lit?(Math.sin(s.t/380+i)+1)/2*0.45:0);
    });

    if(s.phase==="distributing"){
      ins.forEach((n,i)=>{
        const p=ease.outElastic(clamp(s.innerTs[i]));
        if(s.innerTs[i]<1) glowBall(ctx,lerp(sysCx,n.x,p),lerp(uY,n.y,p),4,"#a855f7");
      });
    }
    if(s.phase==="sending"&&s.ball){
      const p=ease.outCubic(s.ball.prog);
      const bxp=lerp(uX+22,sysL-2,p);
      addTrail(s.ball,bxp,uY);
      trail(ctx,s.ball.trail,"#22d3ee");
      glowBall(ctx,bxp,uY,6,"#22d3ee");
    }

    node(ctx,uX,uY,44,"#22d3ee","User","user",0);
    particles_draw(ctx,s.particles);

    ctx.font="12px 'JetBrains Mono',monospace"; ctx.textAlign="center";
    ctx.fillStyle=s.innerLit.length===4?"#c084fc":"#67e8f9";
    ctx.fillText(s.innerLit.length===4?"✦ complexity hidden from user ✦":s.phase==="sending"?"sending request →":"◎ idle",sysCx,uY+108);
  },[]);
  return <CanvasScene width={700} height={280} draw={draw} sceneKey="intro"/>;
}

// ═══════════════════════════════════════════════════════════
// SCENE 2a — CLUSTER
// ═══════════════════════════════════════════════════════════
function ClusterCanvas() {
  const draw = useCallback((ctx,dt,s,w,h)=>{
    if(!s.init){Object.assign(s,{init:true,t:0,phase:"idle",balls:[],id:0,particles:[]});}
    s.t+=dt; s.particles=particles_tick(s.particles,dt);

    const tX=90,tY=h/2, oX=w-90,oY=h/2;
    const ns=[{x:305,y:82},{x:435,y:82},{x:305,y:218},{x:435,y:218}];
    const clX=(ns[0].x+ns[1].x)/2, clY=(ns[0].y+ns[2].y)/2;

    if(s.phase==="idle"&&s.t>700){s.phase="entering";s.t=0;s.balls=[{id:s.id++,prog:0,phase:"enter",trail:[]}];}
    if(s.phase==="entering"){
      s.balls[0].prog=clamp(s.balls[0].prog+dt/650);
      if(s.balls[0].prog>=1){particles_spawn(s.particles,clX,clY,"#a855f7",10);s.phase="splitting";s.t=0;s.balls=[0,1,2,3].map(i=>({id:s.id++,prog:0,phase:"split",t:i,trail:[]}));}
    }
    if(s.phase==="splitting"){
      let d=true; s.balls.forEach(b=>{b.prog=clamp(b.prog+dt/620);if(b.prog<1)d=false;});
      if(d){s.balls.forEach(b=>particles_spawn(s.particles,ns[b.t].x,ns[b.t].y,"#f0abfc",5));s.phase="pause";s.t=0;}
    }
    if(s.phase==="pause"&&s.t>450){s.phase="merging";s.t=0;s.balls=[0,1,2,3].map(i=>({id:s.id++,prog:0,phase:"merge",t:i,trail:[]}));}
    if(s.phase==="merging"){
      let d=true; s.balls.forEach(b=>{b.prog=clamp(b.prog+dt/580);if(b.prog<1)d=false;});
      if(d){particles_spawn(s.particles,oX,oY,"#22d3ee",12);s.phase="done";s.t=0;s.balls=[];}
    }
    if(s.phase==="done"&&s.t>850){s.phase="idle";s.t=0;}

    bgGrid(ctx,w,h);
    dashed(ctx,tX+22,tY,ns[0].x-20,tY,ca("#22d3ee",0.15));
    dashed(ctx,ns[1].x+20,oY,oX-22,oY,ca("#22d3ee",0.15));

    // cluster box
    ctx.beginPath();ctx.roundRect(270,52,198,215,10);
    ctx.fillStyle=ca("#a855f7",0.06);ctx.fill();
    ctx.strokeStyle=ca("#a855f7",s.phase==="splitting"||s.phase==="pause"||s.phase==="merging"?0.55:0.18);
    ctx.lineWidth=1.5;ctx.stroke();
    ctx.font="10px 'JetBrains Mono',monospace";ctx.fillStyle="#cbd5e1";ctx.textAlign="center";ctx.fillText("«Cluster»",clX,44);

    ns.forEach((n,i)=>{
      const lit=["pause","merging"].includes(s.phase)||(s.phase==="splitting"&&(s.balls[i]?.prog||0)>0.85);
      node(ctx,n.x,n.y,42,lit?"#a855f7":"#334155",`Node ${i+1}`,"server",lit?(Math.sin(s.t/380+i)+1)/2*0.4:0);
    });

    // task block
    ctx.beginPath();ctx.roundRect(tX-36,tY-24,72,48,6);
    ctx.fillStyle=ca("#22d3ee",(Math.sin(s.t/400)+1)/2*0.12+0.05);ctx.fill();
    ctx.strokeStyle=ca("#22d3ee",0.5);ctx.lineWidth=1.5;ctx.stroke();
    ctx.font="12px 'JetBrains Mono',monospace";ctx.fillStyle="#22d3ee";ctx.textAlign="center";ctx.fillText("TASK",tX,tY+5);

    // result block
    ctx.globalAlpha=["done","idle"].includes(s.phase)?1:0.25;
    ctx.beginPath();ctx.roundRect(oX-36,oY-24,72,48,6);
    ctx.fillStyle=ca("#22d3ee",0.1);ctx.fill();
    ctx.strokeStyle=ca("#22d3ee",0.5);ctx.lineWidth=1.5;ctx.stroke();
    ctx.font="12px 'JetBrains Mono',monospace";ctx.fillStyle="#22d3ee";ctx.textAlign="center";ctx.fillText("RESULT",oX,oY+5);
    ctx.globalAlpha=1;

    s.balls.forEach(b=>{
      let bx,by,c;
      if(b.phase==="enter"){const p=ease.outCubic(b.prog);bx=lerp(tX+36,clX,p);by=tY;c="#22d3ee";}
      else if(b.phase==="split"){const p=ease.outBack(clamp(b.prog));bx=lerp(clX,ns[b.t].x,p);by=lerp(clY,ns[b.t].y,p);c="#a855f7";}
      else{const p=ease.inOutCubic(b.prog);bx=lerp(ns[b.t].x,oX-36,p);by=lerp(ns[b.t].y,oY,p);c="#22d3ee";}
      addTrail(b,bx,by); trail(ctx,b.trail,c); glowBall(ctx,bx,by,5,c);
    });
    particles_draw(ctx,s.particles);
  },[]);
  return <CanvasScene width={700} height={300} draw={draw} sceneKey="cluster"/>;
}

// ═══════════════════════════════════════════════════════════
// SCENE 2b — GRID
// ═══════════════════════════════════════════════════════════
function GridCanvas() {
  const ns=[
    {x:88,y:85,icon:"laptop",label:"EU Cluster",speed:1.0,color:"#22d3ee"},
    {x:290,y:52,icon:"phone",label:"US Mobile",speed:2.1,color:"#f59e0b"},
    {x:492,y:108,icon:"server",label:"AS Server",speed:0.55,color:"#a855f7"},
    {x:155,y:235,icon:"server",label:"AU Node",speed:1.4,color:"#10b981"},
    {x:405,y:245,icon:"laptop",label:"EU-2",speed:0.9,color:"#f472b6"},
  ];
  const draw = useCallback((ctx,dt,s,w,h)=>{
    if(!s.init){Object.assign(s,{init:true,t:0,spawnT:0,balls:[],id:0,particles:[]});}
    s.t+=dt; s.spawnT+=dt; s.particles=particles_tick(s.particles,dt);
    const sX=w-80,sY=h/2+20;

    if(s.spawnT>720){
      s.spawnT=0;
      const tgt=ns[s.id%ns.length]; const sz=[4,5,7,9][Math.floor(Math.random()*4)];
      s.balls.push({id:s.id++,prog:0,tgt,sz,speed:tgt.speed,color:tgt.color,trail:[]});
    }
    s.balls.forEach(b=>{b.prog=clamp(b.prog+dt/1000*b.speed);});
    s.balls=s.balls.filter(b=>{if(b.prog>=1){particles_spawn(s.particles,b.tgt.x,b.tgt.y,b.color,6);return false;}return true;});

    bgGrid(ctx,w,h,"rgba(100,116,139,0.06)");
    ns.forEach(n=>dashed(ctx,sX,sY,n.x,n.y,ca(n.color,0.1),[4,5],1));
    node(ctx,sX,sY,46,"#94a3b8","Job Server","database",0);
    ns.forEach(n=>node(ctx,n.x,n.y,44,n.color,n.label,n.icon,0));

    s.balls.forEach(b=>{
      const p=ease.inOutCubic(b.prog);
      const bx=lerp(sX,b.tgt.x,p),by=lerp(sY,b.tgt.y,p);
      addTrail(b,bx,by,24); trail(ctx,b.trail,b.color); glowBall(ctx,bx,by,b.sz,b.color);
    });
    particles_draw(ctx,s.particles);
  },[]);
  return <CanvasScene width={700} height={300} draw={draw} sceneKey="grid"/>;
}

// ═══════════════════════════════════════════════════════════
// SCENE 2c — CLOUD AUTO-SCALE
// ═══════════════════════════════════════════════════════════
function CloudCanvas() {
  const draw = useCallback((ctx,dt,s,w,h)=>{
    if(!s.init){Object.assign(s,{init:true,t:0,spawnT:0,balls:[],id:0,particles:[],phase:"loading",
      servers:[{id:0,x:350,y:h/2-10,red:false,sp:1,shake:0}]});}
    s.t+=dt; s.spawnT+=dt; s.particles=particles_tick(s.particles,dt);
    const uX=68,uY=h/2-10;

    if(s.phase==="loading"&&s.t>3500){
      s.phase="overloaded"; s.servers[0].red=true; s.overT=0;
    }
    if(s.phase==="overloaded"){
      s.overT=(s.overT||0)+dt;
      s.servers[0].shake=Math.sin(s.overT/55)*3.5;
      if(s.overT>900){
        s.phase="spawning";
        s.servers.push({id:1,x:195,y:h/2+72,red:false,sp:0,shake:0});
        s.servers.push({id:2,x:505,y:h/2+72,red:false,sp:0,shake:0});
        particles_spawn(s.particles,195,h/2+72,"#22d3ee",8);
        particles_spawn(s.particles,505,h/2+72,"#22d3ee",8);
      }
    }
    if(s.phase==="spawning"){
      s.servers.forEach(sv=>{if(sv.sp<1)sv.sp=clamp(sv.sp+dt/480);});
      if(s.servers.every(sv=>sv.sp>=1)){s.phase="scaled";s.servers[0].red=false;s.servers[0].shake=0;s.scaledT=0;}
    }
    if(s.phase==="scaled"){
      s.scaledT=(s.scaledT||0)+dt;
      if(s.scaledT>3500){s.phase="loading";s.t=0;s.servers=[{id:0,x:350,y:h/2-10,red:false,sp:1,shake:0}];}
    }

    if(s.spawnT>600){
      s.spawnT=0;
      const ok=s.servers.filter(sv=>!sv.red&&sv.sp>0.5);
      if(ok.length){const tgt=ok[s.id%ok.length];s.balls.push({id:s.id++,prog:0,tid:tgt.id,trail:[]});}
    }
    s.balls.forEach(b=>{b.prog=clamp(b.prog+dt/1400);});
    s.balls=s.balls.filter(b=>{
      if(b.prog>=1){const sv=s.servers.find(x=>x.id===b.tid);if(sv)particles_spawn(s.particles,sv.x,sv.y,sv.red?"#ef4444":"#22d3ee",4);return false;}
      return true;
    });

    bgGrid(ctx,w,h);
    s.servers.forEach(sv=>dashed(ctx,uX+22,uY,sv.x-24,sv.y,ca(sv.red?"#ef4444":"#22d3ee",0.12),[5,4]));
    node(ctx,uX,uY,44,"#22d3ee","User","user",0);

    s.servers.forEach(sv=>{
      ctx.globalAlpha=sv.sp;
      const pulse=sv.red?(Math.sin(s.t/130)+1)/2*0.8:0;
      node(ctx,sv.x,sv.y,48,sv.red?"#ef4444":"#22d3ee",sv.id===0?"Primary":sv.id===1?"Replica-1":"Replica-2","cloud",pulse,sv.shake||0);
      if(sv.red){
        ctx.font="bold 11px 'JetBrains Mono',monospace";ctx.textAlign="center";
        ctx.fillStyle="#fca5a5";
        ctx.shadowBlur=8; ctx.shadowColor="#ef4444";
        ctx.fillText("OVERLOADED",sv.x+(sv.shake||0),sv.y-38);
        ctx.shadowBlur=0;
      }
      ctx.globalAlpha=1;
    });

    s.balls.forEach(b=>{
      const sv=s.servers.find(x=>x.id===b.tid); if(!sv) return;
      const p=ease.outCubic(b.prog);
      const bx=lerp(uX+22,sv.x,p),by=lerp(uY,sv.y,p);
      const c=sv.red?"#ef4444":"#22d3ee";
      addTrail(b,bx,by,16); trail(ctx,b.trail,c); glowBall(ctx,bx,by,4.5,c);
    });
    particles_draw(ctx,s.particles);
  },[]);
  return <CanvasScene width={700} height={300} draw={draw} sceneKey="cloud"/>;
}

// ═══════════════════════════════════════════════════════════
// SCENE 2d — P2P
// ═══════════════════════════════════════════════════════════
function P2PCanvas() {
  const cx=350,cy=145,R=115;
  const cols=["#22d3ee","#a855f7","#10b981","#f59e0b","#f472b6","#818cf8"];
  const nds=Array.from({length:6},(_,i)=>({x:cx+R*Math.cos((i/6)*Math.PI*2-Math.PI/2),y:cy+R*Math.sin((i/6)*Math.PI*2-Math.PI/2),label:`Peer ${i+1}`}));
  const edges=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,3],[1,4],[2,5]];

  const draw = useCallback((ctx,dt,s,w,h)=>{
    if(!s.init){Object.assign(s,{init:true,t:0,spawnT:0,balls:[],id:0,particles:[]});}
    s.t+=dt; s.spawnT+=dt; s.particles=particles_tick(s.particles,dt);

    if(s.spawnT>1100){
      s.spawnT=0; const e=edges[Math.floor(Math.random()*edges.length)];
      const [a,b]=Math.random()>0.5?e:[e[1],e[0]];
      s.balls.push({id:s.id++,prog:0,from:a,to:b,color:cols[a],trail:[]});
    }
    s.balls.forEach(b=>{b.prog=clamp(b.prog+dt/1300);});
    s.balls=s.balls.filter(b=>{if(b.prog>=1){particles_spawn(s.particles,nds[b.to].x,nds[b.to].y,b.color,5);return false;}return true;});

    bgGrid(ctx,w,h);
    edges.forEach(([a,b])=>dashed(ctx,nds[a].x,nds[a].y,nds[b].x,nds[b].y,"rgba(30,58,138,0.4)",[4,5],1));

    ctx.beginPath();ctx.arc(cx,cy,30,0,Math.PI*2);
    ctx.fillStyle=ca("#10b981",0.08);ctx.fill();
    ctx.strokeStyle=ca("#10b981",0.3);ctx.lineWidth=1;ctx.stroke();
    ctx.font="9px 'JetBrains Mono',monospace";ctx.fillStyle="#6ee7b7";ctx.textAlign="center";ctx.fillText("No SPOF",cx,cy+4);

    nds.forEach((n,i)=>node(ctx,n.x,n.y,42,cols[i],n.label,"server",0));
    s.balls.forEach(b=>{
      const f=nds[b.from],t=nds[b.to],p=ease.inOutCubic(b.prog);
      const bx=lerp(f.x,t.x,p),by=lerp(f.y,t.y,p);
      addTrail(b,bx,by,22); trail(ctx,b.trail,b.color); glowBall(ctx,bx,by,5,b.color);
    });
    particles_draw(ctx,s.particles);
  },[]);
  return <CanvasScene width={700} height={300} draw={draw} sceneKey="p2p"/>;
}

// ═══════════════════════════════════════════════════════════
// SCENE 3a — CLIENT-SERVER
// ═══════════════════════════════════════════════════════════
function ClientServerCanvas() {
  const cls=[{x:80,y:72},{x:80,y:152},{x:80,y:232}];
  const sv={x:570,y:152};
  const draw = useCallback((ctx,dt,s,w,h)=>{
    if(!s.init){Object.assign(s,{init:true,t:0,spawnT:0,balls:[],id:0,particles:[]});}
    s.t+=dt; s.spawnT+=dt; s.particles=particles_tick(s.particles,dt);

    if(s.spawnT>520){s.spawnT=0;s.balls.push({id:s.id++,prog:0,from:s.id%3,trail:[]});}
    s.balls.forEach(b=>{b.prog=clamp(b.prog+dt/620);});
    s.balls=s.balls.filter(b=>{if(b.prog>=1){particles_spawn(s.particles,sv.x,sv.y,"#a855f7",5);return false;}return true;});

    bgGrid(ctx,w,h,"rgba(168,85,247,0.04)");
    cls.forEach(c=>dashed(ctx,c.x+22,c.y,sv.x-26,sv.y,ca("#a855f7",0.12),[5,4],1.2));

    const p2=(Math.sin(s.t/580)+1)/2*0.5;
    node(ctx,sv.x,sv.y,52,"#a855f7","Server","server",p2);
    ctx.font="10px 'JetBrains Mono',monospace";ctx.textAlign="center";
    ctx.fillStyle="#d8b4fe";ctx.fillText("Single Point of Failure",sv.x,sv.y+46);

    cls.forEach((c,i)=>node(ctx,c.x,c.y,42,"#22d3ee",`Client ${i+1}`,"user",0));
    s.balls.forEach(b=>{
      const c=cls[b.from%3],p=ease.outCubic(b.prog);
      const bx=lerp(c.x+22,sv.x-26,p),by=lerp(c.y,sv.y,p);
      addTrail(b,bx,by,18); trail(ctx,b.trail,"#22d3ee"); glowBall(ctx,bx,by,5,"#22d3ee");
    });
    particles_draw(ctx,s.particles);
  },[]);
  return <CanvasScene width={700} height={310} draw={draw} sceneKey="cs"/>;
}

// ═══════════════════════════════════════════════════════════
// SCENE 3b — DECENTRALIZED
// ═══════════════════════════════════════════════════════════
function DecentralizedCanvas() {
  const cx=350,cy=152,R=115;
  const cols=["#22d3ee","#a855f7","#10b981","#f59e0b","#f472b6","#818cf8"];
  const nds=Array.from({length:6},(_,i)=>({x:cx+R*Math.cos((i/6)*Math.PI*2-Math.PI/2),y:cy+R*Math.sin((i/6)*Math.PI*2-Math.PI/2),label:`Node ${i+1}`}));
  const edges=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,3],[1,4],[2,5]];

  const draw = useCallback((ctx,dt,s,w,h)=>{
    if(!s.init){Object.assign(s,{init:true,t:0,spawnT:0,balls:[],id:0,particles:[]});}
    s.t+=dt; s.spawnT+=dt; s.particles=particles_tick(s.particles,dt);

    if(s.spawnT>1100){
      s.spawnT=0; const e=edges[Math.floor(Math.random()*edges.length)];
      const [a,b]=Math.random()>0.5?e:[e[1],e[0]];
      s.balls.push({id:s.id++,prog:0,from:a,to:b,color:cols[a],trail:[]});
    }
    s.balls.forEach(b=>{b.prog=clamp(b.prog+dt/1300);});
    s.balls=s.balls.filter(b=>{if(b.prog>=1){particles_spawn(s.particles,nds[b.to].x,nds[b.to].y,b.color,5);return false;}return true;});

    bgGrid(ctx,w,h);
    edges.forEach(([a,b])=>dashed(ctx,nds[a].x,nds[a].y,nds[b].x,nds[b].y,"rgba(30,58,138,0.4)",[4,5],1));
    ctx.beginPath();ctx.arc(cx,cy,30,0,Math.PI*2);
    ctx.fillStyle=ca("#10b981",0.08);ctx.fill();ctx.strokeStyle=ca("#10b981",0.3);ctx.lineWidth=1;ctx.stroke();
    ctx.font="9px 'JetBrains Mono',monospace";ctx.fillStyle="#6ee7b7";ctx.textAlign="center";ctx.fillText("No SPOF ✓",cx,cy+4);

    nds.forEach((n,i)=>node(ctx,n.x,n.y,42,cols[i],n.label,"server",0));
    s.balls.forEach(b=>{
      const f=nds[b.from],t=nds[b.to],p=ease.inOutCubic(b.prog);
      const bx=lerp(f.x,t.x,p),by=lerp(f.y,t.y,p);
      addTrail(b,bx,by,22); trail(ctx,b.trail,b.color); glowBall(ctx,bx,by,5,b.color);
    });
    particles_draw(ctx,s.particles);
  },[]);
  return <CanvasScene width={700} height={310} draw={draw} sceneKey="dc"/>;
}

// ═══════════════════════════════════════════════════════════
// SCENE 4a — HARDWARE
// ═══════════════════════════════════════════════════════════
function HardwareCanvas() {
  const draw = useCallback((ctx,dt,s,w,h)=>{
    if(!s.init){Object.assign(s,{init:true,t:0,mpT:0,mcT:0,mpBalls:[],mcBalls:[],id:0,particles:[]});}
    s.t+=dt; s.mpT+=dt; s.mcT+=dt; s.particles=particles_tick(s.particles,dt);

    const mp=[{x:130,y:70},{x:300,y:70},{x:470,y:70}];
    const mc=[{x:130,y:235},{x:300,y:235},{x:470,y:235}];
    const memY=118;

    if(s.mpT>1300){s.mpT=0;const pairs=[[0,1],[1,2],[2,0],[0,2],[2,1],[1,0]];const[a,b]=pairs[s.id%6];s.mpBalls.push({id:s.id++,prog:0,from:a,to:b,trail:[]});}
    s.mpBalls.forEach(b=>{b.prog=clamp(b.prog+dt/1400);});
    s.mpBalls=s.mpBalls.filter(b=>{if(b.prog>=1){particles_spawn(s.particles,mp[b.to].x,mp[b.to].y,"#22d3ee",5);return false;}return true;});

    if(s.mcT>1300){s.mcT=0;const pairs=[[0,1],[1,2],[2,1],[1,0]];const[a,b]=pairs[s.id%4];s.mcBalls.push({id:s.id++,prog:0,from:a,to:b,trail:[]});}
    s.mcBalls.forEach(b=>{b.prog=clamp(b.prog+dt/1400);});
    s.mcBalls=s.mcBalls.filter(b=>{if(b.prog>=1){particles_spawn(s.particles,mc[b.to].x,mc[b.to].y,"#a855f7",5);return false;}return true;});

    bgGrid(ctx,w,h);

    ctx.beginPath();ctx.moveTo(30,158);ctx.lineTo(w-30,158);ctx.strokeStyle="rgba(255,255,255,0.04)";ctx.lineWidth=1;ctx.setLineDash([3,6]);ctx.stroke();ctx.setLineDash([]);

    ctx.font="12px 'JetBrains Mono',monospace";ctx.textAlign="left";
    ctx.fillStyle="#67e8f9";ctx.fillText("Multiprocessor — Shared Memory",30,22);
    ctx.fillStyle="#c084fc";ctx.fillText("Multicomputer — Message Passing",30,176);

    // shared mem bar
    ctx.beginPath();ctx.roundRect(100,memY,410,22,4);
    ctx.fillStyle=ca("#22d3ee",0.1);ctx.fill();ctx.strokeStyle=ca("#22d3ee",0.4);ctx.lineWidth=1.5;ctx.stroke();
    ctx.font="10px 'JetBrains Mono',monospace";ctx.textAlign="center";ctx.fillStyle="#67e8f9";
    ctx.fillText("S H A R E D   M E M O R Y",305,memY+15);

    mp.forEach((n,i)=>{
      ctx.beginPath();ctx.moveTo(n.x,n.y+22);ctx.lineTo(n.x,memY);ctx.strokeStyle=ca("#22d3ee",0.2);ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([]);
      node(ctx,n.x,n.y,42,"#22d3ee",`CPU ${i+1}`,"server",0);
    });
    s.mpBalls.forEach(b=>{
      const f=mp[b.from],t2=mp[b.to],p=ease.inOutCubic(b.prog);
      let bx,by;
      if(p<0.28){bx=f.x;by=lerp(f.y+22,memY+11,p/0.28);}
      else if(p<0.72){bx=lerp(f.x,t2.x,(p-0.28)/0.44);by=memY+11;}
      else{bx=t2.x;by=lerp(memY+11,t2.y+22,(p-0.72)/0.28);}
      addTrail(b,bx,by,16); trail(ctx,b.trail,"#22d3ee"); glowBall(ctx,bx,by,4.5,"#22d3ee");
    });

    mc.forEach((n,i)=>{
      node(ctx,n.x,n.y,42,"#a855f7",`Node ${i+1}`,"server",0);
      ctx.beginPath();ctx.roundRect(n.x-20,n.y+28,40,16,3);
      ctx.fillStyle=ca("#a855f7",0.14);ctx.fill();ctx.strokeStyle=ca("#a855f7",0.4);ctx.lineWidth=1;ctx.stroke();
      ctx.font="8px 'JetBrains Mono',monospace";ctx.textAlign="center";ctx.fillStyle="#c084fc";ctx.fillText("MEM",n.x,n.y+40);
    });
    s.mcBalls.forEach(b=>{
      const f=mc[b.from],t2=mc[b.to],p=ease.inOutCubic(b.prog);
      const bx=lerp(f.x,t2.x,p),by=lerp(f.y,t2.y,p);
      addTrail(b,bx,by,18); trail(ctx,b.trail,"#a855f7"); glowBall(ctx,bx,by,4.5,"#a855f7");
    });
    particles_draw(ctx,s.particles);
  },[]);
  return <CanvasScene width={700} height={310} draw={draw} sceneKey="hw"/>;
}

// ═══════════════════════════════════════════════════════════
// SCENE 4b — MIDDLEWARE SOFTWARE STACK
// ═══════════════════════════════════════════════════════════
function MiddlewareCanvas() {
  const draw = useCallback((ctx,dt,s,w,h)=>{
    if(!s.init){Object.assign(s,{init:true,t:0,spawnT:0,balls:[],id:0});}
    s.t+=dt; s.spawnT+=dt;

    const layers=[
      {y:55,label:"Application Layer",sub:"Your distributed app code",color:"#22d3ee",h:58},
      {y:123,label:"Middleware",sub:"Transparency · Naming · Replication · Sync",color:"#a855f7",h:58},
      {y:191,label:"Operating System",sub:"Local hardware & kernel",color:"#10b981",h:58},
    ];
    const stacks=[{x:165,w:210},{x:535,w:210}];

    if(s.spawnT>1400){
      s.spawnT=0;
      const side=s.id%2, dir=side===0?1:-1;
      s.balls.push({id:s.id++,prog:0,side,dir,trail:[]});
    }
    s.balls.forEach(b=>{b.prog=clamp(b.prog+dt/1600);});
    s.balls=s.balls.filter(b=>b.prog<1);

    bgGrid(ctx,w,h);
    stacks.forEach(st=>{
      layers.forEach(l=>{
        const mid=l.label==="Middleware";
        ctx.beginPath(); ctx.roundRect(st.x-st.w/2,l.y,st.w,l.h,6);
        ctx.fillStyle=ca(l.color,mid?0.13:0.07); ctx.fill();
        ctx.strokeStyle=ca(l.color,mid?0.75:0.3); ctx.lineWidth=mid?1.8:1.2;
        if(mid){ctx.shadowBlur=16;ctx.shadowColor=l.color;}
        ctx.stroke(); ctx.shadowBlur=0;
        ctx.font=`${mid?"bold ":""}12px 'JetBrains Mono',monospace`;
        ctx.fillStyle=mid?"#fff":l.color; ctx.textAlign="center"; ctx.fillText(l.label,st.x,l.y+26);
        ctx.font="10px 'JetBrains Mono',monospace"; ctx.fillStyle=mid?"#e2e8f0":ca(l.color,0.85);
        ctx.fillText(l.sub,st.x,l.y+44);
      });
      // connectors between layers
      [[113,123],[181,191]].forEach(([y1,y2])=>{
        ctx.beginPath();ctx.moveTo(st.x,y1);ctx.lineTo(st.x,y2);
        ctx.strokeStyle="rgba(100,116,139,0.3)";ctx.lineWidth=1.5;ctx.stroke();
        ctx.beginPath();ctx.moveTo(st.x-4,y2-6);ctx.lineTo(st.x,y2);ctx.lineTo(st.x+4,y2-6);ctx.stroke();
      });
    });

    // horizontal mw channel
    const mwY=152;
    dashed(ctx,stacks[0].x+stacks[0].w/2+8,mwY,stacks[1].x-stacks[1].w/2-8,mwY,ca("#a855f7",0.35),[6,5],1.5);
    ctx.font="9px 'JetBrains Mono',monospace";ctx.textAlign="center";ctx.fillStyle="#c084fc";
    ctx.fillText("middleware channel",w/2,mwY-8);

    s.balls.forEach(b=>{
      const st=stacks[b.side];
      const p=ease.inOutCubic(b.prog);
      const by2=b.dir>0?lerp(68,245,p):lerp(245,68,p);
      const bx2=st.x+Math.sin(by2*0.09)*8;
      addTrail(b,bx2,by2,16);
      const col=by2<115?"#22d3ee":by2<185?"#a855f7":"#10b981";
      trail(ctx,b.trail,col); glowBall(ctx,bx2,by2,4.5,col);
    });
  },[]);
  return <CanvasScene width={700} height={310} draw={draw} sceneKey="mw"/>;
}

// ═══════════════════════════════════════════════════════════
// SCENE 5 — NETWORK FALLACY
// ═══════════════════════════════════════════════════════════
function FallacyCanvas() {
  const draw = useCallback((ctx,dt,s,w,h)=>{
    if(!s.init){Object.assign(s,{init:true,t:0,phase:"idle",balls:[],id:0,particles:[],phaseT:0,sparks:[],msg:""});}
    s.t+=dt; s.phaseT+=dt; s.particles=particles_tick(s.particles,dt);

    const sX=80,sY=h/2, dX=590,dY=h/2, bkX=335,bkY=h/2;

    // sparks on break
    if(Math.random()<0.09){s.sparks.push({x:bkX+(Math.random()-0.5)*18,y:bkY+(Math.random()-0.5)*18,vx:(Math.random()-0.5)*3.5,vy:-Math.random()*3-1,life:1});}
    s.sparks.forEach(p=>{p.x+=p.vx*(dt/16);p.y+=p.vy*(dt/16);p.vy+=0.1*(dt/16);p.life-=0.045*(dt/16);});
    s.sparks=s.sparks.filter(p=>p.life>0);

    if(s.phase==="idle"&&s.phaseT>800){
      s.phase="sending";s.phaseT=0;s.balls=[];s.msg="● SENDING 3 PACKETS";
      [0,1,2].forEach(i=>setTimeout(()=>s.balls.push({id:s.id++,prog:0,row:i,status:"flying",trail:[]}),i*550));
      setTimeout(()=>{const b=s.balls.find(b=>b.row===1);if(b){b.status="dropped";particles_spawn(s.particles,bkX,bkY,"#ef4444",9);}},2000);
    }
    if(s.phase==="sending"&&s.phaseT>4000){s.phase="waiting";s.phaseT=0;s.msg="⏱ TIMEOUT — PACKET 2 LOST";}
    if(s.phase==="waiting"&&s.phaseT>1800){
      s.phase="resending";s.phaseT=0;s.msg="↩ RETRANSMITTING PACKET 2";
      s.balls.push({id:s.id++,prog:0,row:1,status:"resent",trail:[]});
    }
    if(s.phase==="resending"&&s.phaseT>2500){s.phase="done";s.phaseT=0;s.msg="✓ ALL PACKETS DELIVERED";}
    if(s.phase==="done"&&s.phaseT>1500){s.phase="idle";s.phaseT=0;s.balls=[];s.msg="";}

    s.balls.forEach(b=>{if(b.status!=="idle")b.prog=clamp(b.prog+dt/1500);});

    bgGrid(ctx,w,h,"rgba(239,68,68,0.04)");

    dashed(ctx,sX+24,sY,bkX-26,sY,"#1e3a5f",[6,5],2);
    dashed(ctx,bkX+26,sY,dX-26,sY,"#1e3a5f",[6,5],2);

    // broken link icon
    const bz=(Math.sin(s.t/75)+1)/2;
    ctx.beginPath();ctx.roundRect(bkX-24,bkY-24,48,48,7);
    ctx.fillStyle=ca("#ef4444",0.1+bz*0.13);ctx.fill();
    ctx.strokeStyle=ca("#ef4444",0.4+bz*0.4);ctx.lineWidth=1.5;ctx.stroke();
    ctx.font="22px sans-serif";ctx.textAlign="center";ctx.fillStyle="#fff";ctx.fillText("⚡",bkX,bkY+9);
    ctx.font="9px 'JetBrains Mono',monospace";ctx.fillStyle="#ef4444";ctx.fillText("BROKEN LINK",bkX,bkY+34);

    s.sparks.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,p.life*2,0,Math.PI*2);ctx.fillStyle=ca("#fbbf24",p.life);ctx.fill();});

    node(ctx,sX,sY,48,"#22d3ee","Sender","server",0);
    node(ctx,dX,dY,48,"#10b981","Receiver","server",0);

    if(s.phase==="waiting"){
      const pa=(Math.sin(s.t/180)+1)/2;
      ctx.font="bold 12px 'JetBrains Mono',monospace";ctx.textAlign="center";
      ctx.fillStyle=ca("#fbbf24",0.9+pa*0.1);
      ctx.shadowBlur=8; ctx.shadowColor="#fbbf24";
      ctx.fillText("ACK timeout...",sX,sY-48);
      ctx.shadowBlur=0;
    }

    s.balls.forEach(b=>{
      const yOff=(b.row-1)*22;
      if(b.status==="dropped"){
        const maxP=(bkX-26-sX-24)/(dX-26-sX-24);
        const p=ease.outCubic(Math.min(b.prog/maxP,1));
        const bx=lerp(sX+24,bkX-26,p),by=sY+yOff;
        const a=b.prog>maxP*0.82?clamp(1-(b.prog-maxP*0.82)/(maxP*0.18)):1;
        ctx.globalAlpha=a; addTrail(b,bx,by); trail(ctx,b.trail,"#ef4444"); glowBall(ctx,bx,by,5,"#ef4444"); ctx.globalAlpha=1;
      } else {
        const c=b.status==="resent"?"#f59e0b":"#22d3ee";
        const p=ease.outCubic(b.prog);
        const bx=lerp(sX+24,dX-26,p),by=sY+yOff;
        addTrail(b,bx,by,18); trail(ctx,b.trail,c); glowBall(ctx,bx,by,b.status==="resent"?6:5,c);
        if(b.prog>=0.97)particles_spawn(s.particles,dX,dY,c,3);
      }
    });
    particles_draw(ctx,s.particles);

    if(s.msg){
      const col=s.phase==="done"?"#34d399":s.phase==="waiting"||s.phase==="resending"?"#fbbf24":"#67e8f9";
      ctx.font="bold 12px 'JetBrains Mono',monospace";ctx.textAlign="center";
      ctx.fillStyle=col;
      ctx.shadowBlur=10; ctx.shadowColor=col;
      ctx.fillText(s.msg,w/2,h-20);
      ctx.shadowBlur=0;
    }
  },[]);
  return <CanvasScene width={700} height={300} draw={draw} sceneKey="fallacy"/>;
}

// ═══════════════════════════════════════════════════════════
// SHARED UI WRAPPER
// ═══════════════════════════════════════════════════════════
function SceneCard({ title, children }) {
  return (
    <div className="bg-slate-950 border border-slate-600 rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-700 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"/>
        <span className="text-xs font-mono text-slate-200">{title}</span>
      </div>
      <div className="flex justify-center bg-[#020b18] p-2">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION VIEWS
// ═══════════════════════════════════════════════════════════
function IntroSection() {
  return (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
        <h2 className="text-cyan-400 font-mono text-lg mb-3">What is a Distributed System?</h2>
        <p className="text-white leading-relaxed text-sm">
          A <span className="text-cyan-400 font-semibold">distributed system</span> is a collection of independent
          computers that appears to its users as a single coherent system. Machines communicate only by passing
          messages, yet together they solve problems no single machine could — hiding internal complexity through{" "}
          <span className="text-purple-400 font-semibold">transparency</span>.
        </p>
      </div>
      <SceneCard title="live · transparency: the user sees ONE system, not many nodes">
        <IntroCanvas/>
      </SceneCard>
    </div>
  );
}

function TypesSection() {
  const [tab, setTab] = useState("cluster");
  const tabs=[
    {id:"cluster",label:"Cluster",desc:"Identical nodes, task split in parallel"},
    {id:"grid",label:"Grid",desc:"Heterogeneous devices, geographically scattered"},
    {id:"cloud",label:"Cloud",desc:"Elastic auto-scaling on overload"},
    {id:"p2p",label:"P2P",desc:"No central server — pure mesh"},
  ];
  const scenes={cluster:<ClusterCanvas/>,grid:<GridCanvas/>,cloud:<CloudCanvas/>,p2p:<P2PCanvas/>};
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-4 py-2 rounded-lg font-mono text-sm border transition-all duration-150 ${
              tab===t.id?"bg-cyan-500/20 border-cyan-500 text-cyan-300":"bg-slate-800/80 border-slate-700 text-slate-200 hover:border-slate-500 hover:text-white"
            }`}>{t.label}</button>
        ))}
      </div>
      <div className="text-xs font-mono text-slate-300">{tabs.find(t=>t.id===tab)?.desc}</div>
      <SceneCard title={`live · ${tab} computing`}>{scenes[tab]}</SceneCard>
    </div>
  );
}

function ModelsSection() {
  const [mode, setMode] = useState("cs");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[["cs","Client-Server"],["dc","Decentralized"]].map(([k,v])=>(
          <button key={k} onClick={()=>setMode(k)}
            className={`px-4 py-2 rounded-lg font-mono text-sm border transition-all ${
              mode===k?"bg-purple-500/20 border-purple-500 text-purple-300":"bg-slate-800/80 border-slate-700 text-slate-200 hover:border-purple-600 hover:text-white"
            }`}>{v}</button>
        ))}
      </div>
      <SceneCard title={`live · ${mode==="cs"?"client-server":"decentralized"} architecture`}>
        {mode==="cs"?<ClientServerCanvas/>:<DecentralizedCanvas/>}
      </SceneCard>
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        {[
          {k:"cs",color:"#a855f7",label:"Client-Server",body:"Central authority. Simple to manage but a SPOF concentrates all load and risk on one machine."},
          {k:"dc",color:"#10b981",label:"Decentralized",body:"No central hub. Nodes route directly. Resilient — one failure doesn't cascade through the system."},
        ].map(x=>(
          <div key={x.k} className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="font-semibold mb-1" style={{color:x.color}}>{x.label}</div>
            <div className="text-slate-200 leading-relaxed">{x.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HardwareSection() {
  const [view, setView] = useState("hw");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[["hw","Hardware"],["sw","Software Stack"]].map(([k,v])=>(
          <button key={k} onClick={()=>setView(k)}
            className={`px-4 py-2 rounded-lg font-mono text-sm border transition-all ${
              view===k?"bg-cyan-500/20 border-cyan-500 text-cyan-300":"bg-slate-800/80 border-slate-700 text-slate-200 hover:border-cyan-600 hover:text-white"
            }`}>{v}</button>
        ))}
      </div>
      <SceneCard title={view==="hw"?"live · multiprocessor (shared mem) vs multicomputer (message passing)":"live · middleware translates between app and os"}>
        {view==="hw"?<HardwareCanvas/>:<MiddlewareCanvas/>}
      </SceneCard>
    </div>
  );
}

function FallaciesSection() {
  return (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-red-800/60 rounded-xl p-5">
        <h3 className="text-red-400 font-mono font-bold mb-2">⚠ Fallacy #1: The Network is Reliable</h3>
        <p className="text-white text-sm leading-relaxed">
          Engineers often design as if the network is perfect. In reality, packets are dropped silently,
          connections time out, and links fail. Every component must implement retransmission, idempotency,
          and acknowledgement logic — or accept silent data loss in production.
        </p>
      </div>
      <SceneCard title="live · packet drop · ACK timeout · retransmission">
        <FallacyCanvas/>
      </SceneCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SYSTEM MODELS — PHYSICAL
// ═══════════════════════════════════════════════════════════
// Shows actual nodes (computers) connected by a network fabric.
// Packets travel along real edges. Different node types: clients,
// servers, routers. Demonstrates LAN vs WAN topology.
function PhysicalModelCanvas() {
  const W=700, H=320;

  // LAN cluster (left) + WAN link + remote cluster (right)
  const lanNodes = [
    {x:110,y:80 ,icon:"user",   label:"Client A", color:"#22d3ee"},
    {x:110,y:180,icon:"user",   label:"Client B", color:"#22d3ee"},
    {x:110,y:260,icon:"laptop", label:"Client C", color:"#22d3ee"},
    {x:240,y:160,icon:"server", label:"Switch",   color:"#f59e0b"},
  ];
  const wanRouter = {x:350,y:160,icon:"database",label:"Router",color:"#f472b6"};
  const wanNodes = [
    {x:460,y:80 ,icon:"server", label:"Server 1", color:"#a855f7"},
    {x:460,y:160,icon:"server", label:"Server 2", color:"#a855f7"},
    {x:460,y:240,icon:"server", label:"Server 3", color:"#a855f7"},
    {x:590,y:160,icon:"database",label:"DB",      color:"#10b981"},
  ];

  const lanEdges  = [[0,3],[1,3],[2,3]];          // clients → switch
  const wanEdges  = [[3,4],[4,5],[4,6],[4,7],[5,8],[6,8],[7,8]]; // switch→router→servers→db
  const allNodes  = [...lanNodes, wanRouter, ...wanNodes];
  // edge indices into allNodes (lanNodes 0-3, wanRouter 4, wanNodes 5-8)
  const allEdges  = [[0,3],[1,3],[2,3],[3,4],[4,5],[4,6],[4,7],[5,8],[6,8],[7,8]];

  const draw = useCallback((ctx,dt,s,w,h)=>{
    if(!s.init){Object.assign(s,{init:true,t:0,spawnT:0,balls:[],id:0,particles:[]});}
    s.t+=dt; s.spawnT+=dt; s.particles=particles_tick(s.particles,dt);

    if(s.spawnT>900){
      s.spawnT=0;
      // pick a random directed edge
      const e=allEdges[Math.floor(Math.random()*allEdges.length)];
      const [a,b]=Math.random()>0.4?e:[e[1],e[0]];
      const fromN=allNodes[a], toN=allNodes[b];
      s.balls.push({id:s.id++,prog:0,fx:fromN.x,fy:fromN.y,tx:toN.x,ty:toN.y,color:fromN.color,trail:[]});
    }
    s.balls.forEach(b=>{b.prog=clamp(b.prog+dt/1200);});
    s.balls=s.balls.filter(b=>{
      if(b.prog>=1){particles_spawn(s.particles,b.tx,b.ty,b.color,5);return false;}
      return true;
    });

    bgGrid(ctx,w,h,"rgba(34,211,238,0.03)");

    // LAN box
    ctx.beginPath();ctx.roundRect(50,40,240,250,10);
    ctx.fillStyle="rgba(34,211,238,0.04)";ctx.fill();
    ctx.strokeStyle="rgba(34,211,238,0.25)";ctx.lineWidth=1.2;ctx.stroke();
    ctx.font="10px 'JetBrains Mono',monospace";ctx.fillStyle="#67e8f9";ctx.textAlign="center";
    ctx.fillText("LAN",170,32);

    // WAN box
    ctx.beginPath();ctx.roundRect(400,40,260,250,10);
    ctx.fillStyle="rgba(168,85,247,0.04)";ctx.fill();
    ctx.strokeStyle="rgba(168,85,247,0.25)";ctx.lineWidth=1.2;ctx.stroke();
    ctx.fillStyle="#c084fc";ctx.fillText("WAN / Remote Data Centre",530,32);

    // WAN link line
    dashed(ctx,295,160,335,160,"rgba(244,114,182,0.5)",[6,4],2);
    ctx.font="9px 'JetBrains Mono',monospace";ctx.fillStyle="#f9a8d4";ctx.textAlign="center";
    ctx.fillText("Internet",315,152);

    // draw all edges
    allEdges.forEach(([a,b])=>{
      const fn=allNodes[a],tn=allNodes[b];
      dashed(ctx,fn.x,fn.y,tn.x,tn.y,"rgba(100,116,139,0.35)",[4,4],1);
    });

    // draw nodes
    allNodes.forEach(n=>node(ctx,n.x,n.y,40,n.color,n.label,n.icon,0));

    // balls
    s.balls.forEach(b=>{
      const p=ease.inOutCubic(b.prog);
      const bx=lerp(b.fx,b.tx,p),by=lerp(b.fy,b.ty,p);
      addTrail(b,bx,by,18);trail(ctx,b.trail,b.color);glowBall(ctx,bx,by,5,b.color);
    });
    particles_draw(ctx,s.particles);
  },[]);
  return <CanvasScene width={W} height={H} draw={draw} sceneKey="physical"/>;
}

// ═══════════════════════════════════════════════════════════
// SYSTEM MODELS — ARCHITECTURAL (3-tier + service layers)
// ═══════════════════════════════════════════════════════════
function ArchitecturalModelCanvas() {
  const W=700, H=340;

  // 3-tier: Presentation → Logic → Data
  // Plus: microservice fan-out from Logic tier
  const tiers = [
    {y:60,  label:"Presentation Tier", sub:"UI · Browser · Mobile App",       color:"#22d3ee", nodes:[{x:175,label:"Web"},{x:350,label:"Mobile"},{x:525,label:"Desktop"}]},
    {y:165, label:"Logic / Application Tier",sub:"Business Rules · APIs · Services",color:"#a855f7",nodes:[{x:175,label:"API GW"},{x:350,label:"Auth Svc"},{x:525,label:"Order Svc"}]},
    {y:270, label:"Data Tier",          sub:"Databases · Cache · Object Store", color:"#10b981", nodes:[{x:175,label:"PostgreSQL"},{x:350,label:"Redis"},{x:525,label:"S3"}]},
  ];

  const draw = useCallback((ctx,dt,s,w,h)=>{
    if(!s.init){Object.assign(s,{init:true,t:0,spawnT:0,balls:[],id:0,particles:[]});}
    s.t+=dt; s.spawnT+=dt; s.particles=particles_tick(s.particles,dt);

    // spawn: pick random vertical edge (same column, adjacent tiers) or cross-column (logic tier)
    if(s.spawnT>800){
      s.spawnT=0;
      const col=Math.floor(Math.random()*3); // 0,1,2
      const goDown=Math.random()>0.35;
      const fromTier=goDown?0:1, toTier=goDown?1:0; // presentation↔logic
      const fromN=tiers[fromTier].nodes[col];
      const toN=tiers[toTier].nodes[col];
      const extraDown=goDown&&Math.random()>0.5; // sometimes logic→data too
      if(extraDown){
        const t2col=Math.floor(Math.random()*3);
        s.balls.push({id:s.id++,prog:0,
          fx:tiers[1].nodes[col].x,fy:tiers[1].y+25,
          tx:tiers[2].nodes[t2col].x,ty:tiers[2].y+25,
          color:tiers[2].color,trail:[]});
      } else {
        s.balls.push({id:s.id++,prog:0,
          fx:fromN.x,fy:tiers[fromTier].y+25,
          tx:toN.x,ty:tiers[toTier].y+25,
          color:tiers[toTier].color,trail:[]});
      }
    }
    s.balls.forEach(b=>{b.prog=clamp(b.prog+dt/1100);});
    s.balls=s.balls.filter(b=>{
      if(b.prog>=1){particles_spawn(s.particles,b.tx,b.ty,b.color,5);return false;}
      return true;
    });

    bgGrid(ctx,w,h,"rgba(168,85,247,0.03)");

    // draw tier bands
    tiers.forEach(tier=>{
      ctx.beginPath();ctx.roundRect(40,tier.y,W-80,85,8);
      ctx.fillStyle=ca(tier.color,0.07);ctx.fill();
      ctx.strokeStyle=ca(tier.color,0.3);ctx.lineWidth=1.3;ctx.stroke();
      // tier label left
      ctx.font="bold 11px 'JetBrains Mono',monospace";ctx.fillStyle=tier.color;ctx.textAlign="left";
      ctx.fillText(tier.label,52,tier.y+18);
      ctx.font="9px 'JetBrains Mono',monospace";ctx.fillStyle=ca(tier.color,0.8);
      ctx.fillText(tier.sub,52,tier.y+33);
      // nodes
      tier.nodes.forEach(n=>node(ctx,n.x,tier.y+53,42,tier.color,n.label,"server",0));
    });

    // vertical connector lines between tiers (same column)
    [0,1,2].forEach(col=>{
      const x=tiers[0].nodes[col].x;
      dashed(ctx,x,tiers[0].y+85,x,tiers[1].y,ca("#64748b",0.4),[3,4],1.2);
      dashed(ctx,x,tiers[1].y+85,x,tiers[2].y,ca("#64748b",0.4),[3,4],1.2);
    });

    // balls
    s.balls.forEach(b=>{
      const p=ease.outCubic(b.prog);
      const bx=lerp(b.fx,b.tx,p),by=lerp(b.fy,b.ty,p);
      addTrail(b,bx,by,16);trail(ctx,b.trail,b.color);glowBall(ctx,bx,by,5,b.color);
    });
    particles_draw(ctx,s.particles);
  },[]);
  return <CanvasScene width={W} height={H} draw={draw} sceneKey="architectural"/>;
}

// ═══════════════════════════════════════════════════════════
// SYSTEM MODELS — FUNDAMENTAL (Interaction · Failure · Security)
// ═══════════════════════════════════════════════════════════
function FundamentalModelCanvas({ submodel="interaction" }) {
  const W=700, H=300;

  const draw = useCallback((ctx,dt,s,w,h)=>{
    if(!s.init||s.submodel!==submodel){
      Object.assign(s,{init:true,submodel,t:0,spawnT:0,balls:[],id:0,particles:[],
        phase:"idle",phaseT:0,sparks:[],crashed:[],secT:0});
    }
    s.t+=dt; s.spawnT+=dt; s.phaseT+=dt; s.particles=particles_tick(s.particles,dt);

    bgGrid(ctx,w,h,"rgba(100,116,139,0.04)");

    // ── INTERACTION MODEL: async vs sync message passing ──────
    if(submodel==="interaction"){
      const nodes=[
        {x:100,y:90, label:"Process A",color:"#22d3ee",icon:"server"},
        {x:100,y:210,label:"Process B",color:"#22d3ee",icon:"server"},
        {x:380,y:90, label:"Process C",color:"#a855f7",icon:"server"},
        {x:380,y:210,label:"Process D",color:"#a855f7",icon:"server"},
        {x:600,y:150,label:"Process E",color:"#10b981",icon:"server"},
      ];
      const edges=[[0,2],[1,3],[2,4],[3,4],[0,3],[1,2]];
      edges.forEach(([a,b])=>dashed(ctx,nodes[a].x,nodes[a].y,nodes[b].x,nodes[b].y,"rgba(100,116,139,0.25)",[4,5],1));
      nodes.forEach(n=>node(ctx,n.x,n.y,42,n.color,n.label,n.icon,0));

      if(s.spawnT>900){
        s.spawnT=0;
        const e=edges[Math.floor(Math.random()*edges.length)];
        const [a,b]=Math.random()>0.5?e:[e[1],e[0]];
        const isAsync=Math.random()>0.4;
        s.balls.push({id:s.id++,prog:0,fx:nodes[a].x,fy:nodes[a].y,tx:nodes[b].x,ty:nodes[b].y,
          color:isAsync?"#f59e0b":"#22d3ee",label:isAsync?"async":"sync",trail:[]});
      }
      s.balls.forEach(b=>{b.prog=clamp(b.prog+dt/1100);});
      s.balls=s.balls.filter(b=>{
        if(b.prog>=1){particles_spawn(s.particles,b.tx,b.ty,b.color,5);return false;}
        return true;
      });
      s.balls.forEach(b=>{
        const p=ease.inOutCubic(b.prog);
        const bx=lerp(b.fx,b.tx,p),by=lerp(b.fy,b.ty,p);
        addTrail(b,bx,by,18);trail(ctx,b.trail,b.color);glowBall(ctx,bx,by,5,b.color);
        // label tag
        if(b.prog>0.1&&b.prog<0.9){
          ctx.font="8px 'JetBrains Mono',monospace";ctx.textAlign="center";ctx.fillStyle=b.color;
          ctx.fillText(b.label,bx,by-10);
        }
      });
      // legend
      ctx.font="10px 'JetBrains Mono',monospace";ctx.textAlign="left";
      glowBall(ctx,30,h-28,5,"#22d3ee");ctx.fillStyle="#67e8f9";ctx.fillText("sync RPC",44,h-24);
      glowBall(ctx,120,h-28,5,"#f59e0b");ctx.fillStyle="#fcd34d";ctx.fillText("async message",134,h-24);
    }

    // ── FAILURE MODEL: crash, omission, byzantine ─────────────
    if(submodel==="failure"){
      const nodes=[
        {x:120,y:90, label:"Node A",color:"#22d3ee",icon:"server",state:"ok"},
        {x:120,y:210,label:"Node B",color:"#22d3ee",icon:"server",state:"ok"},
        {x:310,y:150,label:"Node C",color:"#ef4444",icon:"server",state:"crash"}, // crashed
        {x:490,y:90, label:"Node D",color:"#f59e0b",icon:"server",state:"omit"},  // omission
        {x:490,y:210,label:"Node E",color:"#22d3ee",icon:"server",state:"ok"},
        {x:620,y:150,label:"Node F",color:"#a855f7",icon:"server",state:"byzantine"}, // byzantine
      ];
      const edges=[[0,2],[1,2],[2,3],[2,4],[3,5],[4,5]];
      edges.forEach(([a,b])=>dashed(ctx,nodes[a].x,nodes[a].y,nodes[b].x,nodes[b].y,"rgba(100,116,139,0.25)",[4,5],1));

      // draw nodes with state indicators
      nodes.forEach(n=>{
        const pulse=n.state==="crash"?(Math.sin(s.t/200)+1)/2*0.6:n.state==="byzantine"?(Math.sin(s.t/150)+1)/2*0.5:0;
        node(ctx,n.x,n.y,42,n.color,n.label,n.icon,pulse);
        if(n.state==="crash"){
          ctx.font="bold 14px sans-serif";ctx.textAlign="center";ctx.fillStyle="#fca5a5";ctx.fillText("✕",n.x,n.y-30);
          ctx.font="8px 'JetBrains Mono',monospace";ctx.fillStyle="#fca5a5";ctx.fillText("CRASHED",n.x,n.y-18);
        }
        if(n.state==="omit"){
          ctx.font="8px 'JetBrains Mono',monospace";ctx.textAlign="center";ctx.fillStyle="#fcd34d";
          ctx.fillText("OMISSION",n.x,n.y-18);
          ctx.fillText("(drops msgs)",n.x,n.y-8);
        }
        if(n.state==="byzantine"){
          ctx.font="8px 'JetBrains Mono',monospace";ctx.textAlign="center";ctx.fillStyle="#c084fc";
          ctx.fillText("BYZANTINE",n.x,n.y-18);
          ctx.fillText("(corrupt data)",n.x,n.y-8);
        }
      });

      // animate: balls going to crashed node disappear; to omission node sometimes drop
      if(s.spawnT>1000){
        s.spawnT=0;
        const validEdges=[[0,2],[1,2],[3,5],[4,5]];
        const e=validEdges[Math.floor(Math.random()*validEdges.length)];
        const fn=nodes[e[0]],tn=nodes[e[1]];
        const dropped=tn.state==="crash"||(tn.state==="omit"&&Math.random()>0.5);
        const corrupted=tn.state==="byzantine";
        s.balls.push({id:s.id++,prog:0,fx:fn.x,fy:fn.y,tx:tn.x,ty:tn.y,
          color:dropped?"#ef4444":corrupted?"#a855f7":"#22d3ee",
          dropped,corrupted,trail:[]});
      }
      s.balls.forEach(b=>{b.prog=clamp(b.prog+dt/1200);});
      s.balls=s.balls.filter(b=>{
        if(b.prog>=1){
          if(!b.dropped)particles_spawn(s.particles,b.tx,b.ty,b.color,5);
          return false;
        }
        return true;
      });
      s.balls.forEach(b=>{
        const p=ease.inOutCubic(b.prog);
        const bx=lerp(b.fx,b.tx,p),by=lerp(b.fy,b.ty,p);
        const alpha=b.dropped&&b.prog>0.6?clamp(1-(b.prog-0.6)/0.4):1;
        ctx.globalAlpha=alpha;
        addTrail(b,bx,by,16);trail(ctx,b.trail,b.color);glowBall(ctx,bx,by,5,b.color);
        ctx.globalAlpha=1;
      });
      // legend
      ctx.font="10px 'JetBrains Mono',monospace";ctx.textAlign="left";
      [["#fca5a5","Crash failure",20],["#fcd34d","Omission failure",140],["#c084fc","Byzantine failure",290]].forEach(([c,l,x])=>{
        glowBall(ctx,x+4,h-28,5,c);ctx.fillStyle=c;ctx.fillText(l,x+16,h-24);
      });
    }

    // ── SECURITY MODEL: encryption, auth, firewall ────────────
    if(submodel==="security"){
      s.secT=(s.secT||0)+dt;
      const client={x:80,y:150,label:"Client",color:"#22d3ee",icon:"user"};
      const firewall={x:250,y:150,label:"Firewall",color:"#f59e0b",icon:"database"};
      const authSvc={x:420,y:80,label:"Auth Service",color:"#10b981",icon:"server"};
      const appSvc={x:420,y:210,label:"App Server",color:"#a855f7",icon:"server"};
      const db={x:590,y:150,label:"Encrypted DB",color:"#f472b6",icon:"database"};
      const allN=[client,firewall,authSvc,appSvc,db];

      dashed(ctx,client.x+22,client.y,firewall.x-22,firewall.y,"rgba(245,158,11,0.3)",[5,4],1.5);
      dashed(ctx,firewall.x+22,firewall.y,authSvc.x-22,authSvc.y,"rgba(16,185,129,0.3)",[5,4],1.5);
      dashed(ctx,firewall.x+22,firewall.y,appSvc.x-22,appSvc.y,"rgba(168,85,247,0.3)",[5,4],1.5);
      dashed(ctx,appSvc.x+22,appSvc.y,db.x-22,db.y,"rgba(244,114,182,0.3)",[5,4],1.5);
      dashed(ctx,authSvc.x+22,authSvc.y,db.x-22,db.y,"rgba(244,114,182,0.3)",[5,4],1.5);

      allN.forEach(n=>node(ctx,n.x,n.y,44,n.color,n.label,n.icon,0));

      // lock icon on encrypted db
      ctx.font="18px sans-serif";ctx.textAlign="center";ctx.fillText("🔒",db.x,db.y-28);

      // key exchange animation
      if(s.spawnT>1100){
        s.spawnT=0;
        const routes=[
          [client,firewall,"#f59e0b","🔐"],
          [firewall,authSvc,"#10b981","🗝"],
          [firewall,appSvc,"#a855f7","📦"],
          [appSvc,db,"#f472b6","🔒"],
          [authSvc,db,"#f472b6","✓"],
        ];
        const r=routes[s.id%routes.length];
        s.balls.push({id:s.id++,prog:0,fx:r[0].x,fy:r[0].y,tx:r[1].x,ty:r[1].y,color:r[2],emoji:r[3],trail:[]});
      }
      s.balls.forEach(b=>{b.prog=clamp(b.prog+dt/1300);});
      s.balls=s.balls.filter(b=>{
        if(b.prog>=1){particles_spawn(s.particles,b.tx,b.ty,b.color,5);return false;}
        return true;
      });
      s.balls.forEach(b=>{
        const p=ease.inOutCubic(b.prog);
        const bx=lerp(b.fx,b.tx,p),by=lerp(b.fy,b.ty,p);
        addTrail(b,bx,by,14);trail(ctx,b.trail,b.color);glowBall(ctx,bx,by,5,b.color);
        ctx.font="14px sans-serif";ctx.textAlign="center";ctx.fillText(b.emoji,bx,by-12);
      });

      // legend
      ctx.font="10px 'JetBrains Mono',monospace";ctx.textAlign="left";
      [["#f59e0b","TLS Handshake",20],["#10b981","Auth Token",148],["#f472b6","Encrypted at rest",268]].forEach(([c,l,x])=>{
        glowBall(ctx,x+4,h-28,5,c);ctx.fillStyle=c;ctx.fillText(l,x+16,h-24);
      });
    }

    particles_draw(ctx,s.particles);
  },[submodel]);

  return <CanvasScene width={W} height={H} draw={draw} sceneKey={`fundamental-${submodel}`}/>;
}

// ═══════════════════════════════════════════════════════════
// SYSTEM MODELS SECTION
// ═══════════════════════════════════════════════════════════
function SystemModelsSection() {
  const [model, setModel] = useState("physical");

  const tabs = [
    {id:"physical",     label:"Physical Model",      icon:"🖧"},
    {id:"architectural",label:"Architectural Model",  icon:"⬡"},
    {id:"fundamental",  label:"Fundamental Model",    icon:"⚛"},
  ];
  const [funSub, setFunSub] = useState("interaction");
  const funSubTabs = [
    {id:"interaction",label:"Interaction"},
    {id:"failure",    label:"Failure"},
    {id:"security",   label:"Security"},
  ];

  const descriptions = {
    physical:      "Describes the hardware elements — computers, network links, and topology. It's the most concrete layer: real machines connected by real cables (or radio).",
    architectural: "Describes software entities (processes, objects, services) and how they're arranged into tiers or layers. Defines roles like client, server, peer, or microservice.",
    fundamental:   "Three sub-models that apply to every distributed system regardless of architecture — how processes interact, what kinds of failures can occur, and how security is enforced.",
  };
  const funDescriptions = {
    interaction: "Processes communicate by message passing. Synchronous (blocking RPC) vs asynchronous (fire-and-forget event). Clocks drift — there is no global time.",
    failure:     "Crash failure: process halts. Omission failure: messages silently dropped. Byzantine failure: process sends incorrect or malicious data. Systems must tolerate all three.",
    security:    "Threats: eavesdropping, man-in-the-middle, replay, denial-of-service. Defences: TLS encryption, mutual authentication, firewalls, access-control lists.",
  };

  return (
    <div className="space-y-5">
      {/* Top-level model tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setModel(t.id)}
            className={`px-4 py-2 rounded-lg font-mono text-sm border transition-all duration-150 flex items-center gap-2 ${
              model===t.id
                ?"bg-cyan-500/20 border-cyan-500 text-cyan-300"
                :"bg-slate-800/80 border-slate-700 text-slate-200 hover:border-slate-500 hover:text-white"
            }`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Description card */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
        <p className="text-white text-sm leading-relaxed">{descriptions[model]}</p>
      </div>

      {/* Fundamental sub-tabs */}
      {model==="fundamental" && (
        <div className="flex gap-2">
          {funSubTabs.map(t=>(
            <button key={t.id} onClick={()=>setFunSub(t.id)}
              className={`px-3 py-1.5 rounded-md font-mono text-xs border transition-all ${
                funSub===t.id
                  ?"bg-purple-500/20 border-purple-500 text-purple-300"
                  :"bg-slate-800 border-slate-700 text-slate-200 hover:border-purple-600"
              }`}>
              {t.label}
            </button>
          ))}
          <span className="ml-2 text-xs font-mono text-slate-300 self-center">{funDescriptions[funSub]}</span>
        </div>
      )}

      {/* Canvas */}
      <SceneCard title={
        model==="physical"?"live · nodes, switches, routers — real hardware topology":
        model==="architectural"?"live · 3-tier architecture — presentation → logic → data":
        `live · fundamental · ${funSub} model`
      }>
        {model==="physical"      && <PhysicalModelCanvas/>}
        {model==="architectural" && <ArchitecturalModelCanvas/>}
        {model==="fundamental"   && <FundamentalModelCanvas submodel={funSub}/>}
      </SceneCard>

      {/* Comparison grid */}
      <div className="grid grid-cols-3 gap-3 text-xs font-mono">
        {[
          {color:"#22d3ee",label:"Physical",
           body:"Hardware nodes + network links. Shows where things physically are. Answers: what machines exist and how are they wired?"},
          {color:"#a855f7",label:"Architectural",
           body:"Software structure: tiers, services, processes. Answers: how is the software organised and what role does each piece play?"},
          {color:"#f59e0b",label:"Fundamental",
           body:"Universal concerns: interaction (messaging), failure (crash/byzantine), security (auth/encryption). Applies to any architecture."},
        ].map(x=>(
          <div key={x.label} className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="font-bold mb-1.5" style={{color:x.color}}>{x.label}</div>
            <div className="text-slate-200 leading-relaxed">{x.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HOW IT WORKS — HTTP REQUEST JOURNEY CANVAS
// 4-phase step-by-step cinematic animation:
//   Step 1: Client sends HTTP/HTTPS request
//   Step 2: Request traverses network gateway
//   Step 3: Load balancer distributes to best server (round-robin)
//   Step 4: App server processes & responds
// ═══════════════════════════════════════════════════════════
function HowItWorksCanvas() {
  const W=700, H=380;

  const draw = useCallback((ctx,dt,s,w,h)=>{
    if(!s.init){
      Object.assign(s,{
        init:true, t:0, phase:0, phaseT:0,
        ball:null, returnBall:null,
        particles:[], sparks:[],
        lbAngle:0, rrIdx:0,
        responseAlpha:0,
      });
    }
    s.t+=dt; s.phaseT+=dt; s.particles=particles_tick(s.particles,dt);
    s.lbAngle+=dt*0.001;

    // ── layout ──────────────────────────────────────────────
    const CLIENT  = {x:58,  y:h/2, label:"User Agent",  sublabel:"Browser / App",  color:"#22d3ee", icon:"user"};
    const GATEWAY = {x:205, y:h/2, label:"Gateway",     sublabel:"DNS · TLS · CDN", color:"#f59e0b", icon:"cloud"};
    const LB      = {x:360, y:h/2, label:"Load Balancer",sublabel:"Round-Robin",   color:"#f472b6", icon:"database"};
    const SERVERS = [
      {x:530, y:105, label:"App Server 1", color:"#a855f7", icon:"server", active:false},
      {x:530, y:190, label:"App Server 2", color:"#a855f7", icon:"server", active:false},
      {x:530, y:275, label:"App Server 3", color:"#a855f7", icon:"server", active:false},
    ];
    const DB      = {x:645, y:190, label:"Database",    sublabel:"PostgreSQL",      color:"#10b981", icon:"database"};
    const nodes   = [CLIENT, GATEWAY, LB, ...SERVERS, DB];

    // Phase auto-advance
    const phaseDur = [0, 2200, 2200, 2800, 3000, 2000];
    if(s.phase < 5 && s.phaseT > phaseDur[s.phase]){
      s.phaseT=0; s.phase++;
      if(s.phase===1){ // client fires request ball
        s.ball={prog:0, from:CLIENT, to:GATEWAY, color:"#22d3ee", trail:[], label:"HTTP GET"};
      }
      if(s.phase===2){ // gateway → LB
        s.ball={prog:0, from:GATEWAY, to:LB, color:"#f59e0b", trail:[], label:"routed"};
        particles_spawn(s.particles, GATEWAY.x, GATEWAY.y, "#f59e0b", 8);
      }
      if(s.phase===3){ // LB → chosen server (round-robin)
        const chosen = s.rrIdx % 3;
        s.rrIdx++;
        SERVERS.forEach((sv,i)=>sv.active = i===chosen);
        s.ball={prog:0, from:LB, to:SERVERS[chosen], color:"#f472b6", trail:[], label:"RR→ S"+(chosen+1), chosen};
        particles_spawn(s.particles, LB.x, LB.y, "#f472b6", 8);
      }
      if(s.phase===4){ // server processes → queries DB
        const srv = SERVERS.find(sv=>sv.active)||SERVERS[0];
        s.ball={prog:0, from:srv, to:DB, color:"#10b981", trail:[], label:"SQL query"};
        particles_spawn(s.particles, srv.x, srv.y, "#a855f7", 10);
      }
      if(s.phase===5){ // response travels back client
        particles_spawn(s.particles, DB.x, DB.y, "#10b981", 10);
        const srv = SERVERS.find(sv=>sv.active)||SERVERS[0];
        s.returnBall={prog:0, waypoints:[
          {x:DB.x,y:DB.y},{x:srv.x,y:srv.y},{x:LB.x,y:LB.y},{x:GATEWAY.x,y:GATEWAY.y},{x:CLIENT.x,y:CLIENT.y}
        ], color:"#22d3ee", trail:[], label:"200 OK"};
        s.ball=null;
      }
    }
    // loop
    if(s.phase===5 && s.phaseT > phaseDur[5]){
      s.phase=0; s.phaseT=0;
      s.ball=null; s.returnBall=null; s.responseAlpha=0;
      SERVERS.forEach(sv=>sv.active=false);
    }

    // advance balls
    if(s.ball) s.ball.prog = clamp(s.ball.prog + dt/1100);
    if(s.returnBall){
      s.returnBall.prog = clamp(s.returnBall.prog + dt/1400);
      s.responseAlpha = Math.min(1, s.responseAlpha + dt/400);
    }

    // ── DRAW ────────────────────────────────────────────────
    bgGrid(ctx, w, h, "rgba(34,211,238,0.04)");

    // phase step indicator strip at top
    const steps=["① Client Request","② Network Traversal","③ Load Balancing","④ Core Processing","⑤ Response"];
    const stepColors=["#22d3ee","#f59e0b","#f472b6","#a855f7","#10b981"];
    steps.forEach((lbl,i)=>{
      const active = s.phase === i+1;
      const done   = s.phase > i+1;
      const bx = 18 + i*(w-20)/5, bw=(w-36)/5-4;
      ctx.beginPath(); ctx.roundRect(bx,8,bw,26,5);
      ctx.fillStyle = active ? ca(stepColors[i],0.25) : done ? ca(stepColors[i],0.12) : "rgba(15,23,42,0.8)";
      ctx.fill();
      ctx.strokeStyle = active ? stepColors[i] : done ? ca(stepColors[i],0.4) : "rgba(100,116,139,0.3)";
      ctx.lineWidth = active ? 1.8 : 1;
      if(active){ctx.shadowBlur=8;ctx.shadowColor=stepColors[i];}
      ctx.stroke(); ctx.shadowBlur=0;
      ctx.font = `${active?"bold ":""}9px 'JetBrains Mono',monospace`;
      ctx.fillStyle = active ? stepColors[i] : done ? ca(stepColors[i],0.7) : "#64748b";
      ctx.textAlign="center";
      ctx.fillText(lbl, bx+bw/2, 25);
    });

    // connection backbone lines
    const connPairs = [
      [CLIENT,GATEWAY,"#f59e0b"],
      [GATEWAY,LB,"#f472b6"],
      [LB,SERVERS[0],"#a855f7"],
      [LB,SERVERS[1],"#a855f7"],
      [LB,SERVERS[2],"#a855f7"],
      [SERVERS[0],DB,"#10b981"],
      [SERVERS[1],DB,"#10b981"],
      [SERVERS[2],DB,"#10b981"],
    ];
    connPairs.forEach(([a,b,col])=>{
      dashed(ctx,a.x+22,a.y,b.x-22,b.y, ca(col,0.18),[5,5],1.2);
    });

    // draw nodes — highlight active server
    SERVERS.forEach(sv=>{
      const pulse = sv.active ? (Math.sin(s.t/300)+1)/2*0.6 : 0;
      node(ctx,sv.x,sv.y,42, sv.active?"#22d3ee":"#a855f7", sv.label, sv.icon, pulse);
      if(sv.active && s.phase>=3){
        ctx.font="8px 'JetBrains Mono',monospace"; ctx.textAlign="center";
        ctx.fillStyle="#67e8f9"; ctx.fillText("PROCESSING",sv.x,sv.y+34);
      }
    });
    node(ctx,CLIENT.x,CLIENT.y,44,CLIENT.color,CLIENT.label,CLIENT.icon,0);
    // sublabels
    [CLIENT,GATEWAY,LB,DB].forEach(n=>{
      if(n.sublabel){
        ctx.font="8px 'JetBrains Mono',monospace"; ctx.textAlign="center";
        ctx.fillStyle=ca(n.color,0.7); ctx.fillText(n.sublabel,n.x,n.y+34);
      }
    });

    // LB spin ring
    if(s.phase>=2){
      for(let i=0;i<6;i++){
        const a=s.lbAngle+i*Math.PI/3;
        const rx=LB.x+Math.cos(a)*28, ry=LB.y+Math.sin(a)*28;
        glowBall(ctx,rx,ry,2.5,"#f472b6",0.4+Math.sin(a+s.t/400)*0.3);
      }
    }
    node(ctx,GATEWAY.x,GATEWAY.y,44,GATEWAY.color,GATEWAY.label,GATEWAY.icon,s.phase===1?(Math.sin(s.t/300)+1)/2*0.5:0);
    node(ctx,LB.x,LB.y,44,LB.color,LB.label,LB.icon,s.phase===2?(Math.sin(s.t/300)+1)/2*0.5:0);
    node(ctx,DB.x,DB.y,44,DB.color,DB.label,DB.icon,s.phase===4?(Math.sin(s.t/250)+1)/2*0.5:0);
    if(DB.sublabel){
      ctx.font="8px 'JetBrains Mono',monospace"; ctx.textAlign="center";
      ctx.fillStyle=ca(DB.color,0.7); ctx.fillText(DB.sublabel,DB.x,DB.y+34);
    }

    // draw forward ball
    if(s.ball && s.ball.prog<1){
      const p=ease.outCubic(s.ball.prog);
      const bx=lerp(s.ball.from.x+22, s.ball.to.x-22, p);
      const by=lerp(s.ball.from.y, s.ball.to.y, p);
      addTrail(s.ball,bx,by,22); trail(ctx,s.ball.trail,s.ball.color);
      glowBall(ctx,bx,by,6,s.ball.color);
      if(s.ball.label){
        ctx.font="bold 9px 'JetBrains Mono',monospace"; ctx.textAlign="center";
        ctx.fillStyle=s.ball.color;
        ctx.shadowBlur=6; ctx.shadowColor=s.ball.color;
        ctx.fillText(s.ball.label, bx, by-12); ctx.shadowBlur=0;
      }
    }

    // draw return ball (multi-waypoint)
    if(s.returnBall && s.returnBall.prog<1){
      const wps=s.returnBall.waypoints;
      const total=wps.length-1;
      const seg=s.returnBall.prog*total;
      const segI=Math.min(Math.floor(seg),total-1);
      const segP=seg-segI;
      const bx=lerp(wps[segI].x,wps[segI+1].x,ease.inOutCubic(segP));
      const by=lerp(wps[segI].y,wps[segI+1].y,ease.inOutCubic(segP));
      addTrail(s.returnBall,bx,by,28); trail(ctx,s.returnBall.trail,"#22d3ee");
      glowBall(ctx,bx,by,7,"#22d3ee");
      ctx.font="bold 9px 'JetBrains Mono',monospace"; ctx.textAlign="center";
      ctx.fillStyle="#67e8f9"; ctx.shadowBlur=6; ctx.shadowColor="#22d3ee";
      ctx.fillText("200 OK ✓",bx,by-13); ctx.shadowBlur=0;
    }

    // response success banner at client
    if(s.returnBall && s.returnBall.prog>0.85){
      const a=s.responseAlpha*((s.returnBall.prog-0.85)/0.15);
      ctx.font="bold 10px 'JetBrains Mono',monospace"; ctx.textAlign="center";
      ctx.fillStyle=ca("#22d3ee",a);
      ctx.shadowBlur=10; ctx.shadowColor="#22d3ee";
      ctx.fillText("✓ Response Received!",CLIENT.x,CLIENT.y-50);
      ctx.shadowBlur=0;
    }

    particles_draw(ctx,s.particles);

    // phase description box
    const phaseDescs=[
      "",
      "Client generates HTTP GET · TLS handshake begins",
      "DNS resolves · CDN checks cache · request forwarded",
      "LB applies Round-Robin · picks Server "+(1+(s.rrIdx%3||0))+" · balances load",
      "App server executes logic · queries database",
      "DB returns data → server → LB → gateway → client",
    ];
    if(s.phase>0 && s.phase<=5){
      const desc=phaseDescs[s.phase];
      ctx.font="10px 'JetBrains Mono',monospace"; ctx.textAlign="center";
      ctx.fillStyle=ca(stepColors[s.phase-1],0.9);
      ctx.shadowBlur=4; ctx.shadowColor=stepColors[s.phase-1];
      ctx.fillText(desc, w/2, h-14); ctx.shadowBlur=0;
    }
  },[]);

  return <CanvasScene width={W} height={H} draw={draw} sceneKey="howitworks"/>;
}

// ═══════════════════════════════════════════════════════════
// HOW IT WORKS SECTION
// ═══════════════════════════════════════════════════════════
function HowItWorksSection() {
  const steps = [
    {
      num:"①", color:"#22d3ee",
      title:"Client Initiation",
      body:"The User Agent (browser or app) generates and dispatches an HTTP/HTTPS request. TLS negotiation encrypts the channel before any data is exchanged.",
    },
    {
      num:"②", color:"#f59e0b",
      title:"Network Traversal",
      body:"The request propagates through network infrastructure — DNS resolution, CDN edge nodes, and the API gateway which validates, rate-limits, and forwards the request.",
    },
    {
      num:"③", color:"#f472b6",
      title:"Traffic Distribution",
      body:"A Load Balancer intercepts incoming traffic and routes the request to an optimal backend node. Round-Robin cycles evenly; Least-Connections targets the least busy server.",
    },
    {
      num:"④", color:"#a855f7",
      title:"Core Processing",
      body:"The designated application server accepts the request, executes business logic, queries databases or caches, and assembles a response payload.",
    },
    {
      num:"⑤", color:"#10b981",
      title:"Response Path",
      body:"The assembled response travels back through the same chain — server → load balancer → gateway → client — with the final HTTP status code (200 OK) and body.",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
        <h2 className="text-cyan-400 font-mono text-lg mb-3">How Distributed Systems Work</h2>
        <p className="text-white text-sm leading-relaxed">
          Every HTTP request you make traverses a chain of specialised components — each one a node in the
          distributed system. Watch the animation below follow a single request from your browser all the way
          to the database and back, automatically cycling through each phase.
        </p>
      </div>

      <SceneCard title="live · HTTP request journey · auto-cycling through all 5 phases">
        <HowItWorksCanvas/>
      </SceneCard>

      <div className="space-y-3">
        {steps.map(s=>(
          <div key={s.num} className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex gap-4 items-start">
            <span className="text-2xl font-bold shrink-0 mt-0.5" style={{color:s.color, textShadow:`0 0 12px ${s.color}88`}}>
              {s.num}
            </span>
            <div>
              <div className="font-bold text-sm mb-1" style={{color:s.color}}>{s.title}</div>
              <p className="text-white text-sm leading-relaxed">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// APP SHELL
// ═══════════════════════════════════════════════════════════
const NAV=[
  {id:"intro",    label:"01 Introduction",   icon:"🌐"},
  {id:"howitworks",label:"02 How It Works",  icon:"⚡"},
  {id:"types",    label:"03 Types",           icon:"🖥"},
  {id:"models",   label:"04 Arch Models",     icon:"⬡"},
  {id:"sysmodels",label:"05 System Models",   icon:"⚛"},
  {id:"hw",       label:"06 HW & SW",         icon:"⚙"},
  {id:"fallacies",label:"07 Design Issues",   icon:"⚠"},
];

export default function App(){
  const [active,setActive]=useState("intro");
  const [dark,setDark]=useState(true);

  const pages={
    intro:      {title:"Introduction & Definition",           body:<IntroSection/>},
    howitworks: {title:"How Distributed Systems Work",        body:<HowItWorksSection/>},
    types:      {title:"Types of Distributed Systems",        body:<TypesSection/>},
    models:     {title:"Distributed System Models",           body:<ModelsSection/>},
    sysmodels:  {title:"System Models: Physical · Architectural · Fundamental", body:<SystemModelsSection/>},
    hw:         {title:"Hardware & Software Concepts",        body:<HardwareSection/>},
    fallacies:  {title:"Design Issues & Fallacies",           body:<FallaciesSection/>},
  };

  // ── theme tokens ────────────────────────────────────────
  const T = dark ? {
    bg:        "#050f1f",
    sidebar:   "#040e1e",
    border:    "#334155",
    cardBg:    "#0f172a",
    cardBorder:"#334155",
    text:      "#f1f5f9",
    textMuted: "#94a3b8",
    navActive: "bg-cyan-500/15 border border-cyan-500/40 text-cyan-300",
    navIdle:   "border border-transparent text-slate-300 hover:text-white hover:bg-slate-800/60",
    scrollTrack:"#020b18",
    scrollThumb:"#1e293b",
    toggleBg:  "#1e293b",
    toggleIcon:"🌙",
    toggleLabel:"Dark",
  } : {
    bg:        "#f0f4f8",
    sidebar:   "#ffffff",
    border:    "#cbd5e1",
    cardBg:    "#ffffff",
    cardBorder:"#e2e8f0",
    text:      "#0f172a",
    textMuted: "#475569",
    navActive: "bg-cyan-500/20 border border-cyan-600 text-cyan-700",
    navIdle:   "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100",
    scrollTrack:"#e2e8f0",
    scrollThumb:"#94a3b8",
    toggleBg:  "#e2e8f0",
    toggleIcon:"☀️",
    toggleLabel:"Light",
  };

  return (
    <div style={{
      minHeight:"100vh", background:T.bg, color:T.text,
      fontFamily:"'JetBrains Mono','Fira Code',monospace",
      display:"flex",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Space+Grotesk:wght@400;600;700&display=swap');
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:${T.scrollTrack};}
        ::-webkit-scrollbar-thumb{background:${T.scrollThumb};border-radius:2px;}
        *{box-sizing:border-box;}
      `}</style>

      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside style={{
        width:"256px", minHeight:"100vh", background:T.sidebar,
        borderRight:`1px solid ${T.border}`,
        display:"flex", flexDirection:"column", flexShrink:0,
      }}>
        {/* Header */}
        <div style={{padding:"24px", borderBottom:`1px solid ${T.border}`}}>
          <div style={{fontSize:"10px", color:T.textMuted, fontFamily:"monospace",
            marginBottom:"4px", letterSpacing:"0.1em", textTransform:"uppercase"}}>
            Interactive Textbook
          </div>
          <h1 style={{color:"#22d3ee", fontWeight:700, fontSize:"18px",
            lineHeight:1.3, fontFamily:"'Space Grotesk',sans-serif", margin:0}}>
            Distributed<br/>Systems
          </h1>
          <div style={{marginTop:"12px", display:"flex", gap:"6px"}}>
            {["#22d3ee","#a855f7","#10b981"].map((c,i)=>(
              <span key={c} className="animate-pulse"
                style={{width:"6px",height:"6px",borderRadius:"50%",background:c,
                  display:"inline-block",animationDelay:`${i*0.35}s`}}/>
            ))}
          </div>
        </div>

        {/* Nav */}
        <nav style={{flex:1, padding:"12px", display:"flex", flexDirection:"column", gap:"2px"}}>
          {NAV.map(s=>(
            <button key={s.id} onClick={()=>setActive(s.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 flex items-center gap-3 text-sm ${
                active===s.id ? T.navActive : T.navIdle
              }`}
              style={{background:"transparent", cursor:"pointer"}}>
              <span style={{fontSize:"16px", width:"20px", flexShrink:0}}>{s.icon}</span>
              <span>{s.label}</span>
              {active===s.id && <span style={{marginLeft:"auto", color:"#22d3ee", fontSize:"11px"}}>▶</span>}
            </button>
          ))}
        </nav>

        {/* Footer: toggle + version */}
        <div style={{padding:"16px", borderTop:`1px solid ${T.border}`,
          display:"flex", flexDirection:"column", gap:"10px"}}>

          {/* ── THEME TOGGLE BUTTON ── */}
          <button
            onClick={()=>setDark(d=>!d)}
            style={{
              display:"flex", alignItems:"center", gap:"8px",
              padding:"8px 12px", borderRadius:"8px", cursor:"pointer", border:"none",
              background: dark ? "#1e293b" : "#e2e8f0",
              color: dark ? "#f1f5f9" : "#1e293b",
              fontFamily:"'JetBrains Mono',monospace", fontSize:"11px",
              fontWeight:600, width:"100%", transition:"all 0.2s",
            }}
          >
            <span style={{fontSize:"15px"}}>{T.toggleIcon}</span>
            <span>{T.toggleLabel} Mode</span>
            {/* pill track */}
            <span style={{
              marginLeft:"auto", width:"34px", height:"18px", borderRadius:"9px",
              background: dark ? "#22d3ee40" : "#64748b40",
              border: dark ? "1px solid #22d3ee80" : "1px solid #94a3b8",
              position:"relative", display:"inline-block", flexShrink:0,
            }}>
              <span style={{
                position:"absolute", top:"2px",
                left: dark ? "18px" : "2px",
                width:"12px", height:"12px", borderRadius:"50%",
                background: dark ? "#22d3ee" : "#64748b",
                transition:"left 0.2s",
              }}/>
            </span>
          </button>

          <div style={{fontSize:"10px", color:T.textMuted, fontFamily:"monospace"}}>
            canvas · 60fps · retina
          </div>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────── */}
      <main style={{flex:1, overflowY:"auto"}}>
        <div style={{maxWidth:"768px", margin:"0 auto", padding:"32px"}}>
          <div style={{marginBottom:"28px"}}>
            <div style={{fontSize:"10px", color:T.textMuted, fontFamily:"monospace",
              marginBottom:"4px", textTransform:"uppercase", letterSpacing:"0.1em"}}>
              Chapter {NAV.findIndex(s=>s.id===active)+1} / {NAV.length}
            </div>
            <h2 style={{fontSize:"24px", fontWeight:700, color:T.text, margin:0,
              fontFamily:"'Space Grotesk',sans-serif"}}>
              {pages[active].title}
            </h2>
            <div style={{marginTop:"8px", height:"1px",
              background:"linear-gradient(to right, rgba(34,211,238,0.6), rgba(168,85,247,0.3), transparent)"}}/>
          </div>

          {/* inject light-mode overrides via a style tag so child components adapt */}
          {!dark && (
            <style>{`
              .bg-slate-900 { background: #ffffff !important; }
              .bg-slate-800\\/60 { background: #f8fafc !important; }
              .border-slate-700 { border-color: #cbd5e1 !important; }
              .border-slate-800 { border-color: #e2e8f0 !important; }
              .text-slate-200 { color: #1e293b !important; }
              .text-slate-300 { color: #334155 !important; }
              .text-slate-400 { color: #475569 !important; }
              .text-white { color: #0f172a !important; }
              .bg-slate-800\\/80 { background: #f1f5f9 !important; }
              .border-slate-700 { border-color: #cbd5e1 !important; }
              .hover\\:border-slate-500:hover { border-color: #94a3b8 !important; }
              .hover\\:text-white:hover { color: #0f172a !important; }
            `}</style>
          )}

          <div key={active}>{pages[active].body}</div>
        </div>
      </main>
    </div>
  );
}
