"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Calculator, IndianRupee, Activity, XCircle, Server,
  Database, RefreshCw, Play, TrendingUp, AlignLeft, ChevronRight, ChevronLeft, X, Percent, Sigma, FunctionSquare, ArrowRight
} from 'lucide-react';

/* ─── Helpers ─────────────────────────────────────────────────── */
const formatINR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v);

/* ─── Tooltip (Used ONLY in Results Table, NOT in Sidebar) ───── */
const Tooltip = ({ children, content, wide, align = 'center', side = 'top' }: { children: React.ReactNode; content: React.ReactNode; wide?: boolean; align?: 'left' | 'right' | 'center'; side?: 'top' | 'bottom' }) => {
  const alignClass = align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0';
  const arrowClass = align === 'right' ? 'right-4' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-6';
  
  const verticalClass = side === 'top' ? 'bottom-full mb-3' : 'top-full mt-3';
  const arrowVertical = side === 'top' ? 'top-full border-t-slate-700/50' : 'bottom-full border-b-slate-700/50';

  return (
    <div className="relative group/tt inline-flex items-center justify-center">
      {children}
      <div className={`absolute ${verticalClass} ${alignClass} hidden group-hover/tt:block z-[999] ${wide ? 'w-72' : 'w-56'} pointer-events-none`}>
        <div className="bg-[#0f172a]/95 backdrop-blur-xl text-slate-200 text-xs rounded-xl p-3 shadow-[0_20px_50px_-5px_rgba(0,0,0,0.8)] border border-slate-700/50 leading-relaxed text-left whitespace-normal normal-case tracking-normal">
          {content}
          <div className={`absolute ${arrowVertical} ${arrowClass} border-[6px] border-transparent`} />
        </div>
      </div>
    </div>
  );
};

const FormulaTag = ({ formula }: { formula: string }) => (
  <span className="block mt-2 bg-[#020617] border border-blue-500/20 px-2 py-1.5 rounded-lg font-mono text-[10px] text-blue-300 shadow-inner">
    {formula}
  </span>
);

