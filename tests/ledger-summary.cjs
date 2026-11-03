const assert=require('node:assert/strict');require('../dist/contract-summary.js');const C=ContractAmounts;
const row=(pid,kind,basis,cents,date,extra={})=>({pid,kind,basis,cents,date,confirmed:true,...extra});
const ps=[{id:'a'},{id:'b'}];const rows=[row('a','contract','annual',2000000,'2026-10-01'),row('b','budget','annual',3000000,'2026-11-02')];let s=C.snapshot(ps,rows,'2026-11-03');assert.equal(s.opportunity.entries[0].value,3);assert.equal(s.contract.entries[0].value,2);assert.equal(s.signedIds.size,1);
assert.equal(C.snapshot(ps,rows,'2026-09-30').opportunity.entries[0].value,0);assert.equal(C.snapshot([{id:'b'}],rows,'2026-11-03').signedIds.size,0);
const mixed=[row('a','budget','total',1000000,'2026-11-01'),row('b','contract','monthly',2000000,'2026-11-01')];assert.deepEqual(C.snapshot(ps,mixed,'2026-11-03').opportunity.entries.map(e=>e.unit),['万元']);
assert.equal(C.latest([...rows,row('a','budget','total',99000000,'2026-11-02')],'a','2026-11-03').kind,'contract');
assert.equal(C.latest([row('a','quote','annual',1000000,'2026-11-01',{time:'10:00'}),row('a','quote','annual',4000000,'2026-11-01',{time:'09:00'})],'a','2026-11-03').cents,1000000);
s=C.snapshot(ps,[...rows,row('a','receipt','total',7000000,'2026-11-02'),row('b','contract','total',9000000,'2026-11-02',{voided:true})],'2026-11-03');assert.equal(s.contract.entries[0].value,2);assert.equal(s.opportunity.entries[0].value,3);assert.equal(C.summarize([row('a','contract','annual',1000000,'2026-11-02',{confirmed:false})]).entries[0].value,0);
console.log('PASS: cross-month snapshot, billing bases, contract priority, same-day time ordering, cutoff, excluded projects, voided and receipt exclusion');

// Signed projects do not fall back to their former budget or quote in opportunity totals.
s=C.snapshot(ps,[...rows,row('a','budget','total',8000000,'2026-09-01')],'2026-11-03');assert.equal(s.entries.length,1);assert.equal(s.entries[0].p.id,'b');assert.equal(s.opportunity.entries[0].value,3);
const pending=[row('a','contract','annual',9000000,'2026-11-01',{confirmed:false}),row('a','quote','total',7000000,'2026-10-31')];s=C.snapshot([{id:'a'}],pending,'2026-11-03');assert.equal(s.signedIds.size,0);assert.equal(s.opportunity.entries[0].value,7);
s=C.snapshot([{id:'a'}],[row('a','quote','total',7000000,'2026-10-01'),row('a','contract','total',8000000,'2026-11-01')],'2026-10-31');assert.equal(s.opportunity.entries[0].value,7);s=C.snapshot([{id:'a'}],[row('a','quote','total',7000000,'2026-10-01'),row('a','contract','total',8000000,'2026-11-01')],'2026-11-03');assert.equal(s.entries.length,0);assert.equal(s.opportunity.entries[0].value,0);assert.equal(s.contract.entries[0].value,8);
console.log('PASS: opportunity/signing are exclusive, pending contracts, historical conversion');
