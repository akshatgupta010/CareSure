import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, AlertTriangle, BarChart3, Bell, CheckCircle2, ClipboardCheck,
  Clock3, FileCheck2, FileText, HelpCircle, Home, LogOut, Menu, Search,
  Settings, ShieldCheck, UploadCloud, X, ChevronRight, BrainCircuit,
  UserRound, LockKeyhole, Stethoscope
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import Papa from "papaparse";
import { loadSyntheaCsv, sendClaimsToBackend } from "./utils/csvParser";
import "./audit.css";

const claim = {
  id: "CLM-2026-1041", patient: "Priya Singh", patientId: "PT-20981",
  hospital: "Apollo Medical Center", admission: "24 Sep 2026", discharge: "28 Sep 2026",
  diagnosis: "Acute appendicitis", procedure: "Appendectomy", amount: "₹2,45,800",
  risk: 72, status: "Review Required", completeness: 89, consistency: 92
};

const claims = [
  { id:"CLM-2026-1042", patient:"Raj Sharma", hospital:"CityCare Hospital", amount:"₹84,500", submitted:"Today", risk:18, validation:"Passed", status:"Low Risk" },
  claim,
  { id:"CLM-2026-1040", patient:"Amit Verma", hospital:"Metro Hospital", amount:"₹1,20,400", submitted:"Yesterday", risk:64, validation:"Warnings", status:"Review Required" },
  { id:"CLM-2026-1039", patient:"Neha Gupta", hospital:"CarePlus Hospital", amount:"₹56,700", submitted:"Yesterday", risk:11, validation:"Passed", status:"Low Risk" }
];

function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const nav = [
    ["/dashboard","Dashboard",Home], ["/claims","Claims",FileText], ["/new-claim","New Claim",UploadCloud],
    ["/review","Review Queue",ClipboardCheck], ["/analytics","Analytics",BarChart3], ["/settings","Settings",Settings]
  ];
  return <div className="app-shell">
    <aside className={"sidebar " + (open ? "mobile-open" : "")}>
      <div className="brand"><div className="brand-icon"><Stethoscope size={21}/></div><div><b>CareSure</b><small>Claim Intelligence</small></div><button className="icon-btn close-mobile" onClick={()=>setOpen(false)}><X/></button></div>
      <nav>{nav.map(([path,label,Icon])=><Link key={path} to={path} onClick={()=>setOpen(false)} className={location.pathname===path || (path==="/claims" && location.pathname.startsWith("/claim/")) ? "active" : ""}><Icon size={19}/><span>{label}</span></Link>)}</nav>
      <div className="sidebar-bottom"><div className="privacy"><ShieldCheck size={18}/><div><b>Secure Processing</b><span>Access controlled</span></div></div><Link to="/"><LogOut size={18}/><span>Sign out</span></Link></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={()=>setOpen(true)}><Menu/></button><div className="search"><Search size={18}/><input placeholder="Search claims, patients, hospitals..." /></div><div className="top-actions"><button className="icon-btn"><Bell size={19}/><i className="dot"/></button><button className="icon-btn"><HelpCircle size={19}/></button><div className="profile"><div className="avatar">AK</div><div><b>Admin Reviewer</b><span>Claims Team</span></div></div></div></header>
      <section className="page">{children}</section>
    </main>
  </div>
}

function Login(){
  const nav=useNavigate();
  return <div className="login-page"><div className="login-visual"><div className="login-brand"><div className="brand-icon"><Stethoscope/></div><b>CareSure</b></div><div className="visual-copy"><span className="eyebrow">AI-ASSISTED HEALTHCARE</span><h1>Intelligent validation.<br/><em>Human-controlled decisions.</em></h1><p>Organize claim information, surface validation issues, and prioritize reviewer attention with explainable AI signals.</p><div className="visual-card"><ShieldCheck/><div><b>Secure claim processing</b><span>AI recommendations only. Final decisions stay with human reviewers.</span></div></div></div></div><div className="login-card"><div className="mobile-logo"><div className="brand-icon"><Stethoscope/></div><b>CareSure</b></div><span className="eyebrow">REVIEWER PORTAL</span><h2>Welcome back</h2><p>Sign in to your claim assurance workspace.</p><label>Email<input defaultValue="reviewer@caresure.demo" type="email"/></label><label>Password<input defaultValue="••••••••" type="password"/></label><div className="login-row"><label className="check"><input type="checkbox" defaultChecked/> Remember me</label><a href="#">Forgot password?</a></div><button className="primary wide" onClick={()=>nav("/dashboard")}>Sign in <ChevronRight size={18}/></button><button className="secondary wide" onClick={()=>nav("/dashboard")}>Use demo account</button><small className="disclaimer"><LockKeyhole size={14}/> AI-assisted validation — final decisions remain with human reviewers.</small></div></div>
}

