'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FileText, Loader2, ArrowLeft, CheckCircle, UploadCloud, X, AlertCircle } from 'lucide-react';

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const candidateId = searchParams.get('candidateId');

  const [candidate, setCandidate] = useState<any | null>(null);
  const [loadingCandidate, setLoadingCandidate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File States (stores base64 strings)
  const [lmis, setLmis] = useState<{ name: string; base64: string } | null>(null);
  const [insurance, setInsurance] = useState<{ name: string; base64: string } | null>(null);
  const [ticket, setTicket] = useState<{ name: string; base64: string } | null>(null);

  useEffect(() => {
    if (!candidateId) {
      setError('No candidate selected.');
      setLoadingCandidate(false);
      return;
    }

    async function fetchCandidate() {
      try {
        const res = await api(`/api/candidates/${candidateId}`);
        if (!res.ok) throw new Error('Candidate not found');
        const data = await res.json();
        setCandidate(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch candidate details');
      } finally {
        setLoadingCandidate(false);
      }
    }

    fetchCandidate();
  }, [candidateId]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setFileState: (val: { name: string; base64: string } | null) => void,
    allowedTypes: string[] = ['application/pdf']
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
      alert(`Invalid file type. Please upload one of: ${allowedTypes.join(', ')} or an Image.`);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setFileState({ name: file.name, base64 });
    } catch (err) {
      alert('Failed to process file');
    }
  };

  const handleSave = async () => {
    if (!candidateId || !lmis || !insurance || !ticket) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          lmisQrCodeUrl: lmis.base64,
          insuranceUrl: insurance.base64,
          ticketUrl: ticket.base64,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create invoice');
      }

      router.push('/invoice');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = lmis !== null && insurance !== null && ticket !== null;

  if (loadingCandidate) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 size={32} className="text-primary animate-spin" />
        <p className="text-text-tertiary">Loading candidate details...</p>
      </div>
    );
  }

  if (error && !candidate) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-text-primary">Error Loading Candidate</h2>
        <p className="text-text-secondary">{error}</p>
        <Button onClick={() => router.push('/requested')} icon={<ArrowLeft size={16} />}>
          Back to Visa Selected
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/requested')}
          className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft size={16} /> Back to Visa Selected
        </button>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Proceed Candidate</p>
          <h1 className="text-2xl font-bold text-text-primary">
            {candidate?.passportData?.givenNames} {candidate?.passportData?.surname}
          </h1>
        </div>
      </div>

      <div className="bg-surface rounded-3xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {/* Form banner */}
        <div className="bg-gradient-to-r from-primary to-accent p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Generate Candidate Invoice</h2>
              <p className="text-white/70 text-xs mt-0.5">Please import the following required PDFs and enter the final price</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 3 Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LMIS File Upload */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-text-secondary flex items-center justify-between">
                <span>LMIS QR Code</span>
                <span className="text-[10px] text-text-tertiary bg-gray-100 px-2 py-0.5 rounded">PDF or Image</span>
              </label>
              {lmis ? (
                <div className="flex items-center justify-between p-4 bg-gray-50 border border-border rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="text-primary shrink-0" size={24} />
                    <span className="text-sm font-semibold text-text-primary truncate">{lmis.name}</span>
                  </div>
                  <button onClick={() => setLmis(null)} className="p-1 hover:bg-gray-200 rounded text-text-tertiary">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border hover:border-primary hover:bg-primary-50/10 rounded-2xl cursor-pointer transition-all">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={e => handleFileChange(e, setLmis, ['application/pdf', 'image/jpeg', 'image/png'])}
                    className="hidden"
                  />
                  <UploadCloud size={32} className="text-primary mb-2" />
                  <span className="text-sm font-bold text-text-primary">Click to upload LMIS</span>
                  <span className="text-[10px] text-text-tertiary mt-1">PDF or image file</span>
                </label>
              )}
            </div>

            {/* Insurance File Upload */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-text-secondary flex items-center justify-between">
                <span>Insurance</span>
                <span className="text-[10px] text-text-tertiary bg-gray-100 px-2 py-0.5 rounded">PDF Only</span>
              </label>
              {insurance ? (
                <div className="flex items-center justify-between p-4 bg-gray-50 border border-border rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="text-primary shrink-0" size={24} />
                    <span className="text-sm font-semibold text-text-primary truncate">{insurance.name}</span>
                  </div>
                  <button onClick={() => setInsurance(null)} className="p-1 hover:bg-gray-200 rounded text-text-tertiary">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border hover:border-primary hover:bg-primary-50/10 rounded-2xl cursor-pointer transition-all">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={e => handleFileChange(e, setInsurance, ['application/pdf'])}
                    className="hidden"
                  />
                  <UploadCloud size={32} className="text-primary mb-2" />
                  <span className="text-sm font-bold text-text-primary">Click to upload Insurance</span>
                  <span className="text-[10px] text-text-tertiary mt-1">PDF file only</span>
                </label>
              )}
            </div>

            {/* Ticket File Upload */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-text-secondary flex items-center justify-between">
                <span>Ticket</span>
                <span className="text-[10px] text-text-tertiary bg-gray-100 px-2 py-0.5 rounded">PDF Only</span>
              </label>
              {ticket ? (
                <div className="flex items-center justify-between p-4 bg-gray-50 border border-border rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="text-primary shrink-0" size={24} />
                    <span className="text-sm font-semibold text-text-primary truncate">{ticket.name}</span>
                  </div>
                  <button onClick={() => setTicket(null)} className="p-1 hover:bg-gray-200 rounded text-text-tertiary">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border hover:border-primary hover:bg-primary-50/10 rounded-2xl cursor-pointer transition-all">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={e => handleFileChange(e, setTicket, ['application/pdf'])}
                    className="hidden"
                  />
                  <UploadCloud size={32} className="text-primary mb-2" />
                  <span className="text-sm font-bold text-text-primary">Click to upload Ticket</span>
                  <span className="text-[10px] text-text-tertiary mt-1">PDF file only</span>
                </label>
              )}
            </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button variant="outline" onClick={() => router.push('/requested')}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isFormValid || isSubmitting}
              loading={isSubmitting}
              icon={<CheckCircle size={16} />}
            >
              Save Invoice
            </Button>
          </div>
        </div>
      </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 size={32} className="text-primary animate-spin" />
        <p className="text-text-tertiary">Loading invoice workspace...</p>
      </div>
    }>
      <NewInvoiceContent />
    </Suspense>
  );
}
