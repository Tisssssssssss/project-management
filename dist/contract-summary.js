/* Contract amounts retain their original basis; annual/monthly fees are never added to lifecycle totals. */
(function(root){
 function summarize(rows){const units={total:'万元',annual:'万元/年',monthly:'万元/月'};const grouped=new Map();for(const r of rows){if(r.kind!=='contract'||!r.confirmed||r.voided||!Number.isSafeInteger(r.cents)||!units[r.basis])continue;grouped.set(r.basis,(grouped.get(r.basis)||0)+r.cents)}const entries=['total','annual','monthly'].filter(k=>grouped.has(k)).map(basis=>({basis,value:grouped.get(basis)/1000000,unit:units[basis]}));if(!entries.length)entries.push({basis:'total',value:0,unit:units.total});return {entries,html:entries.map(e=>e.value.toLocaleString('zh-CN',{maximumFractionDigits:6})+'<small>'+e.unit+'</small>').join('<br>')};}
 root.ContractAmounts={summarize};
})(globalThis);
