import React, { useState } from 'react';
export default function PayrollPreview(){
const [input,setInput]=useState({
components:{basic:25000,hra:12500,conveyance:1000,special:5000,lta:0,others:[{label:'Food',amount:1500}]},
ctcMonthly:45000,
attendance:{month:'2025-11',calendarDays:30,payableDays:24,lopDays:6,overtimeHours:4},
config:{ pf:{employeeRate:0.12,basicCap:15000}, esi:{employeeRate:0.0075,wageCeiling:21000}, pt:{state:'KA',slabs:[{upto:15000,amount:0},{above:15000,amount:200}]}, tds:{regime:'new',slabs:[{upto:300000,rate:0},{rate:0.05}]}}
});
const [result,setResult]=useState(null); const [loading,setLoading]=useState(false);
async function calc(){ setLoading(true); try{
const r=await fetch('http://localhost:4001/api/payroll/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
setResult(await r.json()); } finally{ setLoading(false);} }
return (<div style={{maxWidth:800,marginTop:16}}>
<div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
<label>Basic <input type="number" value={input.components.basic} onChange={e=>setInput(i=>({...i,components:{...i.components,basic:Number(e.target.value)}}))}/></label>
<label>HRA <input type="number" value={input.components.hra} onChange={e=>setInput(i=>({...i,components:{...i.components,hra:Number(e.target.value)}}))}/></label>
<label>Special <input type="number" value={input.components.special} onChange={e=>setInput(i=>({...i,components:{...i.components,special:Number(e.target.value)}}))}/></label>
<label>CTC <input type="number" value={input.ctcMonthly} onChange={e=>setInput(i=>({...i,ctcMonthly:Number(e.target.value)}))}/></label>
<label>Cal Days <input type="number" value={input.attendance.calendarDays} onChange={e=>setInput(i=>({...i,attendance:{...i.attendance,calendarDays:Number(e.target.value)}}))}/></label>
<label>Payable Days <input type="number" value={input.attendance.payableDays} onChange={e=>setInput(i=>({...i,attendance:{...i.attendance,payableDays:Number(e.target.value)}}))}/></label>
<label>LOP Days <input type="number" value={input.attendance.lopDays} onChange={e=>setInput(i=>({...i,attendance:{...i.attendance,lopDays:Number(e.target.value)}}))}/></label>
<label>OT Hours <input type="number" value={input.attendance.overtimeHours} onChange={e=>setInput(i=>({...i,attendance:{...i.attendance,overtimeHours:Number(e.target.value)}}))}/></label>
</div>
<button onClick={calc} disabled={loading} style={{marginTop:12}}>{loading?'Calculating...':'Calculate Payroll'}</button>
{result&&!result.error&&(<div style={{marginTop:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
<div style={{border:'1px solid #eee',borderRadius:8,padding:12}}>
<h3>Earnings</h3><ul>{result.earnings.map((e,idx)=>(<li key={idx}>{e.label}: ₹{e.amount}</li>))}</ul>
<p><b>Gross:</b> ₹{result.gross}</p>
</div>
<div style={{border:'1px solid #eee',borderRadius:8,padding:12}}>
<h3>Deductions</h3><ul>{result.deductions.map((d,idx)=>(<li key={idx}>{d.label}: ₹{d.amount}</li>))}</ul>
<p><b>Net Pay:</b> ₹{result.net}</p>
</div>
</div>)}
{result?.error&&<p style={{color:'crimson'}}>{result.error}</p>}
</div>);
}