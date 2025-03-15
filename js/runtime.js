var now=new Date;function createtime(){now.setTime(now.getTime()+1e3);var e=new Date("04/10/2023 00:00:00"),t=Math.trunc(234e8+(now-e)/1e3*17),a=(t/1496e5).toFixed(6),o=new Date("04/10/2023 00:00:00"),n=(now-o)/1e3/60/60/24,r=Math.floor(n),i=(now-o)/1e3/60/60-24*r,s=Math.floor(i);
1==String(s).length&&(s="0"+s);var d=(now-o)/1e3/60-1440*r-60*s,l=Math.floor(d);1==String(l).length&&(l="0"+l);var flye=new Date("2024-02-06T10:00:00"),
flyn=(now-flye)/1e3/60/60/24,
flyr=Math.floor(flyn),
flyi=(now-flye)/1e3/60/60-24*flyr,
flys=Math.floor(flyi),
flyd=(now-flye)/1e3/60-1440*flyr-60*flys,
flyl=Math.floor(flyd),
flyg=(now-flye)/1e3-86400*flyr-3600*flys-60*flyl,
flyb=Math.round(flyg); 
1==String(flyb).length&&(flyb="0"+flyb);
1==String(flys).length&&(flys="0"+flys);
1==String(flyl).length&&(flyl="0"+flyl);
var g=(now-o)/1e3-86400*r-3600*s-60*l,b=Math.round(g);1==String(b).length&&(b="0"+b);let c="";
c=s<18&&s>=9?

` <img class='boardsign' src='' title=''><br> <div style="font-size:13px;font-weight:bold">本店已开张 ${r} 天 ${s} 小时 ${l} 分 ${b} 秒 <i id="heartbeat" class='fas fa-heartbeat'></i><br>与 FireFly 相遇的第 ${flyr} 天 ${flys} 小时 ${flyl} 分 ${flyb} 秒 🌃</div> </b> <br> <b> <font size = 2px style="white-space: pre-wrap;">“ 𝐼 𝑑𝑟𝑒𝑎𝑚𝑒𝑑 𝑜𝑓 𝑎 𝑠𝑐𝑜𝑟𝑐ℎ𝑒𝑑 𝑒𝑎𝑟𝑡ℎ.   𝐴 𝑛𝑒𝑤 𝑠ℎ𝑜𝑜𝑡 𝑠𝑝𝑟𝑜𝑢𝑡𝑒𝑑 𝑓𝑟𝑜𝑚 𝑡ℎ𝑒 𝑒𝑎𝑟𝑡ℎ.   𝐼𝑡 𝑏𝑙𝑜𝑜𝑚𝑒𝑑 𝑖𝑛 𝑡ℎ𝑒 𝑚𝑜𝑟𝑛𝑖𝑛𝑔 𝑠𝑢𝑛, 𝑎𝑛𝑑 𝑤ℎ𝑖𝑠𝑝𝑒𝑟𝑒𝑑 𝑡𝑜 𝑚𝑒... ”🎇<br>“ 𝐿𝑖𝑘𝑒 𝑓𝑖𝑟𝑒𝑓𝑙𝑖𝑒𝑠 𝑡𝑜 𝑎 𝑓𝑙𝑎𝑚𝑒... 𝑙𝑖𝑓𝑒 𝑏𝑒𝑔𝑒𝑡𝑠 𝑑𝑒𝑎𝑡ℎ. ”🌠</font></b> `:
` <img class='boardsign' src='' title=''><br> <div style="font-size:13px;font-weight:bold">本店已开张 ${r} 天 ${s} 小时 ${l} 分 ${b} 秒 <i id="heartbeat" class='fas fa-heartbeat'></i><br>与 FireFly 相遇的第 ${flyr} 天 ${flys} 小时 ${flyl} 分 ${flyb} 秒 🌃</div> </b> <br> <b> <font size = 2px style="white-space: pre-wrap;">“ 𝐼 𝑑𝑟𝑒𝑎𝑚𝑒𝑑 𝑜𝑓 𝑎 𝑠𝑐𝑜𝑟𝑐ℎ𝑒𝑑 𝑒𝑎𝑟𝑡ℎ.   𝐴 𝑛𝑒𝑤 𝑠ℎ𝑜𝑜𝑡 𝑠𝑝𝑟𝑜𝑢𝑡𝑒𝑑 𝑓𝑟𝑜𝑚 𝑡ℎ𝑒 𝑒𝑎𝑟𝑡ℎ.   𝐼𝑡 𝑏𝑙𝑜𝑜𝑚𝑒𝑑 𝑖𝑛 𝑡ℎ𝑒 𝑚𝑜𝑟𝑛𝑖𝑛𝑔 𝑠𝑢𝑛, 𝑎𝑛𝑑 𝑤ℎ𝑖𝑠𝑝𝑒𝑟𝑒𝑑 𝑡𝑜 𝑚𝑒... ”🎇<br>“ 𝐿𝑖𝑘𝑒 𝑓𝑖𝑟𝑒𝑓𝑙𝑖𝑒𝑠 𝑡𝑜 𝑎 𝑓𝑙𝑎𝑚𝑒... 𝑙𝑖𝑓𝑒 𝑏𝑒𝑔𝑒𝑡𝑠 𝑑𝑒𝑎𝑡ℎ. ”🌠</font></b> `,document.getElementById("workboard")&&(document.getElementById("workboard").innerHTML=c)}setInterval((()=>{createtime()}),1e3);