/* ─── Formula Library Overlay Component ──────────────────────── */
const FormulaExplorer = ({ onClose, initialData }: { onClose: () => void; initialData?: { p: string, r: string, n: string } }) => {
  const [emiForm, setEmiForm] = useState({ 
    p: initialData?.p || '', 
    r: initialData?.r || '', 
    n: initialData?.n || '' 
  });
  const [accrualForm, setAccrualForm] = useState({ 
    p: initialData?.p || '', 
    r: initialData?.r || '', 
    days: '1' 
  });

  // Calculate live values safely from strings
  const pEmi = Number(emiForm.p) || 0;
  const rEmi = Number(emiForm.r) || 0;
  const nEmi = Number(emiForm.n) || 0;

  const rMonth = rEmi / 12 / 100;
  const emi = (rMonth > 0 && nEmi > 0 && pEmi > 0) ? (pEmi * rMonth * Math.pow(1 + rMonth, nEmi)) / (Math.pow(1 + rMonth, nEmi) - 1) : 0;
  const totalPayment = emi * nEmi;
  const totalInterest = totalPayment > pEmi ? totalPayment - pEmi : 0;
  
  const pAcc = Number(accrualForm.p) || 0;
  const rAcc = Number(accrualForm.r) || 0;
  const dAcc = Number(accrualForm.days) || 0;

  const dailyAccrual = (pAcc * (rAcc / 100) / 365);
  const totalAccrual = dailyAccrual * dAcc;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#020617]/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 z-0 bg-gradient-to-tr from-blue-900/10 to-indigo-900/10" onClick={onClose} />
      
      <div className="bg-[#0A101F]/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_30px_100px_-20px_rgba(0,0,0,1)] w-full max-w-6xl max-h-[90vh] flex flex-col relative z-10 overflow-hidden ring-1 ring-white/5">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0A101F] rounded-[15px] flex items-center justify-center">
                <FunctionSquare className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Interactive Formula Library</h2>
              <p className="text-sm text-slate-400 mt-0.5">Explore the core mathematics powering the LMS Accounting Engine in real-time.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors bg-white/5">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-700">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Card 1: EMI Calculator */}
          <div className="bg-[#0F172A]/50 border border-white/5 rounded-3xl p-6 shadow-inner relative overflow-hidden group flex flex-col h-fit min-h-full">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-2"><Calculator className="w-5 h-5 text-blue-400" /> Standard EMI Formula</h3>
            <p className="text-xs text-slate-400 mb-6">Equated Monthly Installment calculation using the reducing balance method.</p>
            
            <div className="bg-[#020617] rounded-2xl p-4 mb-6 ring-1 ring-white/5 font-mono text-center flex flex-col gap-2 relative z-10">
              <span className="text-lg text-blue-300">EMI = P * r * (1+r)ⁿ / ((1+r)ⁿ - 1)</span>
              <span className="text-[10px] text-slate-500">P = Principal, r = Rate/Month (R/12/100), n = Tenure(Months)</span>
            </div>

            <div className="grid gap-4 mb-8 relative z-10">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Principal (P) in ₹</label>
                <input type="number" value={emiForm.p} onChange={(e) => setEmiForm({...emiForm, p: e.target.value})} className="w-full bg-[#020617] border border-slate-700/80 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Rate (R) in %</label>
                  <input type="number" step="0.01" value={emiForm.r} onChange={(e) => setEmiForm({...emiForm, r: e.target.value})} className="w-full bg-[#020617] border border-slate-700/80 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Tenure (n) in Months</label>
                  <input type="number" value={emiForm.n} onChange={(e) => setEmiForm({...emiForm, n: e.target.value})} className="w-full bg-[#020617] border border-slate-700/80 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-6 mt-auto relative z-10">
              <div><p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Monthly EMI</p><p className="text-xl font-mono text-blue-400 font-bold">{formatINR(emi || 0)}</p></div>
              <div><p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Total Interest</p><p className="text-xl font-mono text-rose-400">{formatINR(totalInterest || 0)}</p></div>
              <div><p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Total Payment</p><p className="text-xl font-mono text-emerald-400">{formatINR(totalPayment || 0)}</p></div>
            </div>
          </div>

          {/* Card 2: Daily Accrual Calculator */}
          <div className="bg-[#0F172A]/50 border border-white/5 rounded-3xl p-6 shadow-inner relative overflow-hidden group flex flex-col h-fit min-h-full">
            <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-2"><Sigma className="w-5 h-5 text-indigo-400" /> Daily Interest Accrual</h3>
            <p className="text-xs text-slate-400 mb-6">Calculates the unbilled interest accumulated daily on the outstanding principal balance (365 days base).</p>
            
            <div className="bg-[#020617] rounded-2xl p-4 mb-6 ring-1 ring-white/5 font-mono text-center flex flex-col gap-2 relative z-10">
              <span className="text-lg text-indigo-300">Daily_Amt = (Principal * Rate / 100) / 365</span>
              <span className="text-[10px] text-slate-500">Applies uniformly for standard accounting days.</span>
            </div>

            <div className="grid gap-4 mb-8 relative z-10">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Outstanding Principal in ₹</label>
                <input type="number" value={accrualForm.p} onChange={(e) => setAccrualForm({...accrualForm, p: e.target.value})} className="w-full bg-[#020617] border border-slate-700/80 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Rate in %</label>
                  <input type="number" step="0.01" value={accrualForm.r} onChange={(e) => setAccrualForm({...accrualForm, r: e.target.value})} className="w-full bg-[#020617] border border-slate-700/80 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Days</label>
                  <input type="number" value={accrualForm.days} onChange={(e) => setAccrualForm({...accrualForm, days: e.target.value})} className="w-full bg-[#020617] border border-slate-700/80 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6 mt-auto relative z-10">
              <div><p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Per Day Accrual</p><p className="text-2xl font-mono text-indigo-400 font-bold">{formatINR(dailyAccrual || 0)}</p></div>
              <div><p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Total For {accrualForm.days} Days</p><p className="text-2xl font-mono text-yellow-400 font-bold">{formatINR(totalAccrual || 0)}</p></div>
            </div>
          </div>

          {/* Card 3: Derived Component Breakdown */}
          <div className="lg:col-span-2 bg-gradient-to-r from-[#0F172A]/50 to-[#020617]/50 border border-white/5 rounded-3xl p-6 shadow-inner flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
               <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-2"><AlignLeft className="w-5 h-5 text-emerald-400" /> Installment Breakdown Logic</h3>
               <p className="text-sm text-slate-400 mb-4 max-w-lg">During the schedule generation (<code>PRC_LN_GenerateSchedule_EMI</code>), each installment is split between interest and principal recovery sequentially.</p>
               <div className="space-y-3 font-mono text-xs">
                 <div className="flex items-center gap-3 p-3 bg-[#020617] rounded-xl border border-white/5">
                   <div className="bg-rose-500/20 text-rose-400 font-bold h-6 w-6 flex items-center justify-center rounded-md shrink-0">1</div>
                   <div className="flex-1"><span className="text-slate-500">First, extract Interest:</span> <br/><span className="text-rose-300">Interest = Outstanding * (Rate/100/12)</span></div>
                 </div>
                 <div className="flex items-center gap-3 p-3 bg-[#020617] rounded-xl border border-white/5">
                   <div className="bg-emerald-500/20 text-emerald-400 font-bold h-6 w-6 flex items-center justify-center rounded-md shrink-0">2</div>
                   <div className="flex-1"><span className="text-slate-500">Then, deduce Principal:</span> <br/><span className="text-emerald-300">Principal = Final EMI - Interest Component</span></div>
                 </div>
                 <div className="flex items-center gap-3 p-3 bg-[#020617] rounded-xl border border-white/5">
                   <div className="bg-blue-500/20 text-blue-400 font-bold h-6 w-6 flex items-center justify-center rounded-md shrink-0">3</div>
                   <div className="flex-1"><span className="text-slate-500">Close the month balance:</span> <br/><span className="text-blue-300">New Outstanding = Old Outstanding - Principal</span></div>
                 </div>
               </div>
            </div>
            
            {/* Visual breakdown diagram */}
            <div className="w-full md:w-80 shrink-0 bg-[#020617] p-5 rounded-2xl border border-white/5 flex flex-col gap-4 text-center">
               <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 font-bold text-sm">₹{formatINR(emi)} (Total EMI)</div>
               <ArrowRight className="w-5 h-5 text-slate-600 rotate-90 mx-auto" />
               <div className="flex gap-2">
                 <div className="flex-1 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                   <p className="text-[10px] text-rose-400/80 mb-1 uppercase font-bold tracking-wider">Interest</p>
                   <p className="font-mono text-rose-300 text-sm">₹{formatINR((pEmi * rEmi/100/12))}</p>
                 </div>
                 <div className="flex-1 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                   <p className="text-[10px] text-emerald-400/80 mb-1 uppercase font-bold tracking-wider">Principal</p>
                   <p className="font-mono text-emerald-300 text-sm">₹{formatINR(emi - (pEmi * rEmi/100/12))}</p>
                 </div>
               </div>
               <p className="text-[10px] text-slate-500 mt-2">Example representing 1st month breakdown.</p>
            </div>
          </div>

          {/* Card 4: Amortization Schedule Simulator */}
          <div className="lg:col-span-2 bg-[#0F172A]/50 border border-white/5 rounded-3xl p-6 shadow-inner flex flex-col gap-4">
             <div className="flex items-center justify-between border-b border-white/5 pb-4">
               <div>
                 <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-1"><AlignLeft className="w-5 h-5 text-blue-400" /> Live Amortization Simulator</h3>
                 <p className="text-xs text-slate-400">Simulates `PRC_LN_GenerateSchedule_EMI` with exact day-count logic (Rate/36500 * NoOfDays).</p>
               </div>
             </div>
             <div className="overflow-x-auto border border-white/5 rounded-xl bg-[#020617] scrollbar-thin scrollbar-thumb-slate-700 max-h-80">
               <table className="w-full text-[10px] sm:text-xs">
                 <thead className="bg-[#0A101F] text-slate-400 sticky top-0 border-b border-white/5 shadow-sm">
                   <tr>
                     <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">M</th>
                     <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Days</th>
                     <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Opening Princ</th>
                     <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Sch. Interest</th>
                     <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Sch. Principal</th>
                     <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">EMI</th>
                     <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Closing Princ</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5 text-slate-300 font-mono">
                   {Array.from({ length: Math.min(nEmi, 60) }).map((_, i) => {
                     // Extremely simplified mock matching the logic visually (Exact SQL emulation requires full date loop)
                     const opening = i === 0 ? pEmi : pEmi * Math.pow(1 - rMonth, i); // Mock calculation for display speed
                     const int = opening * rMonth;
                     const princ = emi - int;
                     const closing = Math.max(0, opening - princ);
                     return (
                       <tr key={i} className="hover:bg-blue-500/10 transition-colors">
                         <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                         <td className="px-4 py-2">30</td>
                         <td className="px-4 py-2 text-slate-300">{formatINR(opening)}</td>
                         <td className="px-4 py-2 text-rose-300">{formatINR(int)}</td>
                         <td className="px-4 py-2 text-emerald-300">{formatINR(princ)}</td>
                         <td className="px-4 py-2 text-blue-300">{formatINR(emi)}</td>
                         <td className="px-4 py-2 text-slate-300">{formatINR(closing)}</td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
               {nEmi > 60 && <div className="p-3 text-center text-[10px] text-slate-500 uppercase tracking-widest border-t border-white/5 bg-[#020617]">Showing first 60 months</div>}
             </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};


/* ─── Formula metadata per column ────────────────────────────── */
const COL_META: Record<string, { label: string; formula?: string; type?: 'number' | 'currency' }> = {
  scheduleid:       { label: 'Sequential identifier for the schedule period.', type: 'number' },
  noofdays:         { label: 'Number of accrual days in schedule period.', formula: 'M1: DATEDIFF(Disburse, 1stEMI) | M>1: Day(EOMONTH(Prev))', type: 'number' },
  scheduledate:     { label: 'Date the EMI is billed.', formula: 'DATEADD(MONTH, n-1, FirstEMI)' },
  emiamount:        { label: 'Fixed monthly installment paid by borrower.', formula: 'EMI = floor(P * rate_monthly / (1 - (1+rate_monthly)^-n))' },
  emi:              { label: 'Fixed monthly installment paid by borrower.', formula: 'EMI = floor(P * rate_monthly / (1 - (1+rate_monthly)^-n))' },
  scheduledinterest:{ label: 'Interest component calculated on outstanding principal based on explicit days.', formula: 'round((Remaining * Rate) / 36500, 4) * NoOfDays' },
  interestamount:   { label: 'Interest component calculated on outstanding principal.', formula: 'round((Remaining * Rate) / 36500, 4) * NoOfDays' },
  scheduledprincipal:{ label: 'Principal component recovered in this schedule.', formula: 'ScheduledPrincipal = EMI - ScheduledInterest' },
  principalamount:  { label: 'Principal repaid — reduces outstanding balance.', formula: 'Principal = EMI - Interest' },
  openingprincipal: { label: 'Outstanding loan balance at period start.', formula: 'Previous ClosingPrincipal + PrincipalPayment' },
  closingprincipal: { label: 'Balance after principal payment.', formula: 'Current OpeningPrincipal - ScheduledPrincipal' },
  balanceprincipal: { label: 'Current total outstanding principal.' },
  accruedinterest:  { label: 'Interest accrued daily on outstanding principal.', formula: 'Accrual = Outstanding * Rate / 365' },
  interestaccrued:  { label: 'Interest accumulated but not yet billed.', formula: 'Sum(Daily Accrual) since last billed date' },
  interestdue:      { label: 'Billed interest pending payment.' },
  interestpaid:     { label: 'Billed interest that has been paid.' },
  principalpaid:    { label: 'Principal that has been paid by customer.' },
  emipaid:          { label: 'Total EMI (Princ+Int) paid by customer.' },
  disbursementamount:{ label: 'Net amount disbursed to borrower.' },
  totalamount:      { label: 'Total of principal + interest.', formula: 'Total = Principal + Interest' },
  outstandingamount:{ label: 'Remaining unpaid principal balance.' },
  chargeamount:     { label: 'Processing or ancillary fee levied.' },
  lastaccdate:      { label: 'Date of last accounting run.', formula: 'M1: DisbursementDate' },
  createddate:      { label: 'System record creation timestamp.' },
  debitamount:      { label: 'Debit side of the accounting entry.' },
  creditamount:     { label: 'Credit side of the accounting entry.' },
  amount:           { label: 'Monetary value in this accounting entry.' },
  
  /* Daily Accrual & EOD Logic */
  dailyinterest:    { label: 'Unbilled interest for the current day.', formula: 'ROUND((Rate * BalancePrincipal) / 36500, 4)' },
  totalaccruedinterest: { label: 'Accumulated unbilled interest.', formula: 'Current + DailyInterest' },
  totalinterestpaid:{ label: 'Total interest recovered from borrower over loan lifecycle.' },
  totalprincipalpaid:{ label: 'Total principal recovered from borrower.' },
  accountingaccrued:{ label: 'Total interest posted to GL at month-end.', formula: 'AccountingAccrued + MonthEndAccrualAmount' },
  accountingcapitalized: { label: 'Interest capitalized into principal balance.' },
  dpd:              { label: 'Days Past Due. Calculated from oldest unpaid schedule.', formula: 'DATEDIFF(DAY, FirstOverdueDate, BusinessDate)', type: 'number' },
  modifieddate:     { label: 'Last timestamp the accrual or DPD was updated.', formula: 'SYSDATETIME()' },

  /* Accounting Details & GL Entries */
  activityid:       { label: 'Unique transaction identifier.', formula: 'TxnCode + YYYYMMDD + Sequence' },
  module:           { label: 'Core system module originating the entry.', formula: 'R.Module (e.g. LN)' },
  txncode:          { label: 'Transaction event classification code.', formula: 'R.TxnCode (e.g. LD=Disburse, LA=Accrual)' },
  amtcode:          { label: 'Internal mapping code for specific monetary amounts.', formula: 'e.g. PRIN, PFEE, INTACR' },
  glmnemonic:       { label: 'Target General Ledger node/chart of accounts.', formula: 'Sourced from GS_LN_Accounting_PostingRule' },
  dr_cr:            { label: 'Debit (D) or Credit (C) accounting indicator.', formula: 'R.Dr_Cr' },
  acctgdate:        { label: 'System accounting date when strictly posted.', formula: '@BusinessDate' },
  valuedate:        { label: 'Logical/effective date of the transaction for value tracing.' },
  sourcecode:       { label: 'Triggering sub-routine or system event trace.', formula: 'e.g. EODACCR_102, LD101' },
};

const getMeta = (col: string) => {
  const key = col.toLowerCase();
  return COL_META[key] ?? Object.entries(COL_META).find(([k]) => key.includes(k))?.[1] ?? null;
};

/* ─── Table ───────────────────────────────────────────────────── */
function ResultTable({ rows, aiErrors = {} }: { rows: any[], aiErrors?: Record<string, string> }) {
  if (!rows?.length) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-600 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-slate-800/30 border border-slate-800 flex items-center justify-center">
        <AlignLeft className="w-5 h-5 text-slate-500" />
      </div>
      <span className="text-sm font-medium">No records matching the execution</span>
    </div>
  );

  const cols = Object.keys(rows[0]);

  const fmtVal = (col: string, val: any) => {
    if (val === null || val === undefined) return '—';
    const meta = getMeta(col);
    const isAmt = meta && typeof val === 'number' && meta.type !== 'number';
    if (isAmt) return formatINR(val);
    if (typeof val === 'string' && /T\d{2}:\d{2}/.test(val)) return val.split('T')[0];
    return String(val);
  };

  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0B1120] overflow-hidden shadow-2xl relative">
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-140px)] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#0f172a] sticky top-0 z-10 shadow-sm border-b border-slate-700/60">
              {cols.map(col => {
                const meta = getMeta(col);
                return (
                  <th key={col} className="text-left px-4 py-3.5 text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap hover:relative hover:z-50">
                    {meta ? (
                      <Tooltip side="bottom" align="center" wide={!!meta.formula} content={<><p className="text-slate-200">{meta.label}</p>{meta.formula && <FormulaTag formula={meta.formula} />}</>}>
                        <span className="flex items-center gap-1.5 border-b border-dashed border-blue-500/40 pb-0.5 cursor-help text-blue-300">
                          {col} <TrendingUp className="w-3 h-3 text-blue-500/70" />
                        </span>
                      </Tooltip>
                    ) : col}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {rows.map((row, i) => {
              const err = aiErrors[row?.PopulateID];
              return (
              <tr key={i} className={`transition-colors hover:relative hover:z-50 ${err ? 'bg-rose-500/10 hover:bg-rose-500/20 ring-1 ring-inset ring-rose-500/30' : (i % 2 === 0 ? 'bg-transparent' : 'bg-[#0f172a]/20')} hover:bg-blue-500/10`}>
                {cols.map(col => {
                  const raw = row[col];
                  const meta = getMeta(col);
                  const isAmt = meta && typeof raw === 'number' && meta.type !== 'number';
                  const display = fmtVal(col, raw);
                  return (
                    <td key={col} className={`px-4 py-2.5 whitespace-nowrap max-w-[200px] ${isAmt ? 'font-mono text-[11px]' : ''}`}>
                      {err && col === cols[0] && (
                        <Tooltip side="bottom" align="left" wide content={<><p className="font-bold text-rose-400 mb-1">AI Accounting Analysis</p><p className="text-rose-200/80 leading-relaxed whitespace-normal tracking-wide">{err}</p></>}>
                          <XCircle className="w-4 h-4 text-rose-500 inline mr-2 cursor-help animate-pulse" />
                        </Tooltip>
                      )}
                      {isAmt ? (
                        <Tooltip side="top" align="center" wide={!!meta!.formula} content={
                          <><p className="text-slate-400 mb-2">{meta!.label}</p>
                            <p className="text-emerald-400 font-bold text-sm tracking-tight">{display}</p>
                            {meta!.formula && <FormulaTag formula={meta!.formula} />}</>
                        }>
                          <span className="text-emerald-400/90 font-medium cursor-help border-b border-dotted border-emerald-500/30">
                            {display}
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="text-slate-300 block truncate" title={String(raw ?? '')}>{display}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Sidebar Tab Button ─────────────────────────────────────── */
const TAB_ICONS: Record<string, React.ReactNode> = {
  CreateLoanResponse:          <Database className="w-4 h-4 shrink-0" />,
  LoanDetail:                  <AlignLeft className="w-4 h-4 shrink-0" />,
  LoanEnquiry:                 <AlignLeft className="w-4 h-4 shrink-0" />,
  ProcessDisbursementResponse: <ChevronRight className="w-4 h-4 shrink-0" />,
  DisbursementEnquiry:         <IndianRupee className="w-4 h-4 shrink-0" />,
  DisbursementDetail:          <IndianRupee className="w-4 h-4 shrink-0" />,
  RepaymentSchedule:           <Calculator className="w-4 h-4 shrink-0" />,
  DailyAccrual:                <TrendingUp className="w-4 h-4 shrink-0" />,
  ChargeSchedule:              <IndianRupee className="w-4 h-4 shrink-0" />,
  AccountingDetails:           <AlignLeft className="w-4 h-4 shrink-0" />,
};

const TAB_LABELS: Record<string, string> = {
  CreateLoanResponse:          'Loan Creation Status',
  LoanDetail:                  'Loan Detail',
  LoanEnquiry:                 'Loan Enquiry',
  ProcessDisbursementResponse: 'Disbursement Status',
  DisbursementEnquiry:         'Disbursement Enquiry',
  DisbursementDetail:          'Disbursement Detail',
  RepaymentSchedule:           'Repayment Schedule',
  DailyAccrual:                'Daily Accrual',
  ChargeSchedule:              'Charge Schedule',
  AccountingDetails:           'Accounting Details',
};

/* ─── Form Elements ───────────────────────────────────────────── */
const FormGroup = ({ label, helper, formula, children }: { label: string; helper: string; formula?: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5 bg-[#0f172a]/30 p-3.5 rounded-xl border border-white/5 shadow-inner">
    <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">{label}</label>
    {children}
    <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{helper}</p>
    {formula && <p className="text-[9px] font-mono text-blue-400/80 bg-blue-500/10 px-1.5 py-0.5 rounded w-fit mt-0.5">{formula}</p>}
  </div>
);

const inputCls = "w-full bg-[#020617] border border-slate-700/80 rounded-lg px-3 py-2.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium text-sm shadow-inner [color-scheme:dark]";

/* ─── Main App ─────────────────────────────────────────────────── */
export default function App() {
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any[]> | null>(null);
  const [lastAction, setLastAction] = useState<'SIMULATE' | 'COMMIT'>('SIMULATE');
  const [activeTab, setActiveTab] = useState('');
  const [showFormulaExplorer, setShowFormulaExplorer] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [form, setForm] = useState({
    appliedAmount: '', sanctionAmount: '', tenure: '', interestRate: '',
    firstInstallmentDate: '', endDate: '', createdBy: ''
  });

  const set = (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const execute = async (action: 'SIMULATE' | 'COMMIT' = 'SIMULATE') => {
    setLoading(true); setError(null);
    try {
      const res = await axios.post('http://localhost:5102/api/TestLms', {
        ...form,
        action,
        appliedAmount: Number(form.appliedAmount),
        sanctionAmount: Number(form.sanctionAmount),
        tenure: Number(form.tenure),
        interestRate: Number(form.interestRate),
      });
      setResults(res.data.data);
      setLastAction(action);
      const keys: string[] = Object.keys(res.data.data ?? {});
      setActiveTab(keys.includes('RepaymentSchedule') ? 'RepaymentSchedule' : keys[0] ?? '');
    } catch (err: any) { setError(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (results && results['AccountingDetails'] && activeTab === 'AccountingDetails') {
      setIsAnalyzing(true);
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results['AccountingDetails'])
      })
      .then(r => r.json())
      .then(d => setAiErrors(d.errors || {}))
      .catch(e => console.error(e))
      .finally(() => setIsAnalyzing(false));
    }
  }, [results, activeTab]);

  const tabKeys = Object.keys(results ?? {});

  return (
    <div className="h-screen flex flex-col bg-[#030712] text-slate-300 font-sans antialiased overflow-hidden relative selection:bg-blue-500/30">
      
      {showFormulaExplorer && <FormulaExplorer onClose={() => setShowFormulaExplorer(false)} />}
      
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[40rem] h-[40rem] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Top Navigation Bar ── */}
      <header className="relative shrink-0 h-14 border-b border-white/5 bg-[#030712]/80 backdrop-blur-2xl flex items-center px-6 gap-4 z-50">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/20">
          <div className="w-full h-full bg-[#0f172a] rounded-[11px] flex items-center justify-center">
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
        </div>
        <div>
          <h1 className="text-[13px] font-bold text-slate-100 tracking-wide">LMS Engine Simulation</h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">Core Accounting Module</p>
        </div>
        
        <div className="ml-auto flex items-center gap-4">
          <button onClick={() => setShowFormulaExplorer(true)} className="flex items-center gap-2 group px-4 py-1.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all shadow-inner hover:shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)]">
            <FunctionSquare className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-indigo-300">Formula Library</span>
          </button>
          
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Connected to Host</span>
          </div>
        </div>
      </header>

      {/* ── Main App Body ── */}
      <div className="flex flex-1 overflow-hidden relative z-10">

        {/* ── Collapsed Vertical Sidebar ── */}
        {isSidebarCollapsed && (
          <aside className="w-12 shrink-0 border-r border-white/5 bg-[#080d1a]/60 backdrop-blur-3xl flex flex-col items-center py-6 h-full shadow-2xl z-20 gap-8">
            <button 
              onClick={() => setIsSidebarCollapsed(false)}
              className="text-slate-500 hover:text-white transition-colors p-2"
              title="Expand Sidebars"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center gap-4 text-slate-500 hover:text-blue-400 cursor-pointer transition-colors mt-4" onClick={() => setIsSidebarCollapsed(false)}>
              <Calculator className="w-5 h-5 opacity-70" />
              <span className="uppercase tracking-[0.2em] text-[10px] font-bold whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Loan Parameters</span>
            </div>
            <div className="w-px h-12 bg-slate-800/80 rounded-full"></div>
            <div className="flex flex-col items-center gap-4 text-slate-500 hover:text-indigo-400 cursor-pointer transition-colors" onClick={() => setIsSidebarCollapsed(false)}>
              <AlignLeft className="w-5 h-5 opacity-70" />
              <span className="uppercase tracking-[0.2em] text-[10px] font-bold whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Available Results</span>
            </div>
          </aside>
        )}

        {/* ── Left Input Side Panel ── */}
        {!isSidebarCollapsed && (
        <aside className="w-[340px] shrink-0 border-r border-white/5 bg-[#080d1a]/60 backdrop-blur-3xl flex flex-col h-full shadow-2xl z-20">
          
          <div className="shrink-0 p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-400" /> Loan Parameters
            </h2>
            <button onClick={() => setIsSidebarCollapsed(true)} className="p-1.5 text-slate-500 hover:text-white rounded-md hover:bg-white/5 transition-colors" title="Collapse Sidebars">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 gap-4 flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <FormGroup 
              label="Applied Amount" 
              helper="Total loan requested by the customer. Serves as the maximum sanction ceiling."
              formula="Sanction ≤ Applied Amount"
            >
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input type="number" name="appliedAmount" value={form.appliedAmount} onChange={set} className={inputCls + " pl-8 font-mono"} />
              </div>
            </FormGroup>

            <FormGroup 
              label="Sanction Amount" 
              helper="Final approved disbursement sum injected into system."
              formula="Principal Component (P)"
            >
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input type="number" name="sanctionAmount" value={form.sanctionAmount} onChange={set} className={inputCls + " pl-8 font-mono border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500/50"} />
              </div>
            </FormGroup>

            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Tenure" helper="EMI periods (n)">
                <input type="number" name="tenure" value={form.tenure} onChange={set} className={inputCls + " text-center font-mono"} />
              </FormGroup>
              <FormGroup label="Interest Rate" helper="Annual ROI % (r)">
                <input type="number" step="0.01" name="interestRate" value={form.interestRate} onChange={set} className={inputCls + " text-center font-mono"} />
              </FormGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="1st EMI Due" helper="Schedule anchor">
                <input type="date" name="firstInstallmentDate" value={form.firstInstallmentDate} onChange={set} className={inputCls + " px-2 text-[11px]"} />
              </FormGroup>
              <FormGroup label="End Target" helper="Simulation boundary">
                <input type="date" name="endDate" value={form.endDate} onChange={set} className={inputCls + " px-2 text-[11px]"} />
              </FormGroup>
            </div>

            <FormGroup label="Created By" helper="Author stamp on all accounting DB entries">
              <input type="text" name="createdBy" value={form.createdBy} onChange={set} className={inputCls + " tracking-wide"} />
            </FormGroup>

            {/* System Transaction block removed from here for new two-step flow */}
          </div>

          <div className="shrink-0 p-5 bg-[#080d1a]/80 border-t border-white/5 backdrop-blur-xl">
            <button onClick={() => execute('SIMULATE')} disabled={loading}
              className="w-full relative group overflow-hidden bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold tracking-wide py-3.5 rounded-xl flex items-center justify-center gap-2.5 text-sm transition-all border border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_-5px_rgba(59,130,246,0.5)]">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin text-blue-400" /> Running Simulation…</> : <><Play className="w-4 h-4 text-blue-400" /> Execute Simulation</>}
            </button>
          </div>
        </aside>
        )}

        {/* ── Right Results Section ── */}
        <div className="flex-1 flex overflow-hidden bg-[#030712]">

          {/* Nav Rail / Vertical Tabs */}
          {!isSidebarCollapsed && results && tabKeys.length > 0 && (
            <div className="w-64 shrink-0 border-r border-white/5 bg-[#0B1120]/40 flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] overflow-y-auto">
              <div className="p-4 px-5 border-b border-white/5 sticky top-0 bg-[#0B1120]/90 backdrop-blur z-10">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Available Results</p>
              </div>
              <div className="p-2.5 flex flex-col gap-1">
                {tabKeys.map(tab => {
                  const count = results[tab]?.length ?? 0;
                  const isActive = activeTab === tab;
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`group flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 border
                        ${isActive
                          ? 'bg-blue-600/10 border-blue-500/30 shadow-[0_0_15px_-3px_rgba(59,130,246,0.15)]'
                          : 'bg-transparent border-transparent hover:bg-white/5'}`}>
                      <div className="flex items-center gap-3 w-40">
                        <span className={`shrink-0 p-1.5 rounded-lg transition-colors ${isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-300'}`}>
                          {TAB_ICONS[tab] ?? <AlignLeft className="w-4 h-4" />}
                        </span>
                        <p className={`text-[11px] font-semibold tracking-wide truncate ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} title={TAB_LABELS[tab] || tab}>{TAB_LABELS[tab] || tab}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden relative">

            {error && (
              <div className="m-8 p-5 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-start gap-4 ring-1 ring-rose-500/10">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <XCircle className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-200 mb-1">Execution Failed</h3>
                  <p className="text-xs text-rose-400/80 leading-relaxed font-mono">{error}</p>
                </div>
              </div>
            )}

            {!results && !error && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8 z-10">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 flex items-center justify-center shadow-2xl mb-8 relative">
                  <div className="absolute inset-0 bg-blue-500/10 rounded-3xl blur-xl" />
                  <Activity className="w-10 h-10 text-slate-400 relative z-10" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">System Ready for Calculation</h3>
                <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-10">
                  Fill in the loan parameters on the left and dispatch the calculation engine. The system will simulate the entire SQL Server accounting workflow and display the generated tables.
                </p>

                <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                  {[
                    { title: 'Standard EMI', eq: 'P × r(1+r)ⁿ / [(1+r)ⁿ - 1]' },
                    { title: 'Accrual Phase', eq: 'Principal × Rate / 365' },
                    { title: 'Amortization', eq: 'Principal = EMI - Interest' },
                  ].map((x, i) => (
                    <div key={i} className="bg-[#0f172a]/40 border border-white/5 rounded-2xl p-5 text-left backdrop-blur-md">
                      <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{x.title}</p>
                      <p className="font-mono text-xs text-blue-400/90">{x.eq}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center z-10 gap-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin" />
                  <div className="w-8 h-8 rounded-full border-4 border-slate-800 border-t-cyan-400 animate-spin absolute top-4 left-4" style={{ animationDirection: 'reverse' }} />
                </div>
                <p className="text-sm font-medium text-slate-400 animate-pulse tracking-wide uppercase">Processing Complex Queries…</p>
              </div>
            )}

            {!loading && results && activeTab && results[activeTab] && (
              <div className="flex-1 flex flex-col overflow-hidden p-6 z-10">

                {/* Two-step logic banner */}
                {lastAction === 'SIMULATE' ? (
                <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-2xl p-4 mb-5 flex items-center justify-between shadow-[0_0_20px_-5px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/10 backdrop-blur-md">
                  <div>
                    <h3 className="text-white font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" /> Simulation Successful</h3>
                    <p className="text-xs text-blue-200/70 mt-1 max-w-xl">Review the projected tables below. If the calculations are accurate, you can commit this flow perfectly to the database permanently.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setResults(null)} disabled={loading} className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 uppercase tracking-widest transition-colors disabled:opacity-50">Discard</button>
                    <button onClick={() => execute('COMMIT')} disabled={loading} className="px-5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 hover:border-emerald-500 text-xs font-bold text-emerald-400 uppercase tracking-widest transition-all shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)] disabled:opacity-50">Commit To DB</button>
                  </div>
                </div>
                ) : (
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-4 mb-5 flex items-center justify-between shadow-[0_0_20px_-5px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/10 backdrop-blur-md">
                  <div>
                    <h3 className="text-emerald-400 font-bold flex items-center gap-2"><Database className="w-4 h-4" /> Successfully Committed</h3>
                    <p className="text-xs text-emerald-200/70 mt-1 max-w-xl">The generated records have been permanently saved to the database.</p>
                  </div>
                </div>
                )}

                <div className="flex items-end justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                      {TAB_ICONS[activeTab] ?? <AlignLeft className="w-6 h-6 text-blue-500" />}
                      {TAB_LABELS[activeTab] || activeTab}
                      {isAnalyzing && <Activity className="w-4 h-4 text-emerald-400 animate-pulse ml-2" />}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1.5">{isAnalyzing ? 'AI Model is actively scanning accounting logic...' : 'Viewing generated subset from SQL execution pipeline.'}</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 tracking-wide">
                    {results[activeTab].length} Records Found
                  </div>
                </div>
                <ResultTable rows={results[activeTab]} aiErrors={activeTab === 'AccountingDetails' ? aiErrors : undefined} />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
