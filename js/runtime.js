var now=new Date;function createtime(){now.setTime(now.getTime()+1e3);
var e=new Date("04/10/2023 00:00:00"),t=Math.trunc(234e8+(now-e)/1e3*17),a=(t/1496e5).toFixed(6),o=new Date("04/10/2023 00:00:00"),n=(now-o)/1e3/60/60/24,r=Math.floor(n),i=(now-o)/1e3/60/60-24*r,s=Math.floor(i);
1==String(s).length&&(s="0"+s);var d=(now-o)/1e3/60-1440*r-60*s,l=Math.floor(d);1==String(l).length&&(l="0"+l);
var g=(now-o)/1e3-86400*r-3600*s-60*l,b=Math.round(g);1==String(b).length&&(b="0"+b);let c="";
c=s<18&&s>=9?
`<img class='boardsign' src='' title=''><br>  <div style="font-size:13px;font-weight:bold">本店已开张 ${r} 天 ${s} 小时 ${l} 分 ${b} 秒 <i id="heartbeat" class='fas fa-heartbeat'></i> <br> 旅行者 1 号当前距离地球 ${t} 千米，约为 ${a} 个天文单位 🚀</div> </b> <br> <b> <font size = 2px style="white-space: pre-wrap;">“  𝑰 𝒅𝒓𝒆𝒂𝒎𝒆𝒅 𝒐𝒇 𝒂 𝒔𝒄𝒐𝒓𝒄𝒉𝒆𝒅 𝒆𝒂𝒓𝒕𝒉.    𝑨 𝒏𝒆𝒘 𝒔𝒉𝒐𝒐𝒕 𝒔𝒑𝒓𝒐𝒖𝒕𝒆𝒅 𝒇𝒓𝒐𝒎 𝒕𝒉𝒆 𝒆𝒂𝒓𝒕𝒉.    𝑰𝒕 𝒃𝒍𝒐𝒐𝒎𝒆𝒅 𝒊𝒏 𝒕𝒉𝒆 𝒎𝒐𝒓𝒏𝒊𝒏𝒈 𝒔𝒖𝒏, 𝒂𝒏𝒅 𝒘𝒉𝒊𝒔𝒑𝒆𝒓𝒆𝒅 𝒕𝒐 𝒎𝒆...     𝑳𝒊𝒌𝒆 𝒇𝒊𝒓𝒆𝒇𝒍𝒊𝒆𝒔 𝒕𝒐 𝒂 𝒇𝒍𝒂𝒎𝒆... 𝒍𝒊𝒇𝒆 𝒃𝒆𝒈𝒆𝒕𝒔 𝒅𝒆𝒂𝒕𝒉.  ”</font></b> `:
` <img class='boardsign' src='' title=''><br> <div style="font-size:13px;font-weight:bold">本店已开张 ${r} 天 ${s} 小时 ${l} 分 ${b} 秒 <i id="heartbeat" class='fas fa-heartbeat'></i> <br> 旅行者 1 号当前距离地球 ${t} 千米，约为 ${a} 个天文单位 🚀</div> </b> <br> <b> <font size = 2px style="white-space: pre-wrap;">“  𝑰 𝒅𝒓𝒆𝒂𝒎𝒆𝒅 𝒐𝒇 𝒂 𝒔𝒄𝒐𝒓𝒄𝒉𝒆𝒅 𝒆𝒂𝒓𝒕𝒉.    𝑨 𝒏𝒆𝒘 𝒔𝒉𝒐𝒐𝒕 𝒔𝒑𝒓𝒐𝒖𝒕𝒆𝒅 𝒇𝒓𝒐𝒎 𝒕𝒉𝒆 𝒆𝒂𝒓𝒕𝒉.    𝑰𝒕 𝒃𝒍𝒐𝒐𝒎𝒆𝒅 𝒊𝒏 𝒕𝒉𝒆 𝒎𝒐𝒓𝒏𝒊𝒏𝒈 𝒔𝒖𝒏, 𝒂𝒏𝒅 𝒘𝒉𝒊𝒔𝒑𝒆𝒓𝒆𝒅 𝒕𝒐 𝒎𝒆...     𝑳𝒊𝒌𝒆 𝒇𝒊𝒓𝒆𝒇𝒍𝒊𝒆𝒔 𝒕𝒐 𝒂 𝒇𝒍𝒂𝒎𝒆... 𝒍𝒊𝒇𝒆 𝒃𝒆𝒈𝒆𝒕𝒔 𝒅𝒆𝒂𝒕𝒉.  ”</font></b> `,document.getElementById("workboard")&&(document.getElementById("workboard").innerHTML=c)}setInterval((()=>{createtime()}),1e3);



