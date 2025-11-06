const r = (n) => Math.round(n || 0);
function computePayroll(inp) {
if (!inp || !inp.components || !inp.attendance || !inp.config) throw new Error('Missing required fields');
const { components, attendance, config } = inp; const ctcMonthly = Number(inp.ctcMonthly || 0);
const factor = Number(attendance.payableDays || 0) / Number(attendance.calendarDays || 1);
const earnings = []; const addE=(c,l,a)=>{const v=r(a); if(v) earnings.push({code:c,label:l,amount:v});};
addE('BASIC','Basic',(components.basic||0)*factor);
addE('HRA','HRA',(components.hra||0)*factor);
addE('CONV','Conveyance',(components.conveyance||0)*factor);
addE('SPEC','Special Allowance',(components.special||0)*factor);
addE('LTA','LTA',(components.lta||0)*factor);
(components.others||[]).forEach(o=>addE('OTH',o.label||'Other',(o.amount||0)*factor));
if (inp.ot && attendance.overtimeHours>0) addE('OT','Overtime', attendance.overtimeHours*(inp.ot.hourlyRate||0)*(inp.ot.multiplier||1));
(inp.oneTime||[]).forEach(x=>addE('ONE',x.label||'One-time',x.amount||0));
const gross=r(earnings.reduce((s,e)=>s+e.amount,0));
const deductions=[]; const addD=(c,l,a)=>{const v=r(a); if(v) deductions.push({code:c,label:l,amount:v});};
const lopDays=Number(attendance.lopDays||0); addD('LOP','Loss of Pay',(ctcMonthly/Number(attendance.calendarDays||1))*lopDays);
const pfCfg=config.pf||{employeeRate:0,basicCap:Number.MAX_SAFE_INTEGER};
const basicEarn=(earnings.find(e=>e.code==='BASIC')||{}).amount||0; const pfWage=Math.min(basicEarn,Number(pfCfg.basicCap||Number.MAX_SAFE_INTEGER));
addD('PF','PF (Employee)', pfWage*Number(pfCfg.employeeRate||0));
const esiCfg=config.esi||{employeeRate:0,wageCeiling:0}; if(esiCfg.wageCeiling && gross<=Number(esiCfg.wageCeiling)) addD('ESI','ESI (Employee)', gross*Number(esiCfg.employeeRate||0));
const ptCfg=config.pt||{state:'NA',slabs:[]}; const slab=(ptCfg.slabs||[]).find(s=> (typeof s.upto==='number'&&gross<=s.upto) || (typeof s.above==='number'&&gross>s.above)); if(slab) addD('PT','Professional Tax', slab.amount||0);
const tdsCfg=config.tds||{slabs:[]}; const tdsSlab=(tdsCfg.slabs||[]).find(s=> (typeof s.upto==='number'&&gross<=s.upto) || typeof s.upto!=='number');
if (tdsSlab && typeof tdsSlab.rate==='number') addD('TDS','TDS', Math.max(gross-(tdsSlab.upto||0),0)*tdsSlab.rate);
const net=r(gross - r(deductions.reduce((s,d)=>s+d.amount,0)));
return { earnings, deductions, gross, net };
}
module.exports={ computePayroll };