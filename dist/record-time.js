/* Occurrence time and recording time remain distinct. */
function recordClock(){return new Date().toLocaleTimeString('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit'})}
function recordTimeLabel(r){if(r.time)return r.date+' '+r.time;const stamp=r.recordedAt?new Date(r.recordedAt):null;return r.date+' · 时间未记录'+(stamp&&!isNaN(stamp)?'（录入 '+stamp.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})+'）':'')}
function recentRecords(rs){return rs.map((r,i)=>({r,i})).sort((a,b)=>String(b.r.date).localeCompare(String(a.r.date))||String(b.r.time||'').localeCompare(String(a.r.time||''))||String(b.r.recordedAt||'').localeCompare(String(a.r.recordedAt||''))||b.i-a.i).map(x=>x.r)}
