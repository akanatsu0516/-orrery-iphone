const $=s=>document.querySelector(s);
const timeEl=$("#time"), dateEl=$("#date"), dial=$("#dial"), statusEl=$("#status");
function tick(){
 const d=new Date(), h=String(d.getHours()).padStart(2,"0"), m=String(d.getMinutes()).padStart(2,"0"), s=String(d.getSeconds()).padStart(2,"0");
 timeEl.innerHTML=`${h}:${m}<span>${s}</span>`;
 dateEl.textContent=d.toLocaleDateString("en-US",{month:"short",day:"2-digit",year:"numeric"}).toUpperCase();
}
setInterval(tick,250);tick();

async function weather(){
 try{
  const r=await fetch("https://api.open-meteo.com/v1/forecast?latitude=33.5902&longitude=130.4017&current=temperature_2m,weather_code&timezone=Asia%2FTokyo");
  const j=await r.json(); const t=Math.round(j.current.temperature_2m);
  $("#temp").textContent=`${t}°`;
  const code=j.current.weather_code;
  $("#weatherIcon").textContent=code===0?"☼":code<60?"☁":"◌";
  $("#weatherText").textContent=code===0?"CLEAR":code<60?"CLOUDY":"PRECIP";
 }catch(e){$("#weatherText").textContent="OFFLINE"}
}
weather();

if(navigator.getBattery){
 navigator.getBattery().then(b=>{
  const update=()=>{$("#battery").textContent=Math.round(b.level*100)+"%";$("#batteryBar").style.width=(b.level*100)+"%";};
  update(); b.addEventListener("levelchange",update);
 });
} else {
 $("#battery").textContent="iOS";
 $("#batteryBar").style.width="42%";
}
$("#network").textContent=navigator.onLine?"ONLINE":"OFFLINE";
addEventListener("online",()=>$("#network").textContent="ONLINE");
addEventListener("offline",()=>$("#network").textContent="OFFLINE");

const canvas=$("#viz"),ctx=canvas.getContext("2d");let audioCtx,analyser,data,stream,raf;
function resize(){canvas.width=canvas.clientWidth*devicePixelRatio;canvas.height=canvas.clientHeight*devicePixelRatio}
addEventListener("resize",resize);resize();
function draw(){
 const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 if(analyser){
  analyser.getByteFrequencyData(data);
  const sum=data.reduce((a,b)=>a+b,0)/data.length;
  const energy=Math.min(1,sum/72);
  dial.style.transform=`scale(${1+energy*.045}) rotate(${Math.sin(Date.now()/900)*energy*.8}deg)`;
  document.body.classList.toggle("reactor-hot",energy>.18);
  statusEl.textContent=sum>18?"AUDIO ACTIVE":"SYSTEM READY";
  $("#micState").textContent=sum>18?"LISTENING":"LIVE";
  const accent=getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  ctx.beginPath();ctx.strokeStyle=accent;ctx.lineWidth=2*devicePixelRatio;
  for(let i=0;i<data.length;i+=2){
    const x=i/data.length*w;
    const amp=(data[i]/255)*h*.72;
    const y=h/2-Math.max(2,amp)*Math.sin(i*.35+Date.now()/180)*.42;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)
  }
  ctx.stroke();
  ctx.beginPath();ctx.strokeStyle="rgba(255,255,255,.22)";ctx.lineWidth=devicePixelRatio;
  ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
} else {
  const t=Date.now()/650;ctx.beginPath();ctx.strokeStyle="rgba(84,221,255,.45)";ctx.lineWidth=1.2*devicePixelRatio;
  for(let x=0;x<w;x+=4){let y=h/2+Math.sin(x/38+t)*4+Math.sin(x/11+t*.7)*1.5;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();
}
 raf=requestAnimationFrame(draw);
}draw();

$("#micBtn").onclick=async()=>{
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;analyser=null;$("#micState").textContent="IDLE";$("#micBtn").innerHTML="<span>◉</span> TAP TO ACTIVATE";return}
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:true});
  audioCtx=new (AudioContext||webkitAudioContext)(); analyser=audioCtx.createAnalyser();analyser.fftSize=256;
  const src=audioCtx.createMediaStreamSource(stream);src.connect(analyser);data=new Uint8Array(analyser.frequencyBinCount);
  $("#micState").textContent="LIVE";$("#micBtn").innerHTML="<span>●</span> STOP AUDIO REACTOR";
 }catch(e){$("#status").textContent="MIC ACCESS DENIED"}
};

document.querySelectorAll(".dock button[data-mode]").forEach(b=>b.onclick=()=>{
 document.body.classList.remove("minimal","ambient"); document.querySelectorAll(".dock button").forEach(x=>x.classList.remove("active"));b.classList.add("active");
 if(b.dataset.mode!=="live")document.body.classList.add(b.dataset.mode);
});
$("#settingsBtn").onclick=()=>$("#settings").showModal();
$("#closeSettings").onclick=()=>$("#settings").close();
document.querySelectorAll(".themes button").forEach(b=>b.onclick=()=>{
 const c=getComputedStyle(b).backgroundColor; document.documentElement.style.setProperty("--accent",c);
});
$("#save").onclick=()=>$("#settings").close();

if("serviceWorker" in navigator) addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