function Header({title, subtitle, action}){return <div className="page-head"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>}
function Badge({children,type="neutral"}){return <span className={"badge "+type}>{children}</span>}
function Risk({value}){return <span className={"risk risk-"+(value>=70?"high":value>=40?"medium":"low")}>{value}/100</span>}
function Kpi({icon:Icon,label,value,trend,text}){return <div className="card kpi"><div className="kpi-top"><div className="kpi-icon"><Icon size={20}/></div><span className="trend">↗ {trend}</span></div><strong>{value}</strong><b>{label}</b><small>{text}</small></div>}

function Dashboard(){
 const [syntheaClaims, setSyntheaClaims] = useState([]);

 useEffect(() => {
   async function fetchDataset() {
    const csvUrl = new URL('./data/conditions.csv', import.meta.url).href;
    const data = await loadSyntheaCsv(csvUrl);
    setSyntheaClaims(data);
  }
  fetchDataset();
 }, []);

 const totalCount = syntheaClaims.length > 0 ? syntheaClaims.length : "1,284";
 const pie=[{name:"Low Risk",value:81},{name:"Review Required",value:13},{name:"High Risk Signals",value:6}];

 return <Layout><Header title="Claims Assurance Dashboard" subtitle={`Monitor claim validation, risk signals, and reviewer workload. (${syntheaClaims.length} Synthea rows loaded)`} action={<Link className="primary" to="/new-claim"><UploadCloud size={17}/> New Claim</Link>}/>
 <div className="kpis"><Kpi icon={FileText} value={totalCount} label="Total Claims" trend="8.4%" text="Compared with last month"/><Kpi icon={Clock3} value="86" label="Pending Review" trend="3.1%" text="Claims awaiting attention"/><Kpi icon={CheckCircle2} value="1,037" label="Low-Risk Claims" trend="6.8%" text="No additional review signal"/><Kpi icon={AlertTriangle} value="161" label="Review Required" trend="4.2%" text="Need human assessment"/><Kpi icon={Activity} value="4m 32s" label="Average Processing Time" trend="12%" text="Faster than previous period"/></div>
 <div className="grid-2"><div className="card chart-card"><div className="card-head"><div><h3>Claim Risk Overview</h3><p>Current portfolio distribution</p></div><button className="ghost">Last 30 days</button></div><div className="donut-wrap"><ResponsiveContainer width="52%" height={230}><PieChart><Pie data={pie} innerRadius={65} outerRadius={92} dataKey="value" stroke="none">{pie.map((_,i)=><Cell key={i}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="legend">{pie.map((x,i)=><div key={x.name}><i className={"legend-dot d"+i}/><span>{x.name}</span><b>{x.value}%</b></div>)}<small>Risk scores indicate the need for additional review and do not represent confirmed fraud.</small></div></div></div><div className="card insight-card"><div className="card-head"><div><h3>AI Validation Insights</h3><p>Hybrid decision-support signals</p></div><BrainCircuit size={23}/></div><div className="signal"><span>Rules-only signal</span><b>25 pts</b></div><div className="signal"><span>ML risk signal</span><b>28 pts</b></div><div className="signal"><span>Anomaly signal</span><b>19 pts</b></div><div className="hybrid"><span>Hybrid risk score</span><strong>72 / 100</strong></div><p className="note">Deterministic rules, ML risk signals, and anomaly detection are combined to prioritize claims for human review.</p></div></div>
 <div className="card table-card"><div className="card-head"><div><h3>Recent Claims</h3><p>Latest submitted claims and validation status</p></div><Link to="/claims" className="text-link">View all claims →</Link></div><ClaimTable compact/></div></Layout>
}

function ClaimTable({compact=false}){
 const nav=useNavigate();
 return <div className="table-scroll"><table><thead><tr><th>Claim ID</th><th>Patient</th><th>Hospital</th><th>Amount</th><th>Submitted</th><th>Risk Score</th><th>Validation</th><th>Status</th><th>Action</th></tr></thead><tbody>{claims.map(c=><tr key={c.id}><td><b>{c.id}</b></td><td>{c.patient}</td><td>{c.hospital}</td><td>{c.amount}</td><td>{c.submitted}</td><td><Risk value={c.risk}/></td><td><Badge type={c.validation==="Passed"?"success":"warning"}>{c.validation}</Badge></td><td><Badge type={c.status==="Low Risk"?"success":"warning"}>{c.status}</Badge></td><td><button className="table-action" onClick={()=>nav("/claim/"+c.id)}>{c.status==="Low Risk"?"View":"Review"} <ChevronRight size={14}/></button></td></tr>)}</tbody></table></div>
}

function Claims(){return <Layout><Header title="Claims" subtitle="Search and review submitted insurance claims." action={<Link className="primary" to="/new-claim"><UploadCloud size={17}/> New Claim</Link>}/><div className="filterbar"><div className="filter-search"><Search size={17}/><input placeholder="Search claim ID or patient..."/></div><select><option>All risk levels</option><option>Low Risk</option><option>Review Required</option></select><select><option>All validation states</option><option>Passed</option><option>Warnings</option></select></div><div className="card table-card"><ClaimTable/></div></Layout>}

function NewClaim({onValidationComplete}){
 const nav=useNavigate();
 const [processing,setProcessing]=useState(false);
 const [csvFile,setCsvFile]=useState(null);
 const [error,setError]=useState("");

 const handleFileUpload=(event)=>{
  setCsvFile(event.target.files?.[0] ?? null);
  setError("");
 };

 const handleValidation=()=>{
  if(!csvFile){
   setError("Choose a claims CSV file before starting validation.");
   return;
  }

  setProcessing(true);
  setError("");
  Papa.parse(csvFile,{
   header:true,
   skipEmptyLines:true,
   complete:async(results)=>{
    try{
     if(results.errors.length) throw new Error("Invalid CSV format.");
     if(!results.data.length) throw new Error("The CSV file contains no claim records.");

     const resultsFromBackend=await sendClaimsToBackend(results.data);
     onValidationComplete(resultsFromBackend);
     nav("/review");
    }catch(err){
     console.error("Claim validation error:",err);
     setError(err.message==="Invalid CSV format."
      ? err.message
      : `Failed to process claims with backend: ${err.message}`);
     setProcessing(false);
    }
   },
   error:(err)=>{
    console.error("CSV parse error:",err);
    setError("Invalid CSV format.");
    setProcessing(false);
   }
  });
 };

 if(processing) return <Processing/>;
 return <Layout><Header title="Submit New Claim" subtitle="Enter claim information and upload supporting documents."/><div className="stepper">{["Claim Information","Upload Documents","Extract Information","Validate","Risk Assessment"].map((s,i)=><div className={i===0?"step active":"step"} key={s}><span>{i+1}</span><b>{s}</b></div>)}</div><div className="form-grid"><div className="card form-card"><div className="card-head"><div><h3>Claim Information</h3><p>Provide the core details for this claim.</p></div><FileCheck2/></div><div className="fields">{[["Claim ID","CLM-2026-1041"],["Patient Name","Priya Singh"],["Patient ID","PT-20981"],["Hospital Name","Apollo Medical Center"],["Admission Date","24 Sep 2026"],["Discharge Date","28 Sep 2026"],["Diagnosis","Acute appendicitis"],["Procedure","Appendectomy"],["Claim Amount","₹2,45,800"],["Policy Number","POL-882910"],["Insurance Provider","HealthSecure India"]].map(([l,v])=><label key={l}>{l}<input defaultValue={v}/></label>)}</div></div><div className="card upload-card"><div className="card-head"><div><h3>Claims CSV</h3><p>Upload claim records for backend validation.</p></div><UploadCloud/></div><div className="upload-box"><UploadCloud size={30}/><b>Select a claims CSV file</b><span>CSV files only</span><input type="file" accept=".csv,text/csv" onChange={handleFileUpload}/></div>{csvFile&&<div className="file-row"><div className="file-icon"><FileText size={18}/></div><div><b>{csvFile.name}</b><span>Ready to validate</span></div><CheckCircle2 className="success-icon" size={18}/></div>}{error&&<p className="audit-error" role="alert">{error}</p>}<button className="primary wide" disabled={!csvFile} onClick={handleValidation}>Start AI Validation <ChevronRight size={18}/></button></div></div></Layout>
}

function Processing(){
 return <Layout><div className="processing"><div className="processing-icon"><BrainCircuit size={34}/></div><span className="eyebrow">REVENUE ASSURANCE ENGINE</span><h1>Analyzing Claims...</h1><p>Claim records are being sent to the backend for audit. This may take a moment.</p><div className="pipeline"><div className="pipe current"><span><Activity size={18}/></span><b>Checking claim records and discrepancies</b><small>Running</small></div></div><small className="processing-note">Final claim decisions remain with human reviewers.</small></div></Layout>
}
function Validation(){
 return <Layout><Header title={"Claim "+claim.id} subtitle="AI-assisted validation and human review workspace." action={<Link className="secondary" to="/review"><ClipboardCheck size={17}/> Review Queue</Link>}/><div className="claim-summary"><div><span>Patient</span><b>{claim.patient}</b></div><div><span>Hospital</span><b>{claim.hospital}</b></div><div><span>Claim Amount</span><b>{claim.amount}</b></div><div><span>Submitted</span><b>30 Sep 2026</b></div></div><div className="risk-hero card"><div className="risk-circle"><div><strong>{claim.risk}</strong><span>/100</span></div></div><div><span className="eyebrow">AI-ASSISTED RISK SCORE</span><h2>Review Required</h2><p>This score identifies claims that may require additional review; it does not establish fraud or determine the final claim outcome.</p></div><Badge type="warning">Human Review Pending</Badge></div><div className="validation-grid"><div className="card"><div className="card-head"><div><h3>Validation Summary</h3><p>Key assurance checks</p></div></div><div className="summary-cards"><Summary title="Document Completeness" value="8 / 9" status="Warning"/><Summary title="Data Consistency" value="92%" status="Passed"/><Summary title="Policy Validation" value="2 Issues" status="Warning"/><Summary title="Anomaly Detection" value="Elevated" status="Review"/></div></div><div className="card"><div className="card-head"><div><h3>Risk Score Breakdown</h3><p>Assistance signals</p></div></div><div className="bars"><BarLine label="Rule Validation" value={25}/><BarLine label="ML Risk Signal" value={28}/><BarLine label="Anomaly Signal" value={19}/><div className="total"><span>Total</span><b>72 / 100</b></div></div></div></div><div className="validation-grid"><div className="card"><div className="card-head"><h3>Rule-Based Validation</h3><span className="text-link">View all rules</span></div><ul className="checks"><li className="pass"><CheckCircle2/> Patient details match across documents</li><li className="pass"><CheckCircle2/> Admission and discharge dates are consistent</li><li className="pass"><CheckCircle2/> Claim amount matches hospital bill</li><li className="warn"><AlertTriangle/> Missing diagnostic report</li><li className="pass"><CheckCircle2/> Policy number is valid</li><li className="warn"><AlertTriangle/> Procedure requires additional documentation</li><li className="pass"><CheckCircle2/> Required claim fields completed</li></ul></div><div className="card"><div className="card-head"><h3>Extracted Information</h3><Badge type="success">94% Confidence</Badge></div><div className="extract-grid">{[["Patient Name","Priya Singh"],["Patient ID","PT-20981"],["Hospital","Apollo Medical Center"],["Admission","24 Sep 2026"],["Discharge","28 Sep 2026"],["Claim Amount","₹2,45,800"],["Diagnosis","Acute appendicitis"],["Procedure","Appendectomy"],["Length of Stay","4 days"]].map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b><small>94% confidence</small></div>)}</div></div></div><div className="validation-grid"><Anomaly/><Reasons/><ReviewPanel/></div></Layout>
}
function Summary({title,value,status}){return <div className="summary-item"><div className="summary-icon">{status==="Passed"?<CheckCircle2/>:<AlertTriangle/>}</div><span>{title}</span><strong>{value}</strong><Badge type={status==="Passed"?"success":"warning"}>{status}</Badge><small>View details →</small></div>}
function BarLine({label,value}){return <div className="bar-line"><div><span>{label}</span><b>{value} pts</b></div><div className="bar"><i style={{width:`${value/40*100}%`}}/></div></div>}
function Anomaly(){return <div className="card anomaly"><div className="card-head"><div><h3>Anomaly Detection</h3><p>Investigation triggers</p></div><AlertTriangle/></div><div className="anomaly-title"><span>Elevated anomaly signal</span><Badge type="warning">Review</Badge></div><p>The claim contains patterns that differ from previously observed claims. These signals should be investigated by a reviewer.</p><ul><li>Claim amount is higher than the recent provider average</li><li>Similar claim detected within a recent period</li><li>Unusual procedure frequency</li><li>Missing supporting document</li></ul><div className="callout"><b>Investigation trigger</b><span>Signals are not proof of wrongdoing.</span></div></div>}
function Reasons(){return <div className="card"><div className="card-head"><div><h3>Why was this claim flagged?</h3><p>Explainable model and rule signals</p></div><HelpCircle/></div>{[["01","Unusual Claim Amount","Claim amount is significantly different from comparable recent claims.","High"],["02","Missing Document","Diagnostic report was not found in the uploaded documents.","Medium"],["03","Similar Claim Pattern","The system found a potentially similar recent claim.","Medium"]].map(r=><div className="reason" key={r[0]}><div className="reason-no">{r[0]}</div><div><b>{r[1]}</b><p>{r[2]}</p><small>Impact: <strong>{r[3]}</strong></small></div></div>)}<small className="muted">These explanations describe model/rule signals and are not proof of wrongdoing.</small></div>}
function ReviewPanel(){const [done,setDone]=useState(false);return <div className="card review-panel"><div className="card-head"><div><h3>Human Review</h3><p>Reviewer-controlled next steps</p></div><UserRound/></div><div className="review-status"><span>Reviewer Status</span><Badge type="warning">{done?"Sent for Further Processing":"Pending Review"}</Badge></div><div className="review-status"><span>Recommended Action</span><b>Review Required</b></div><div className="review-actions"><button className="secondary">Assign Reviewer</button><button className="secondary">Request Documents</button><button className="secondary">Mark for Investigation</button><button className="secondary">Add Note</button><button className="primary" onClick={()=>setDone(true)}>{done?"Completed":"Clear for Further Processing"}</button></div><small className="human-only">Final decision — Human reviewer only</small></div>}

function ReviewQueue({auditResults}){
 const flaggedCount=auditResults.filter(claim=>claim.discrepancies.length>0).length;
 const verifiedCount=auditResults.length-flaggedCount;
 return <Layout><Header title="Human Review Queue" subtitle="Review backend validation results and flagged discrepancies."/><div className="queue-stats"><div className="card"><FileCheck2/><div><b>{auditResults.length}</b><span>Claims Audited</span></div></div><div className="card"><AlertTriangle/><div><b>{flaggedCount}</b><span>Flagged for Review</span></div></div><div className="card"><CheckCircle2/><div><b>{verifiedCount}</b><span>Verified Clean</span></div></div></div>{auditResults.length===0?<div className="card table-card"><p>No claims audited yet.</p></div>:<div className="audit-list">{auditResults.map(claim=><article key={`${claim.patient_id}-${claim.encounter_id}`} className={`audit-card ${claim.risk_level.toLowerCase()}`}><div className="audit-card-header"><div><b>Claim #{claim.claim_id}</b><p>Patient: {claim.patient_id} | Encounter: {claim.encounter_id}</p></div><Badge type={claim.risk_level==="Low"?"success":"warning"}>Risk: {claim.risk_level}</Badge></div>{claim.discrepancies.length>0?<div className="audit-discrepancies"><h4>Flagged Discrepancies:</h4><ul>{claim.discrepancies.map((discrepancy,index)=><li key={`${discrepancy.rule_id}-${index}`}><strong>{discrepancy.reason}</strong><div className="audit-evidence">Evidence: {discrepancy.evidence.join(" | ")}</div></li>)}</ul></div>:<p className="audit-clean">All records cross-verified. Ready for claim generation.</p>}</article>)}</div>}</Layout>
}

function Analytics(){
 const line=[{d:"Sep 24",claims:72},{d:"Sep 25",claims:94},{d:"Sep 26",claims:86},{d:"Sep 27",claims:112},{d:"Sep 28",claims:105},{d:"Sep 29",claims:128},{d:"Sep 30",claims:119}];
 const bars=[{name:"Missing Docs",v:42},{name:"Data Mismatch",v:28},{name:"Policy Issue",v:19},{name:"Unusual Amount",v:35},{name:"Duplicate-like",v:14},{name:"OCR Uncertainty",v:11}];
 return <Layout><Header title="Analytics" subtitle="Operational and validation insights for administrators."/><div className="kpis four"><Kpi icon={FileText} value="1,284" label="Total Claims" trend="8.4%" text="This period"/><Kpi icon={CheckCircle2} value="1,198" label="Claims Reviewed" trend="6.2%" text="Completed reviews"/><Kpi icon={Clock3} value="4m 32s" label="Avg Processing Time" trend="12%" text="Processing speed"/><Kpi icon={AlertTriangle} value="12.5%" label="Review Rate" trend="2.1%" text="Claims needing review"/></div><div className="grid-2"><div className="card chart-card"><div className="card-head"><div><h3>Claims Processed Over Time</h3><p>Daily submitted claim volume</p></div></div><ResponsiveContainer width="100%" height={290}><AreaChart data={line}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="d"/><YAxis/><Tooltip/><Area type="monotone" dataKey="claims" fill="var(--blue-soft)" stroke="var(--blue)" fillOpacity={1}/></AreaChart></ResponsiveContainer></div><div className="card chart-card"><div className="card-head"><div><h3>Validation Issue Categories</h3><p>Current period signals</p></div></div><ResponsiveContainer width="100%" height={290}><BarChart data={bars} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis type="category" dataKey="name" width={100}/><Tooltip/><Bar dataKey="v" fill="var(--blue)" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></div></div></Layout>
}
function SettingsPage(){return <Layout><Header title="Settings" subtitle="Configure reviewer workspace and validation controls."/><div className="settings-grid">{["Profile","Organization","Notification Preferences","Risk Thresholds","Validation Rules","Data Privacy","Audit Logs"].map((s,i)=><div className="card setting-card" key={s}><div className="setting-icon">{i===3?<Activity/>:i===5?<ShieldCheck/>:<Settings/>}</div><div><h3>{s}</h3><p>{i===3?"Configure visual risk bands for reviewer prioritization.":i===5?"Secure handling of sensitive healthcare data.":"Manage "+s.toLowerCase()+" for this prototype."}</p></div><ChevronRight/></div>)}</div><div className="card thresholds"><div className="card-head"><div><h3>Risk Thresholds</h3><p>Visual prototype settings</p></div><Badge type="warning">Prototype</Badge></div><div className="threshold-row"><span>Low Risk</span><b>0–39</b></div><div className="threshold-row"><span>Review Required</span><b>40–69</b></div><div className="threshold-row"><span>High Risk Signal</span><b>70–100</b></div><div className="callout"><b>Threshold changes should be validated before production use.</b></div></div></Layout>}

export default function App(){
 const [auditResults,setAuditResults]=useState([]);
 return <Routes><Route path="/" element={<Login/>}/><Route path="/dashboard" element={<Dashboard/>}/><Route path="/claims" element={<Claims/>}/><Route path="/new-claim" element={<NewClaim onValidationComplete={setAuditResults}/>}/><Route path="/claim/:id" element={<Validation/>}/><Route path="/review" element={<ReviewQueue auditResults={auditResults}/>}/><Route path="/analytics" element={<Analytics/>}/><Route path="/settings" element={<SettingsPage/>}/><Route path="*" element={<Navigate to="/dashboard" replace/>}/></Routes>
}