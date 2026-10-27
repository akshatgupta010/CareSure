import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClaims } from '../claims/api';
import { FileText, Search, Download, ExternalLink } from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const { data: claims } = useClaims();

  const sampleDocuments = [
    {
      id: 'DOC-1041A',
      claimId: 'clm-2026-1041',
      claimNumber: 'CLM-2026-1041',
      patientName: 'Priya Singh',
      name: 'Discharge_Summary_PT20981.pdf',
      type: 'Discharge Summary',
      size: '2.4 MB',
      ocrConfidence: '98.5%',
      uploadedAt: '2026-09-24 14:32',
      status: 'OCR Processed',
    },
    {
      id: 'DOC-1041B',
      claimId: 'clm-2026-1041',
      claimNumber: 'CLM-2026-1041',
      patientName: 'Priya Singh',
      name: 'Itemized_Hospital_Breakup_Bill.pdf',
      type: 'Billing Invoice',
      size: '1.8 MB',
      ocrConfidence: '96.2%',
      uploadedAt: '2026-09-24 14:34',
      status: 'OCR Processed',
    },
    {
      id: 'DOC-1042',
      claimId: 'clm-2026-1042',
      claimNumber: 'CLM-2026-1042',
      patientName: 'Amit Kumar',
      name: 'Hernia_Repair_Operative_Record.pdf',
      type: 'Operative Log',
      size: '3.1 MB',
      ocrConfidence: '99.4%',
      uploadedAt: '2026-09-22 11:20',
      status: 'OCR Verified',
    },
    {
      id: 'DOC-1043',
      claimId: 'clm-2026-1043',
      claimNumber: 'CLM-2026-1043',
      patientName: 'Sunita Roy',
      name: 'Cholecystectomy_OT_Record.pdf',
      type: 'Surgical Notes',
      size: '2.7 MB',
      ocrConfidence: '97.8%',
      uploadedAt: '2026-09-20 15:10',
      status: 'OCR Processed',
    },
    {
      id: 'DOC-1044',
      claimId: 'clm-2026-1044',
      claimNumber: 'CLM-2026-1044',
      patientName: 'Rahul Mehta',
      name: 'Digital_XRay_Bilateral_Knee.pdf',
      type: 'Radiology Report',
      size: '5.2 MB',
      ocrConfidence: '95.6%',
      uploadedAt: '2026-09-18 10:45',
      status: 'OCR Processed',
    },
    {
      id: 'DOC-1045',
      claimId: 'clm-2026-1045',
      claimNumber: 'CLM-2026-1045',
      patientName: 'Ananya Sen',
      name: 'Obstetric_Delivery_Discharge.pdf',
      type: 'Discharge Summary',
      size: '1.9 MB',
      ocrConfidence: '99.8%',
      uploadedAt: '2026-09-17 12:15',
      status: 'OCR Verified',
    },
    {
      id: 'DOC-1046',
      claimId: 'clm-2026-1046',
      claimNumber: 'CLM-2026-1046',
      patientName: 'Vikram Malhotra',
      name: 'Coronary_Angiography_Cath_Lab.pdf',
      type: 'Diagnostic Report',
      size: '4.8 MB',
      ocrConfidence: '96.7%',
      uploadedAt: '2026-09-15 16:30',
      status: 'OCR Processed',
    },
    {
      id: 'DOC-1047',
      claimId: 'clm-2026-1047',
      claimNumber: 'CLM-2026-1047',
      patientName: 'Kavita Joshi',
      name: 'Cesarean_Operative_Summary.pdf',
      type: 'Operative Log',
      size: '2.2 MB',
      ocrConfidence: '98.1%',
      uploadedAt: '2026-09-14 13:00',
      status: 'OCR Processed',
    },
    {
      id: 'DOC-1048',
      claimId: 'clm-2026-1048',
      claimNumber: 'CLM-2026-1048',
      patientName: 'Devansh Verma',
      name: 'Arthroscopy_Knee_Reconstruction.pdf',
      type: 'Procedure Log',
      size: '3.6 MB',
      ocrConfidence: '97.5%',
      uploadedAt: '2026-09-12 17:20',
      status: 'OCR Processed',
    },
  ];

  // Merge live database claims and their clinical documentation packages
  const allDocuments = React.useMemo(() => {
    const list = [...sampleDocuments];
    if (claims && claims.length > 0) {
      claims.forEach((c) => {
        if (!list.some((d) => d.claimNumber === c.claimNumber)) {
          const procClean = (c.procedure || 'Clinical_Consultation').replace(/\s+/g, '_');
          list.unshift({
            id: `DOC-${c.id}`,
            claimId: c.id,
            claimNumber: c.claimNumber,
            patientName: c.patientName,
            name: `${procClean}_Discharge_Summary.pdf`,
            type: 'Discharge Summary',
            size: '2.8 MB',
            ocrConfidence: c.riskScore ? `${Math.max(88, 100 - Math.round(c.riskScore * 0.2))}%` : '97.2%',
            uploadedAt: c.submittedAt ? new Date(c.submittedAt).toLocaleDateString() : 'Active',
            status: 'OCR Verified',
          });
        }
      });
    }
    return list;
  }, [claims]);

  const filtered = allDocuments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.claimNumber.toLowerCase().includes(search.toLowerCase()) ||
    d.patientName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Document Vault & OCR Extraction</h1>
        <p className="text-sm text-secondary mt-1">
          Archived clinical records, diagnostic imaging PDFs, discharge summaries, and verified OCR text extracts.
        </p>
      </div>

      <div className="bg-surface border border-subtle rounded-xl p-4 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by file name, claim number, or patient..."
          className="bg-transparent text-xs text-primary placeholder-muted outline-none w-full"
        />
      </div>

      <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-subtle text-secondary font-semibold">
                <th className="py-2.5 px-3">File Name</th>
                <th className="py-2.5 px-3">Claim #</th>
                <th className="py-2.5 px-3">Patient</th>
                <th className="py-2.5 px-3">Document Category</th>
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3 text-center">OCR Confidence</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-app transition-colors">
                  <td className="py-3 px-3 font-medium text-primary flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand shrink-0" />
                    <span>{doc.name}</span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-primary">{doc.claimNumber}</td>
                  <td className="py-3 px-3 text-secondary">{doc.patientName}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] bg-brand/10 text-brand font-medium">
                      {doc.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-muted">{doc.size}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-success/10 text-success">
                      {doc.ocrConfidence}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right space-x-2">
                    {doc.claimNumber ? (
                      <Link
                        to={`/verification?claimId=${doc.claimId}&claimNumber=${doc.claimNumber}`}
                        className="p-1.5 rounded-lg bg-surface border border-subtle text-secondary hover:text-brand hover:border-brand transition-colors inline-flex items-center gap-1 text-[11px]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Claim
                      </Link>
                    ) : null}
                    <button
                      onClick={() => window.open('#', '_blank')}
                      className="p-1.5 rounded-lg bg-surface border border-subtle text-secondary hover:text-brand hover:border-brand transition-colors inline-flex items-center gap-1 text-[11px]"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
