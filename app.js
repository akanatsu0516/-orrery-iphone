const placeRP=[125,100,75,55,45,40,20,20,10,10,5,5,5,0,0,0,0,0,0,0];
const combat=[22,20,18,16,16,14,14,14,12,12,8,8,8,6,6,6,6,6,6,6];
const entry={rookie:0,bronze:10,silver:20,gold:38,platinum:48,diamond:65,master:90,pred:90};
const names={rookie:"ルーキー",bronze:"ブロンズ",silver:"シルバー",gold:"ゴールド",platinum:"プラチナ",diamond:"ダイヤ",master:"マスター",pred:"プレデター"};
const $=id=>document.getElementById(id);
for(let i=1;i<=20;i++) $("placement").insertAdjacentHTML("beforeend",`<option value="${i}">${i}位</option>`);
function calc(save=true){
 const p=+$("placement").value-1,k=Math.max(0,+$("kills").value),a=Math.max(0,+$("assists").value),part=Math.max(0,+$("parts").value);
 const e=entry[$("rank").value], base=combat[p];
 const elim=k+a;
 const full=Math.min(elim,6), half=Math.max(0,elim-6);
 let combatRP=base*full+base*.5*half+Math.floor(base*.5*part);
 let bonus=+$("streak").value;
 if($("challenger").checked && k>0) bonus+=Math.round(base*.15);
 const total=Math.round(placeRP[p]+combatRP+bonus-e);
 $("placeRP").textContent=(placeRP[p]>=0?"+":"")+placeRP[p];
 $("combatRP").textContent="+"+Math.round(combatRP);
 $("bonusRP").textContent="+"+bonus;
 $("entryRP").textContent="-"+e;
 $("total").textContent=(total>=0?"+":"")+total+" RP";
 $("verdict").textContent=total>0?"📈 盛れてる！":total<0?"📉 溶けた！":"⚖️ プラマイゼロ";
 if(save){let h=JSON.parse(localStorage.apexRP||"[]");h.unshift({p:p+1,k,a,part,total});h=h.slice(0,30);localStorage.apexRP=JSON.stringify(h);renderHistory(h)}
}
function renderHistory(h){
 $("games").textContent=h.length;
 const sum=h.reduce((x,v)=>x+v.total,0);$("sum").textContent=(sum>=0?"+":"")+sum;
 $("avg").textContent=h.length?(sum/h.length).toFixed(1):"0";
 $("best").textContent=h.length?Math.max(...h.map(v=>v.total)):"0";
 $("log").innerHTML=h.length?h.map((v,i)=>`<p><b>#${h.length-i}</b>　${v.p}位 / ${v.k}K ${v.a}A ${v.part}P　<strong>${v.total>=0?"+":""}${v.total} RP</strong></p>`).join(""):"<p>まだ試合データはありません。</p>";
}
$("rank").addEventListener("change",()=>{$("entryRP").textContent="-"+entry[$("rank").value]});
$("calc").onclick=()=>calc(true);
$("reset").onclick=()=>{localStorage.removeItem("apexRP");renderHistory([])};
$("share").onclick=async()=>{const url=location.href;if(navigator.share) await navigator.share({title:"APEX S30 RP Calculator",url});else{await navigator.clipboard.writeText(url);alert("URLをコピーしたよ！")}};
let h=JSON.parse(localStorage.apexRP||"[]");renderHistory(h);
$("table").innerHTML=`<table><thead><tr><th>順位</th><th>順位RP</th><th>撃破系 / 1</th></tr></thead><tbody>${placeRP.map((v,i)=>`<tr><td>${i+1}位</td><td>+${v}</td><td>+${combat[i]} RP</td></tr>`).join("")}</tbody></table>`;