// <br>旅行者 1 号当前距离地球 ${t} 千米，约为 ${a} 个天文单位 🚀



// var now = new Date();

// function createtime() {
//     now.setTime(now.getTime() + 1e3);
    
//     // 原店铺计时开始时间
//     const shopStart = new Date("04/10/2023 00:00:00");
    
//     // 新增的FireFly相遇开始时间 (2024-02-06 10:00:00)
//     const fireflyStart = new Date("2024-02-06T10:00:00"); 

//     // ▂▂▂▂▂▂▂▂ 原有计算逻辑 ▂▂▂▂▂▂▂▂
//     var t = Math.trunc(234e8 + (now - shopStart) / 1e3 * 17),
//         a = (t / 1496e5).toFixed(6),
//         n = (now - shopStart) / 1e3 / 60 / 60 / 24,
//         r = Math.floor(n),
//         i = (now - shopStart) / 1e3 / 60 / 60 - 24 * r,
//         s = Math.floor(i),
//         d = (now - shopStart) / 1e3 / 60 - 1440 * r - 60 * s,
//         l = Math.floor(d),
//         g = (now - shopStart) / 1e3 - 86400 * r - 3600 * s - 60 * l,
//         b = Math.round(g);

//     // ▂▂▂▂▂▂▂▂ 新增FireFly计时计算 ▂▂▂▂▂▂▂▂
//     const fireflyDiff = now - fireflyStart;
//     const fireflyDays = Math.floor(fireflyDiff / 864e5);
//     const fireflyHours = Math.floor((fireflyDiff % 864e5) / 36e5);
//     const fireflyMinutes = Math.floor((fireflyDiff % 36e5) / 6e4);
//     const fireflySeconds = Math.floor((fireflyDiff % 6e4) / 1e3);

