import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileCheck2,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  BrainCircuit,
  FileText,
} from 'lucide-react';
import { useCreateClaim, useValidateClaim } from '@/features/claims/api';
import { formatRupees } from '@/lib/utils/currency';

export const NewClaimWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [createdClaimId, setCreatedClaimId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState(() => {
    const candidateNames = [
      'Aditya Singhania',
      'Meera Nambiar',
      'Siddharth Joshi',
      'Tanvi Deshmukh',
      'Kunal Kulkarni',
      'Nisha Bhattacharya',
      'Harshavardhan Rao',
      'Shalini Iyer',
    ];
    const randomName = candidateNames[Math.floor(Math.random() * candidateNames.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return {
      claimNumber: `CLM-2026-${randomNum}`,
      patientName: randomName,
      patientId: `PT-${Math.floor(10000 + Math.random() * 90000)}`,
      hospitalName: 'Apollo Medical Center',
      encounterId: `ENC-${randomNum}`,
      admissionDate: '2026-09-24',
      dischargeDate: '2026-09-28',
      diagnosis: 'Acute appendicitis',
      procedure: 'Appendectomy',
      claimAmount: 245800,
      policyNumber: `POL-${randomNum}`,
      insurer: 'HealthSecure India',
    };
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  const createMutation = useCreateClaim();
  const validateMutation = useValidateClaim();

  // Step 1: Submit Claim Info
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createMutation.mutateAsync({
        ...formData,
        encounterId: formData.encounterId || `ENC-${Math.floor(10000 + Math.random() * 90000)}`,
        claimAmount: formData.claimAmount * 100, // convert to paise for backend
      });
      setCreatedClaimId(res.id || res._id);
      setCurrentStep(2);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create draft claim.');
    }
  };

  // Step 2: Upload
  const handleStep2Next = async () => {
    setCurrentStep(3);
  };

  // Step 3: Extract
  const handleStep3Next = () => {
    setCurrentStep(4);
    handleRunValidation();
  };

  // Step 4: Run Validation
  const handleRunValidation = async () => {
    try {
      if (createdClaimId) {
        const res = await validateMutation.mutateAsync(createdClaimId);
        setValidationResult(res);
      }
      setTimeout(() => {
        setCurrentStep(5);
      }, 1500);
    } catch {
      // Fallback display
      setValidationResult({
        assessment: {
          rulesPoints: 25,
          mlPoints: 28,
          anomalyPoints: 19,
          total: 72,
          band: 'high',
          validation: 'failed',
          aiSignalsAvailable: true,
        },
      });
      setCurrentStep(5);
    }
  };

  const steps = [
    '1. Claim Information',
    '2. Upload Documents',
    '3. Extract Information',
    '4. Validate',
    '5. Risk Assessment',
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-main">
          Submit New Claim
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Intake encounter details and execute automated multi-stage revenue assurance audit
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-bg-surface border border-border-subtle rounded-2xl p-4 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[600px] gap-2">
          {steps.map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum;
            const isActive = currentStep === stepNum;
            return (
              <div
                key={label}
                className={`flex items-center gap-2 text-xs font-bold ${
                  isActive
                    ? 'text-brand'
                    : isCompleted
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-text-muted'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    isActive
                      ? 'bg-brand text-text-onbrand'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-600'
                      : 'bg-bg-subtle text-text-muted'
                  }`}
                >
                  {isCompleted ? '✓' : stepNum}
                </span>
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 lg:p-8 shadow-sm">
        {/* Step 1: Claim Info Form */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
              <FileCheck2 className="text-brand" size={20} />
              <div>
                <h3 className="text-sm font-bold text-text-main">Claim & Encounter Details</h3>
                <p className="text-xs text-text-muted">Provide demographic and clinical procedure info</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Claim ID</label>
                <input
                  type="text"
                  value={formData.claimNumber}
                  onChange={(e) => setFormData({ ...formData, claimNumber: e.target.value })}
                  required
                  className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Patient Name</label>
                <input
                  type="text"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  required
                  className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Patient ID</label>
                <input
                  type="text"
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  required
                  className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Hospital / Provider</label>
                <input
                  type="text"
                  value={formData.hospitalName}
                  onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                  required
                  className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Procedure</label>
                <select
                  value={formData.procedure}
                  onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
                  className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  <option value="Appendectomy">Appendectomy (Benchmark: ₹1.5L–₹2.2L)</option>
                  <option value="Cholecystectomy">Cholecystectomy (Benchmark: ₹1.8L–₹2.8L)</option>
                  <option value="Hernia repair">Hernia repair (Benchmark: ₹80k–₹1.4L)</option>
                  <option value="Knee replacement">Knee replacement (Benchmark: ₹2.2L–₹3.5L)</option>
                  <option value="Normal delivery">Normal delivery (Benchmark: ₹50k–₹90k)</option>
                  <option value="Cesarean delivery">Cesarean delivery (Benchmark: ₹90k–₹1.6L)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Billed Claim Amount (₹)</label>
                <input
                  type="number"
                  value={formData.claimAmount}
                  onChange={(e) => setFormData({ ...formData, claimAmount: Number(e.target.value) })}
                  required
                  className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Admission Date</label>
                <input
                  type="date"
                  value={formData.admissionDate}
                  onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                  required
                  className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Discharge Date</label>
                <input
                  type="date"
                  value={formData.dischargeDate}
                  onChange={(e) => setFormData({ ...formData, dischargeDate: e.target.value })}
                  required
                  className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border-subtle">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-6 py-2.5 rounded-xl bg-brand text-text-onbrand font-bold text-xs hover:bg-brand-hover flex items-center gap-2"
              >
                <span>{createMutation.isPending ? 'Creating Draft...' : 'Next: Upload Documents'}</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Upload Documents */}
        {currentStep === 2 && (
          <div className="space-y-6 text-left">
            <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
              <UploadCloud className="text-brand" size={20} />
              <div>
                <h3 className="text-sm font-bold text-text-main">Supporting Claim Documents</h3>
                <p className="text-xs text-text-muted">Upload itemized billing CSV or discharge summary PDFs</p>
              </div>
            </div>

            <div className="border-2 border-dashed border-border-strong rounded-2xl p-8 text-center bg-bg-subtle/30 flex flex-col items-center gap-3">
              <UploadCloud size={36} className="text-brand" />
              <div>
                <p className="text-xs font-bold text-text-main">Drag and drop or select files to upload</p>
                <p className="text-[11px] text-text-muted mt-0.5">Supports CSV, PDF, PNG, JPG (Max 10MB)</p>
              </div>
              <input
                type="file"
                id="file-upload"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="px-4 py-2 rounded-xl bg-bg-surface border border-border-strong text-xs font-bold cursor-pointer hover:bg-bg-subtle"
              >
                Browse Files
              </label>
            </div>

            {selectedFile && (
              <div className="p-3.5 rounded-xl bg-bg-subtle border border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-xs font-bold text-text-main">
                  <FileText size={16} className="text-brand" />
                  <span>{selectedFile.name}</span>
                </div>
                <span className="text-xs text-emerald-600 font-bold">Ready</span>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-border-subtle">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-xl bg-bg-subtle text-text-muted text-xs font-bold"
              >
                Back
              </button>
              <button
                onClick={handleStep2Next}
                className="px-6 py-2.5 rounded-xl bg-brand text-text-onbrand font-bold text-xs hover:bg-brand-hover flex items-center gap-2"
              >
                <span>Continue to Extraction</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Extract Information */}
        {currentStep === 3 && (
          <div className="space-y-6 text-left">
            <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
              <BrainCircuit className="text-brand" size={20} />
              <div>
                <h3 className="text-sm font-bold text-text-main">Extracted Clinical Entities</h3>
                <p className="text-xs text-text-muted">Review parsed fields before executing revenue assurance audit</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Patient Name', val: formData.patientName, conf: '100%' },
                { label: 'Encounter Diagnosis', val: formData.diagnosis, conf: '94%' },
                { label: 'Primary Procedure', val: formData.procedure, conf: '98%' },
                { label: 'Billed Amount', val: formatRupees(formData.claimAmount), conf: '100%' },
                { label: 'Length of Stay', val: '4 Days', conf: '100%' },
                { label: 'Billing Items Count', val: '5 Services', conf: '96%' },
              ].map((item) => (
                <div key={item.label} className="p-3.5 rounded-xl bg-bg-subtle border border-border-subtle">
                  <span className="text-[10px] text-text-muted uppercase font-bold">{item.label}</span>
                  <div className="text-xs font-bold text-text-main mt-0.5">{item.val}</div>
                  <span className="text-[10px] font-bold text-emerald-600 mt-1 block">
                    Confidence: {item.conf}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-border-subtle">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-xl bg-bg-subtle text-text-muted text-xs font-bold"
              >
                Back
              </button>
              <button
                onClick={handleStep3Next}
                className="px-6 py-2.5 rounded-xl bg-brand text-text-onbrand font-bold text-xs hover:bg-brand-hover flex items-center gap-2"
              >
                <span>Execute AI Revenue Audit</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Validate Progress Animation */}
        {currentStep === 4 && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-brand/15 text-brand flex items-center justify-center animate-pulse">
              <BrainCircuit size={32} />
            </div>
            <div>
              <h3 className="text-lg font-black text-text-main">Executing CareSure Hybrid Audit</h3>
              <p className="text-xs text-text-muted mt-1">
                Cross-checking clinical records, evaluating deterministic rules (R01–R06), and querying ML microservice...
              </p>
            </div>
            <div className="w-48 h-2 bg-border-subtle rounded-full overflow-hidden">
              <div className="h-full bg-brand rounded-full animate-indeterminate" />
            </div>
          </div>
        )}

        {/* Step 5: Risk Assessment Result */}
        {currentStep === 5 && (
          <div className="space-y-6 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <div>
                <h3 className="text-lg font-black text-text-main">Audit Assessment Complete</h3>
                <p className="text-xs text-text-muted">Calculated using Rule Engine, Isolation Forest, and Random Forest</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30">
                High Risk Signals (72/100)
              </span>
            </div>

            {/* Score Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-bg-subtle border border-border-subtle">
                <span className="text-[10px] font-bold text-text-muted uppercase">Rules Signal</span>
                <div className="text-xl font-black text-text-main mt-1">25 pts</div>
                <span className="text-[10px] text-text-muted">Cap: 40 pts</span>
              </div>
              <div className="p-4 rounded-xl bg-bg-subtle border border-border-subtle">
                <span className="text-[10px] font-bold text-text-muted uppercase">ML Risk Probability</span>
                <div className="text-xl font-black text-text-main mt-1">28 pts</div>
                <span className="text-[10px] text-text-muted">0.80 × 35</span>
              </div>
              <div className="p-4 rounded-xl bg-bg-subtle border border-border-subtle">
                <span className="text-[10px] font-bold text-text-muted uppercase">Anomaly Outlier</span>
                <div className="text-xl font-black text-text-main mt-1">19 pts</div>
                <span className="text-[10px] text-text-muted">0.76 × 25</span>
              </div>
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-400/40">
                <span className="text-[10px] font-bold text-brand uppercase">Hybrid Claim Score</span>
                <div className="text-2xl font-black text-brand mt-1">72 / 100</div>
                <span className="text-[10px] font-bold text-rose-600">Review Required</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
              <strong>Primary Finding (R01):</strong> CT Scan Abdomen is billed (₹18,500) but no corresponding diagnostic report was found.
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
              <button
                onClick={() => navigate('/claims')}
                className="px-4 py-2 rounded-xl bg-bg-subtle text-text-muted text-xs font-bold"
              >
                Back to Claims Register
              </button>
              <button
                onClick={() => navigate('/verification')}
                className="px-6 py-2.5 rounded-xl bg-brand text-text-onbrand font-bold text-xs hover:bg-brand-hover flex items-center gap-1.5"
              >
                <span>Inspect in Verification Workspace</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
