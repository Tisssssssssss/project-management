const assert=require('node:assert/strict');
require('../dist/contract-summary.js');
const C=global.ContractAmounts;
assert.equal(C.totalCents({cents:20000000,basis:'annual',termMonths:36}),20000000);
assert.equal(C.totalCents({cents:100,basis:'annual',termMonths:1}),100);
assert.equal(C.totalCents({cents:50000,basis:'monthly',termMonths:6}),50000);
for(const termMonths of [undefined,0,-1,1.5,36])assert.equal(C.totalCents({cents:100,basis:'annual',termMonths}),100);
const ps=[{id:'a'},{id:'b'},{id:'c'}],rows=[
{id:'a1',pid:'a',kind:'budget',cents:500,basis:'total',date:'2026-01-01'},
{id:'a2',pid:'a',kind:'quote',cents:200,basis:'annual',termMonths:24,date:'2026-01-02'},
{id:'b1',pid:'b',kind:'quote',cents:100,basis:'annual',date:'2026-01-02'},
{id:'c1',pid:'c',kind:'contract',cents:100,basis:'total',confirmed:true,date:'2026-01-02'}];
const x=C.snapshot(ps,rows,'2026-01-03');assert.equal(x.totalOpportunity.entries[0].value,300/1000000);assert.equal(x.totalOpportunity.included,2);assert.equal(x.totalOpportunity.missingTerm,0);assert.equal(x.entries.length,2);
rows[1].voided=true;assert.equal(C.snapshot(ps,rows,'2026-01-03').totalOpportunity.entries[0].value,600/1000000);
console.log('PASS: direct amounts, ignored duration, all billing bases, quote priority, voiding and signed exclusion');
