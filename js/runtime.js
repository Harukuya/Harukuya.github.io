var now=new Date;function createtime(){now.setTime(now.getTime()+1e3);
var e=new Date("04/10/2023 00:00:00"),t=Math.trunc(234e8+(now-e)/1e3*17),a=(t/1496e5).toFixed(6),o=new Date("04/10/2023 00:00:00"),n=(now-o)/1e3/60/60/24,r=Math.floor(n),i=(now-o)/1e3/60/60-24*r,s=Math.floor(i);
1==String(s).length&&(s="0"+s);var d=(now-o)/1e3/60-1440*r-60*s,l=Math.floor(d);1==String(l).length&&(l="0"+l);
var g=(now-o)/1e3-86400*r-3600*s-60*l,b=Math.round(g);1==String(b).length&&(b="0"+b);let c="";
c=s<18&&s>=9?
`<img class='boardsign' src='' title=''><br>  <div style="font-size:13px;font-weight:bold">本店已开张 ${r} 天 ${s} 小时 ${l} 分 ${b} 秒 <i id="heartbeat" class='fas fa-heartbeat'></i> <br> 旅行者 1 号当前距离地球 ${t} 千米，约为 ${a} 个天文单位 🚀</div> </b> <br> <b> <font size = 2px style="white-space: pre-wrap;">“  𝐼 𝑑𝑟𝑒𝑎𝑚𝑒𝑑 𝑜𝑓 𝑎 𝑠𝑐𝑜𝑟𝑐ℎ𝑒𝑑 𝑒𝑎𝑟𝑡ℎ.    𝐴 𝑛𝑒𝑤 𝑠ℎ𝑜𝑜𝑡 𝑠𝑝𝑟𝑜𝑢𝑡𝑒𝑑 𝑓𝑟𝑜𝑚 𝑡ℎ𝑒 𝑒𝑎𝑟𝑡ℎ.    𝐼𝑡 𝑏𝑙𝑜𝑜𝑚𝑒𝑑 𝑖𝑛 𝑡ℎ𝑒 𝑚𝑜𝑟𝑛𝑖𝑛𝑔 𝑠𝑢𝑛, 𝑎𝑛𝑑 𝑤ℎ𝑖𝑠𝑝𝑒𝑟𝑒𝑑 𝑡𝑜 𝑚𝑒...  ”🎇<br>“  𝐿𝑖𝑘𝑒 𝑓𝑖𝑟𝑒𝑓𝑙𝑖𝑒𝑠 𝑡𝑜 𝑎 𝑓𝑙𝑎𝑚𝑒... 𝑙𝑖𝑓𝑒 𝑏𝑒𝑔𝑒𝑡𝑠 𝑑𝑒𝑎𝑡ℎ.  ”🌠</font></b> `:
` <img class='boardsign' src='' title=''><br> <div style="font-size:13px;font-weight:bold">本店已开张 ${r} 天 ${s} 小时 ${l} 分 ${b} 秒 <i id="heartbeat" class='fas fa-heartbeat'></i> <br> 旅行者 1 号当前距离地球 ${t} 千米，约为 ${a} 个天文单位 🚀</div> </b> <br> <b> <font size = 2px style="white-space: pre-wrap;">“  𝐼 𝑑𝑟𝑒𝑎𝑚𝑒𝑑 𝑜𝑓 𝑎 𝑠𝑐𝑜𝑟𝑐ℎ𝑒𝑑 𝑒𝑎𝑟𝑡ℎ.    𝐴 𝑛𝑒𝑤 𝑠ℎ𝑜𝑜𝑡 𝑠𝑝𝑟𝑜𝑢𝑡𝑒𝑑 𝑓𝑟𝑜𝑚 𝑡ℎ𝑒 𝑒𝑎𝑟𝑡ℎ.    𝐼𝑡 𝑏𝑙𝑜𝑜𝑚𝑒𝑑 𝑖𝑛 𝑡ℎ𝑒 𝑚𝑜𝑟𝑛𝑖𝑛𝑔 𝑠𝑢𝑛, 𝑎𝑛𝑑 𝑤ℎ𝑖𝑠𝑝𝑒𝑟𝑒𝑑 𝑡𝑜 𝑚𝑒...  ”🎇<br>“  𝐿𝑖𝑘𝑒 𝑓𝑖𝑟𝑒𝑓𝑙𝑖𝑒𝑠 𝑡𝑜 𝑎 𝑓𝑙𝑎𝑚𝑒... 𝑙𝑖𝑓𝑒 𝑏𝑒𝑔𝑒𝑡𝑠 𝑑𝑒𝑎𝑡ℎ.  ”🌠</font></b> `,document.getElementById("workboard")&&(document.getElementById("workboard").innerHTML=c)}setInterval((()=>{createtime()}),1e3);