//     // ▂▂▂▂▂▂▂▂ 构建显示内容 ▂▂▂▂▂▂▂▂
//     let c = s < 18 && s >= 9 ? 
//     `<img class='boardsign' src='' title=''><br>  
//     <div style="font-size:13px;font-weight:bold">
//         本店已开张 ${r} 天 ${s} 小时 ${l} 分 ${b} 秒 <i id="heartbeat" class='fas fa-heartbeat'></i><br>
//         和 FireFly 相遇的第 ${fireflyDays} 天 ${fireflyHours} 小时 ${fireflyMinutes} 分 ${fireflySeconds} 秒 ⭐<br>
//         旅行者 1 号当前距离地球 ${t} 千米，约为 ${a} 个天文单位 🚀
//     </div>
//     </b> <br> <b> <font size = 2px style="white-space: pre-wrap;">“ 𝐼 𝑑𝑟𝑒𝑎𝑚𝑒𝑑 𝑜𝑓 𝑎 𝑠𝑐𝑜𝑟𝑐ℎ𝑒𝑑 𝑒𝑎𝑟𝑡ℎ.   𝐴 𝑛𝑒𝑤 𝑠ℎ𝑜𝑜𝑡 𝑠𝑝𝑟𝑜𝑢𝑡𝑒𝑑 𝑓𝑟𝑜𝑚 𝑡ℎ𝑒 𝑒𝑎𝑟𝑡ℎ.   𝐼𝑡 𝑏𝑙𝑜𝑜𝑚𝑒𝑑 𝑖𝑛 𝑡ℎ𝑒 𝑚𝑜𝑟𝑛𝑖𝑛𝑔 𝑠𝑢𝑛, 𝑎𝑛𝑑 𝑤ℎ𝑖𝑠𝑝𝑒𝑟𝑒𝑑 𝑡𝑜 𝑚𝑒... ”🎇<br>“ 𝐿𝑖𝑘𝑒 𝑓𝑖𝑟𝑒𝑓𝑙𝑖𝑒𝑠 𝑡𝑜 𝑎 𝑓𝑙𝑎𝑚𝑒... 𝑙𝑖𝑓𝑒 𝑏𝑒𝑔𝑒𝑡𝑠 𝑑𝑒𝑎𝑡ℎ. ”🌠</font></b> ` 
//     : 
//     `<img class='boardsign' src='' title=''><br>  
//     <div style="font-size:13px;font-weight:bold">
//         本店已开张 ${r} 天 ${s} 小时 ${l} 分 ${b} 秒 <i id="heartbeat" class='fas fa-heartbeat'></i><br>
//         和 FireFly 相遇的第 ${fireflyDays} 天 ${fireflyHours} 小时 ${fireflyMinutes} 分 ${fireflySeconds} 秒 🌙<br>
//         旅行者 1 号当前距离地球 ${t} 千米，约为 ${a} 个天文单位 🚀
//     </div>
//     </b> <br> <b> <font size = 2px style="white-space: pre-wrap;">“ 𝐼 𝑑𝑟𝑒𝑎𝑚𝑒𝑑 𝑜𝑓 𝑎 𝑠𝑐𝑜𝑟𝑐ℎ𝑒𝑑 𝑒𝑎𝑟𝑡ℎ.   𝐴 𝑛𝑒𝑤 𝑠ℎ𝑜𝑜𝑡 𝑠𝑝𝑟𝑜𝑢𝑡𝑒𝑑 𝑓𝑟𝑜𝑚 𝑡ℎ𝑒 𝑒𝑎𝑟𝑡ℎ.   𝐼𝑡 𝑏𝑙𝑜𝑜𝑚𝑒𝑑 𝑖𝑛 𝑡ℎ𝑒 𝑚𝑜𝑟𝑛𝑖𝑛𝑔 𝑠𝑢𝑛, 𝑎𝑛𝑑 𝑤ℎ𝑖𝑠𝑝𝑒𝑟𝑒𝑑 𝑡𝑜 𝑚𝑒... ”🎇<br>“ 𝐿𝑖𝑘𝑒 𝑓𝑖𝑟𝑒𝑓𝑙𝑖𝑒𝑠 𝑡𝑜 𝑎 𝑓𝑙𝑎𝑚𝑒... 𝑙𝑖𝑓𝑒 𝑏𝑒𝑔𝑒𝑡𝑠 𝑑𝑒𝑎𝑡ℎ. ”🌠</font></b> `;

//     document.getElementById("workboard") && (document.getElementById("workboard").innerHTML = c);
// }

// setInterval(() => { createtime() }, 1e3);


