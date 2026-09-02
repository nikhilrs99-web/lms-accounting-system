import React, { useState } from 'react';
import axios from 'axios';
import { 
  Calculator, 
  IndianRupee, 
  Activity,
  XCircle,
  Info,
  Server,
  Database,
  RefreshCw,
  Play
} from 'lucide-react';

/* --- Helper Components --- */

const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
};

// Custom interactive Tooltip using Tailwind group-hover
const Tooltip = ({ children, content }: { children: React.ReactNode, content: React.ReactNode }) => {
  return (
    <div className="relative group inline-flex items-center">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-64">
        <div className="bg-slate-800 text-slate-200 text-xs rounded-xl p-3 shadow-2xl border border-slate-700">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-800"></div>
        </div>
      </div>
    </div>
  );
};

const InputLabel = ({ title, tooltip }: { title: string, tooltip: string }) => (
  <div className="flex items-center justify-between mb-1.5">
    <label className="text-sm font-medium text-slate-300">{title}</label>
    <Tooltip content={<p>{tooltip}</p>}>
      <Info className="w-4 h-4 text-slate-500 hover:text-brand-400 transition-colors cursor-help" />
    </Tooltip>
  </div>
);

/* --- Main Application --- */

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('RepaymentSchedule');

  const [formData, setFormData] = useState({
    appliedAmount: '',
    sanctionAmount: '',
    tenure: '',
    interestRate: '',
    firstInstallmentDate: '',
    endDate: '',
    createdBy: '',
    transactionMode: 'ROLLBACK'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    try {
      // Point to ASP.NET Core API
      const res = await axios.post('http://localhost:5200/api/TestLms', {
        ...formData,
        appliedAmount: Number(formData.appliedAmount),
        sanctionAmount: Number(formData.sanctionAmount),
        tenure: Number(formData.tenure),
        interestRate: Number(formData.interestRate),
      });
      setResults(res.data.data);
      if (res.data.data && Object.keys(res.data.data).length > 0) {
        setActiveTab("RepaymentSchedule"); // Default to a meaningful tab
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderTable = (dataArray: any[], tableName: string) => {
    if (!dataArray || dataArray.length === 0) return <div className="p-8 text-center text-slate-500">No records generated for {tableName}</div>;
    
    const columns = Object.keys(dataArray[0]);

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-slate-800">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-4 py-3 font-medium whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataArray.map((row, idx) => (
              <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                {columns.map(col => {
                  let val = row[col];
                  // If it's a numeric amount column, format as INR
                  const isAmount = col.toLowerCase().includes('amount') || col.toLowerCase().includes('balance') || col.toLowerCase().includes('principal') || col.toLowerCase().includes('interest');
                  
                  if (isAmount && typeof val === 'number') {
                    val = formatINR(val);
                  } else if (typeof val === 'string' && val.includes('T00:00:00')) {
                    val = val.split('T')[0]; // Format dates simply
                  }

                  return (
                    <td key={col} className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                      {val?.toString() || '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 md:p-8 flex flex-col items-center">
      <div className="max-w-[1600px] w-full mt-4">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-3">
              <Database className="w-8 h-8 text-brand-400" />
              LMS Engine Testing Platform
            </h1>
            <p className="text-slate-400 mt-2">Deep detail interface for Core Accounting workflows</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 glass-panel">
            <Server className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-slate-300 font-medium">ASP.NET Core Connected</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Left Panel: Inputs */}
          <div className="xl:col-span-3 space-y-6">
            <div className="glass-panel p-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                <Calculator className="w-5 h-5 text-brand-400" />
                Loan Parameters
              </h2>

              <div className="space-y-5">
                <div>
                  <InputLabel 
                    title="Applied Amount" 
                    tooltip="The total amount requested by the customer. Used as the base for eligibility." 
                  />
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input type="number" name="appliedAmount" value={formData.appliedAmount} onChange={handleChange} className="input-field pl-10" />
                  </div>
                </div>

                <div>
                  <InputLabel 
                    title="Sanction Amount" 
                    tooltip="The final amount approved for disbursement. Formula: Sanctioned ≤ Applied Amount based on strict credit limits." 
                  />
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input type="number" name="sanctionAmount" value={formData.sanctionAmount} onChange={handleChange} className="input-field pl-10" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <InputLabel 
                      title="Tenure (Months)" 
                      tooltip="Total number of EMI installations across the lifetime of the loan." 
                    />
                    <input type="number" name="tenure" value={formData.tenure} onChange={handleChange} className="input-field" />
                  </div>
                  <div>
                    <InputLabel 
                      title="Interest Rate (%)" 
                      tooltip="Annualized rate of interest. Applied reducing balance method in EOD accruals." 
                    />
                    <input type="number" step="0.01" name="interestRate" value={formData.interestRate} onChange={handleChange} className="input-field" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <InputLabel 
                      title="1st Installment" 
                      tooltip="The billing date for the primary Repayment Schedule cycle generation." 
                    />
                    <input type="date" name="firstInstallmentDate" value={formData.firstInstallmentDate} onChange={handleChange} className="input-field text-sm" />
                  </div>
                  <div>
                    <InputLabel 
                      title="EOD End Date" 
                      tooltip="The Target Date to stop the batch EOD engine loop." 
                    />
                    <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="input-field text-sm" />
                  </div>
                </div>

                <div>
                  <InputLabel 
                    title="Created By" 
                    tooltip="The username executing or owning this transaction." 
                  />
                  <input type="text" name="createdBy" value={formData.createdBy} onChange={handleChange} className="input-field" placeholder="Enter username" />
                </div>

                <hr className="border-slate-800" />

                <div>
                  <InputLabel 
                    title="Transaction Mode" 
                    tooltip="COMMIT will persist changes in SQL Server, ROLLBACK will dump changes after final queries execute (perfect for isolated testing)." 
                  />
                  <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                    <button 
                      className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${formData.transactionMode === 'ROLLBACK' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500'}`}
                      onClick={() => setFormData({ ...formData, transactionMode: 'ROLLBACK' })}
                    >
                      ROLLBACK
                    </button>
                    <button 
                      className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${formData.transactionMode === 'COMMIT' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500'}`}
                      onClick={() => setFormData({ ...formData, transactionMode: 'COMMIT' })}
                    >
                      COMMIT
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleExecute}
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  {loading ? 'Executing Engine...' : 'Execute Accounting Engine'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Results */}
          <div className="xl:col-span-9">
            <div className="glass-panel h-full min-h-[600px] flex flex-col rounded-xl overflow-hidden">
              
              {error && (
                <div className="m-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 mt-0.5" />
                  <div className="text-rose-200 text-sm">
                    <strong>Execution Error:</strong> {error}
                  </div>
                </div>
              )}

              {!results && !error && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-12 text-center">
                  <Activity className="w-16 h-16 mb-4 opacity-20" />
                  <h3 className="text-xl font-medium text-slate-300">Awaiting Submissions</h3>
                  <p className="mt-2 text-sm max-w-sm">Configure your loan parameters on the left and hit Execute to trigger the stored procedure and visualize the accounting tables here.</p>
                </div>
              )}

              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                  <RefreshCw className="w-12 h-12 mb-4 animate-spin text-brand-500" />
                  <p>Processing Accounting Stored Procedures...</p>
                </div>
              )}

              {results && !loading && (
                <div className="flex flex-col h-full">
                  <div className="bg-slate-900 border-b border-slate-800 p-4 pb-0 flex gap-2 overflow-x-auto custom-scrollbar">
                    {Object.keys(results).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                          activeTab === tab 
                          ? 'border-brand-500 text-brand-400' 
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  
                  <div className="p-6 flex-1 overflow-auto">
                    {activeTab && results[activeTab] && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                         {renderTable(results[activeTab], activeTab)}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
