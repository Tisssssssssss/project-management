import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
if (!Array.isArray(input.rows) || input.rows.length > 10000) throw Error('导出记录无效或超过10000条');
const headers = ['客户单位','项目名称','项目背景','行业','负责人','当前阶段','金额','单位','金额类型','计费周期','最近跟进日期','最新进展','下一步行动','截止日期','归档状态','业务类型','登记日期'];
const dates = new Set([10,13,16]);
const literal = value => typeof value === 'string' && /^[=+@-]/.test(value) ? "'" + value : value;
const rows = input.rows.map(row => {
  if (!Array.isArray(row) || row.length !== headers.length) throw Error('字段数量不匹配');
  return row.map((value, col) => {
    if (value == null || value === '') return null;
    if (col === 6) {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw Error('金额必须为数字');
      return value;
    }
    if (dates.has(col)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('日期格式无效');
      return new Date(value+'T00:00:00Z');
    }
    return literal(String(value));
  });
});
const wb = Workbook.create();
const sheet = wb.worksheets.add('项目台账');
sheet.showGridLines = false;
const end = rows.length + 1;
sheet.getRange(`A1:Q${end}`).values = [headers, ...rows];
const area = sheet.getRange(`A1:Q${end}`);
area.format.font = { name: 'Arial', size: 11, color: '#344054' };
area.format.verticalAlignment = 'center';
area.format.wrapText = true;
area.format.rowHeight = 44;
const widths = [30,34,52,12,14,16,16,10,15,16,18,48,38,18,14,28,18];
widths.forEach((width,i) => { sheet.getRangeByIndexes(0,i,end,1).format.columnWidth=width; });
if (rows.length) {
  const table = sheet.tables.add(`A1:Q${end}`, true, 'ProjectLedger');
  table.showFilterButton = true;
  sheet.getRange(`G2:G${end}`).setNumberFormat('#,##0.######');
  for (const col of ['K','N','Q']) sheet.getRange(`${col}2:${col}${end}`).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(`G2:G${end}`).format.horizontalAlignment='right';
  sheet.getRange(`A2:Q${end}`).format.autofitRows();
  // Fit wrapped prose conservatively; preserve full values even for long cells.
  rows.forEach((row,i) => {
    const lineCount = Math.max(...row.map((value,j) => typeof value === 'string' ? String(value).split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil([...line].reduce((s,c)=>s+(c.charCodeAt(0)>255?2:1),0)/Math.max(8,widths[j]-3))),0) : 1));
    sheet.getRange(`A${i+2}:Q${i+2}`).format.rowHeight=Math.min(409,Math.max(44,lineCount*17+12));
  });
}
const head = sheet.getRange('A1:Q1');
head.format.fill='#234E7A';
head.format.font={name:'Arial',size:11,bold:true,color:'#FFFFFF'};
head.format.rowHeight=32;
head.format.horizontalAlignment='center';
sheet.freezePanes.freezeRows(1);
wb.recalculate();
if (input.previewPath) {
  const image = await wb.render({sheetName:'项目台账',range:`A1:F${Math.min(end,5)}`,scale:1.5,format:'png'});
  await fs.writeFile(input.previewPath,new Uint8Array(await image.arrayBuffer()));
}
const output=await SpreadsheetFile.exportXlsx(wb);
await output.save(input.outputPath);
process.stdout.write(JSON.stringify({rows:rows.length,path:input.outputPath}));
