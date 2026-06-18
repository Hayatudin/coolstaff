'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PassportData, CandidatePersonalInfo, RegistrationStep, Broker } from '@/types';
import { cn, compressImage } from '@/lib/utils';
import { api } from '@/lib/api';
import StepIndicator from '@/components/registration/StepIndicator';
import PassportUploader from '@/components/registration/PassportUploader';
import PassportDataFields from '@/components/registration/PassportDataFields';
import PersonalInfoForm from '@/components/registration/PersonalInfoForm';
import Button from '@/components/ui/Button';
import { ArrowRight, ArrowLeft, CheckCircle2, UserPlus, ScanLine, Upload, FileText, UploadCloud, Loader2 } from 'lucide-react';
import { useCandidates } from '@/hooks/useCandidates';
import { authClient } from '@/lib/auth-client';

const preprocessImageForOcr = (dataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      // Resize image to standard width (e.g. 1600px) maintaining aspect ratio
      const maxDim = 1600;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

const emptyPassportData: PassportData = {
  passportNumber: '', surname: '', givenNames: '', dateOfBirth: '',
  gender: '', nationality: '', issuingCountry: '', dateOfIssue: '',
  dateOfExpiry: '', placeOfBirth: '',
};

const emptyPersonalInfo: CandidatePersonalInfo = {
  idNumber: '', job: '', maritalStatus: '', numberOfChildren: 0, religion: '', bloodType: '',
  height: '160', weight: '55', phone: '', email: '', address: '', city: '',
  state: '', country: '', educationLevel: '', languages: [],
  workExperience: [], skills: [], medicalStatus: 'Pending', knownConditions: '',
  emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '', emergencyContactAddress: '',
  additionalPhones: [], brokerId: '', salary: '1000SR',
};

function RegistrationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;

  const [step, setStep] = useState<RegistrationStep>(isEditMode ? 2 : 1);
  const [passportImage, setPassportImage] = useState<string | null>(null);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [fullBodyPhoto, setFullBodyPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [animatingFields, setAnimatingFields] = useState<Set<string>>(new Set());
  const [passportData, setPassportData] = useState<PassportData>(emptyPassportData);
  const [personalInfo, setPersonalInfo] = useState<CandidatePersonalInfo>(emptyPersonalInfo);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [importMethod, setImportMethod] = useState<'musaned' | 'passport'>('musaned');
  const [registeredCandidateId, setRegisteredCandidateId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [allowVideo, setAllowVideo] = useState(false);
  const [quickRegistrationId, setQuickRegistrationId] = useState<string | null>(null);

  // Musaned drag & drop
  const [isDragOver, setIsDragOver] = useState(false);
  const [musanedError, setMusanedError] = useState<string | null>(null);
  const [musanedSuccess, setMusanedSuccess] = useState(false);
  const [candidateExists, setCandidateExists] = useState(false);
  const musanedFileRef = React.useRef<HTMLInputElement>(null);

  const { data: session } = authClient.useSession();
  const { candidates } = useCandidates();

  useEffect(() => {
    async function fetchBrokers() {
      try {
        const res = await api('/api/brokers');
        const data = await res.json();
        setBrokers(Array.isArray(data) ? data : []);
      } catch { /* ignore */ }
    }
    fetchBrokers();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedPromo = sessionStorage.getItem('pending_registration_promotion');
    if (!storedPromo) return;

    try {
      const { extractedData, quickRegistration } = JSON.parse(storedPromo);
      console.log('[DEBUG] Loading pending quick registration promotion from session:', { extractedData, quickRegistration });

      setQuickRegistrationId(quickRegistration.id);

      const convertDate = (dateStr?: string): string => {
        if (!dateStr) return '';
        if (dateStr.includes('T')) {
          return dateStr.split('T')[0];
        }
        const separator = dateStr.includes('/') ? '/' : dateStr.includes('-') ? '-' : null;
        if (separator) {
          const parts = dateStr.split(separator);
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            } else if (parts[2].length === 4) {
              return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
        }
        return dateStr;
      };

      const extractedPlaceOfBirth = extractedData.placeOfBirth || extractedData.city || '';
      const extractedIssuingCountry = extractedData.placeOfIssue || extractedData.issuingCountry || '';

      setPassportData({
        passportNumber: extractedData.passportNumber || quickRegistration.passportNumber || '',
        surname: (extractedData.surname || quickRegistration.surname || '').toUpperCase(),
        givenNames: (extractedData.givenNames || quickRegistration.givenNames || '').toUpperCase(),
        dateOfBirth: convertDate(extractedData.dateOfBirth) || '',
        gender: extractedData.gender || '',
        nationality: extractedData.nationality || '',
        issuingCountry: extractedIssuingCountry,
        dateOfIssue: convertDate(extractedData.dateOfIssue) || '',
        dateOfExpiry: convertDate(extractedData.dateOfExpiry) || '',
        placeOfBirth: extractedPlaceOfBirth,
      });

      const mapReligion = (r?: string): string => {
        if (!r) return '';
        const upper = r.toUpperCase();
        if (upper.includes('MUSLIM') || upper.includes('ISLAM')) return 'Muslim';
        if (upper.includes('ORTHODOX')) return 'Orthodox Christian';
        if (upper.includes('PROTESTANT')) return 'Protestant';
        if (upper.includes('CATHOLIC')) return 'Catholic';
        if (upper.includes('CHRISTIAN')) return 'Orthodox Christian';
        return r;
      };

      setPersonalInfo(prev => ({
        ...prev,
        idNumber: extractedData.passportNumber || quickRegistration.passportNumber || prev.idNumber,
        job: extractedData.job ? extractedData.job.toUpperCase() : prev.job,
        religion: mapReligion(extractedData.religion) || quickRegistration.religion || prev.religion,
        maritalStatus: extractedData.maritalStatus || quickRegistration.maritalStatus || prev.maritalStatus,
        phone: extractedData.phone || prev.phone,
        email: extractedData.email || prev.email,
        educationLevel: extractedData.educationLevel || prev.educationLevel,
        numberOfChildren: extractedData.numberOfChildren ? parseInt(extractedData.numberOfChildren) : (quickRegistration.numberOfChildren || prev.numberOfChildren),
        height: extractedData.height || prev.height,
        weight: extractedData.weight || prev.weight,
        city: extractedData.city || prev.city,
        address: extractedData.address || prev.address,
        country: extractedData.nationality ? extractedData.nationality.toUpperCase() : prev.country,
        languages: extractedData.languages 
          ? extractedData.languages.split(/[,&]/).map((s: string) => s.trim().toUpperCase()).filter(Boolean) 
          : (Array.isArray(quickRegistration.languages) ? quickRegistration.languages : prev.languages),
        skills: extractedData.skills ? extractedData.skills.split(/[,&]/).map((s: string) => s.trim().toUpperCase()).filter(Boolean) : prev.skills,
        emergencyContactName: extractedData.emergencyContactName || prev.emergencyContactName,
        emergencyContactRelation: extractedData.emergencyContactRelation || prev.emergencyContactRelation,
        emergencyContactPhone: extractedData.emergencyContactPhone || prev.emergencyContactPhone,
        emergencyContactAddress: extractedData.emergencyContactAddress || prev.emergencyContactAddress,
        
        // Broker and Quick Registration files:
        brokerId: quickRegistration.brokerId || quickRegistration.broker?.id || prev.brokerId,
        cocDocumentUrl: quickRegistration.cocDocumentUrl || '',
        labourIdUrl: quickRegistration.labourIdUrl || '',
        candidateIdImageUrl: quickRegistration.candidateIdImageUrl || '',
        relativeIdImageUrl: quickRegistration.relativeIdImageUrl || '',
        additionalPhones: prev.additionalPhones,
        workExperience: prev.workExperience,
      }));

      setPassportImage(quickRegistration.passportImageUrl || null);
      setVideoUrl(quickRegistration.videoUrl && quickRegistration.videoUrl.startsWith('http') ? quickRegistration.videoUrl : '');
      setProcessingComplete(true);
      setMusanedSuccess(true);
      setStep(2); // Go straight to filling personal info
    } catch (err) {
      console.error('Failed to parse pending promotion data from storage:', err);
    } finally {
      sessionStorage.removeItem('pending_registration_promotion');
    }
  }, []);

  const handleCreateBroker = async (name: string) => {
    try {
      const res = await api('/api/brokers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const newBroker = await res.json();
        setBrokers(prev => [...prev, newBroker].sort((a, b) => a.name.localeCompare(b.name)));
        setPersonalInfo(prev => ({ ...prev, brokerId: newBroker.id }));
      } else {
        alert('Failed to create broker');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating broker');
    }
  };

  useEffect(() => {
    if (!editId || candidates.length === 0) return;
    const c = candidates.find((x: any) => x.id === editId);
    if (c) {
      setPassportData(c.passportData);
      setPersonalInfo(c.personalInfo);
      setPassportImage(c.passportImageUrl || null);
      setFacePhoto(c.facePhotoUrl || null);
      setFullBodyPhoto(c.fullBodyPhotoUrl || null);
      setVideoUrl(c.videoUrl && c.videoUrl.startsWith('http') ? c.videoUrl : '');
      setAllowVideo(c.allowVideo || false);
      setProcessingComplete(true);
    }
  }, [editId, candidates]);

  const quickRegId = searchParams.get('quick_reg_id');
  useEffect(() => {
    if (!quickRegId) return;
    async function fetchQuickRegistration() {
      try {
        const res = await api(`/api/quick-registrations/${quickRegId}`);
        if (!res.ok) throw new Error('Failed to fetch quick registration data');
        const data = await res.json();
        
        setQuickRegistrationId(quickRegId);
        
        setPassportData({
          passportNumber: data.passportNumber || '',
          surname: data.surname || '',
          givenNames: data.givenNames || '',
          dateOfBirth: '',
          gender: '',
          nationality: '',
          issuingCountry: '',
          dateOfIssue: '',
          dateOfExpiry: '',
          placeOfBirth: '',
        });
        
        setPersonalInfo(prev => ({
          ...prev,
          religion: data.religion || '',
          maritalStatus: data.maritalStatus || '',
          numberOfChildren: data.numberOfChildren || 0,
          educationLevel: '',
          brokerId: data.brokerId || '',
          additionalPhones: [],
          workExperience: [],
          cocDocumentUrl: data.cocDocumentUrl || '',
          labourIdUrl: data.labourIdUrl || '',
          candidateIdImageUrl: data.candidateIdImageUrl || '',
          relativeIdImageUrl: data.relativeIdImageUrl || '',
          languages: Array.isArray(data.languages) ? data.languages : [],
        }));
        
        setPassportImage(data.passportImageUrl || null);
        setProcessingComplete(true);
        setStep(2); // Jump straight to Step 2 (personal info form)
      } catch (err) {
        console.error(err);
        alert('Failed to load Quick Registration candidate.');
      }
    }
    fetchQuickRegistration();
  }, [quickRegId]);


  // Auto-fill pre-registered video URLs & photos by passport number
  useEffect(() => {
    if (isEditMode) return;
    const passportNumber = passportData.passportNumber?.trim();
    if (!passportNumber || passportNumber.length < 5) return;

    const delayDebounce = setTimeout(async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/video-uploads/match?passportNumber=${encodeURIComponent(passportNumber)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.matchFound) {
            if (data.videoUrl && data.videoUrl.startsWith('http')) setVideoUrl(data.videoUrl);
            if (data.facePhotoUrl && !facePhoto) setFacePhoto(data.facePhotoUrl);
            if (data.fullBodyPhotoUrl && !fullBodyPhoto) setFullBodyPhoto(data.fullBodyPhotoUrl);
            console.log(`🎥 Pre-registered video/photos auto-matched for passport ${passportNumber}`);
          }
        }
      } catch (err) {
        console.error('Failed to match pre-registered video:', err);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [passportData.passportNumber]);

  useEffect(() => {
    const container = document.getElementById('main-scroll-container');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // ── OCR for Passport (with canvas preprocessing for better accuracy) ──
  const performOCR = useCallback(async (imageUrl: string) => {
    setPassportImage(imageUrl);
    setIsProcessing(true);
    setProcessingComplete(false);
    setError(null);
    setOcrProgress(0);
    try {
      const preprocessedUrl = await preprocessImageForOcr(imageUrl);
      setPassportImage(preprocessedUrl);

      const Tesseract = await import('tesseract.js');
      setOcrProgress(10);
      const result = await Tesseract.recognize(preprocessedUrl, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setOcrProgress(10 + m.progress * 80);
        },
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789< '
      } as any);
      setOcrProgress(90);
      const ocrText = result.data.text;
      const response = await api('/api/ocr/passport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocrText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to parse passport data');
      setOcrProgress(100);
      setPassportData(prev => ({
        ...prev,
        ...data,
        surname: data.surname ? data.surname.toUpperCase() : '',
        givenNames: data.givenNames ? data.givenNames.toUpperCase() : ''
      }));
      setProcessingComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan passport');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ── Musaned PDF handler ──
  const handleMusanedFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setMusanedError('Please upload a valid PDF document.');
      return;
    }
    setIsProcessing(true);
    setMusanedError(null);
    setMusanedSuccess(false);
    setCandidateExists(false);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api('/api/extract/musaned', { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to process PDF');

      const data = result.data;
      const passportNum = (data.passportNumber || '').trim().toUpperCase();
      if (passportNum) {
        const alreadyExists = candidates.some((c: any) => c.passportData?.passportNumber?.trim().toUpperCase() === passportNum || c.passportNumber?.trim().toUpperCase() === passportNum);
        if (alreadyExists) {
          setCandidateExists(true);
          throw new Error(`Candidate with Passport Number ${data.passportNumber} already exists in the system.`);
        }
      }
      
      // Try to match and fetch existing Quick Registration (Entry) by passport number
      let quickReg: any = null;
      if (passportNum) {
        try {
          const quickRes = await api(`/api/quick-registrations/by-passport/${encodeURIComponent(passportNum)}`);
          if (quickRes.ok) {
            quickReg = await quickRes.json();
            setQuickRegistrationId(quickReg.id);
            if (quickReg.passportImageUrl) {
              setPassportImage(quickReg.passportImageUrl);
            }
            if (quickReg.videoUrl && quickReg.videoUrl.startsWith('http')) {
              setVideoUrl(quickReg.videoUrl);
            }
            if (quickReg.allowVideo !== undefined) {
              setAllowVideo(quickReg.allowVideo);
            }
            console.log('[DEBUG] Autocompleted Quick Registration details matching passport:', quickReg);
          }
        } catch (matchErr) {
          console.warn('[DEBUG] Failed to search for quick registration record:', matchErr);
        }
      }

      const convertDate = (dateStr?: string): string => {
        if (!dateStr) return '';
        if (dateStr.includes('T')) {
          return dateStr.split('T')[0];
        }
        const separator = dateStr.includes('/') ? '/' : dateStr.includes('-') ? '-' : null;
        if (separator) {
          const parts = dateStr.split(separator);
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            } else if (parts[2].length === 4) {
              return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
        }
        return dateStr;
      };

      setPassportData(prev => ({
        ...prev,
        passportNumber: data.passportNumber || prev.passportNumber,
        givenNames: data.givenNames || prev.givenNames,
        surname: data.surname || prev.surname,
        dateOfBirth: convertDate(data.dateOfBirth) || prev.dateOfBirth,
        nationality: data.nationality || prev.nationality,
        dateOfExpiry: convertDate(data.dateOfExpiry) || prev.dateOfExpiry,
        dateOfIssue: convertDate(data.dateOfIssue) || prev.dateOfIssue,
        issuingCountry: data.placeOfIssue || data.issuingCountry || prev.issuingCountry,
        gender: data.gender || prev.gender,
        placeOfBirth: data.placeOfBirth || data.city || prev.placeOfBirth,
      }));

      const mapReligion = (r?: string): string => {
        if (!r) return '';
        const upper = r.toUpperCase();
        if (upper.includes('MUSLIM') || upper.includes('ISLAM')) return 'Muslim';
        if (upper.includes('ORTHODOX')) return 'Orthodox Christian';
        if (upper.includes('PROTESTANT')) return 'Protestant';
        if (upper.includes('CATHOLIC')) return 'Catholic';
        if (upper.includes('CHRISTIAN')) return 'Orthodox Christian'; // Default to Orthodox if general Christian
        return r;
      };

      setPersonalInfo(prev => {
        const mergedLanguages = data.languages 
          ? data.languages.split(/[,&]/).map((s: string) => s.trim().toUpperCase()).filter(Boolean) 
          : (quickReg && Array.isArray(quickReg.languages) ? quickReg.languages : prev.languages);

        return {
          ...prev,
          idNumber: data.passportNumber || prev.idNumber,
          job: data.job ? data.job.toUpperCase() : prev.job,
          religion: mapReligion(data.religion) || (quickReg ? quickReg.religion : '') || prev.religion,
          maritalStatus: data.maritalStatus || (quickReg ? quickReg.maritalStatus : '') || prev.maritalStatus,
          phone: data.phone || prev.phone,
          email: data.email || prev.email,
          educationLevel: data.educationLevel || prev.educationLevel,
          numberOfChildren: data.numberOfChildren ? parseInt(data.numberOfChildren) : (quickReg ? quickReg.numberOfChildren : prev.numberOfChildren),
          height: data.height || prev.height,
          weight: data.weight || prev.weight,
          city: data.city || prev.city,
          address: data.address || prev.address,
          country: data.nationality ? data.nationality.toUpperCase() : prev.country,
          languages: mergedLanguages,
          skills: data.skills ? data.skills.split(/[,&]/).map((s: string) => s.trim().toUpperCase()).filter(Boolean) : prev.skills,
          emergencyContactName: data.emergencyContactName || prev.emergencyContactName,
          emergencyContactRelation: data.emergencyContactRelation || prev.emergencyContactRelation,
          emergencyContactPhone: data.emergencyContactPhone || prev.emergencyContactPhone,
          emergencyContactAddress: data.emergencyContactAddress || prev.emergencyContactAddress,
          
          // Merge from Quick Registration if found:
          brokerId: (quickReg ? (quickReg.brokerId || quickReg.broker?.id) : '') || prev.brokerId,
          cocDocumentUrl: (quickReg ? quickReg.cocDocumentUrl : '') || prev.cocDocumentUrl || '',
          labourIdUrl: (quickReg ? quickReg.labourIdUrl : '') || prev.labourIdUrl || '',
          candidateIdImageUrl: (quickReg ? quickReg.candidateIdImageUrl : '') || prev.candidateIdImageUrl || '',
          relativeIdImageUrl: (quickReg ? quickReg.relativeIdImageUrl : '') || prev.relativeIdImageUrl || '',
        };
      });

      setProcessingComplete(true);
      setMusanedSuccess(true);
      // Go directly to Complete Profile
      setTimeout(() => setStep(2), 800);
    } catch (err: any) {
      setMusanedError(err.message || 'An error occurred');
    } finally {
      setIsProcessing(false);
      if (musanedFileRef.current) musanedFileRef.current.value = '';
    }
  }, []);

  const handlePassportChange = (field: keyof PassportData, value: string) => {
    setPassportData(prev => ({ ...prev, [field]: value }));
  };

  const handlePersonalChange = (field: keyof CandidatePersonalInfo, value: string | string[] | number) => {
    setPersonalInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      console.log('SUBMITTING CANDIDATE. Session user ID:', session?.user?.id);
      setIsSubmitting(true);

      if (!facePhoto || !fullBodyPhoto) {
        alert('Face Photo and Full Body Photo are required.');
        setIsSubmitting(false);
        return;
      }

      const compressedPassport = passportImage ? await compressImage(passportImage, 1200, 0.7) : null;
      const compressedFace = facePhoto ? await compressImage(facePhoto, 800, 0.7) : null;
      const compressedFullBody = fullBodyPhoto ? await compressImage(fullBodyPhoto, 1200, 0.7) : null;
      const compressedCoc = personalInfo.cocDocumentUrl ? await compressImage(personalInfo.cocDocumentUrl, 1200, 0.7) : null;
      const compressedMedical = personalInfo.medicalDocumentUrl ? await compressImage(personalInfo.medicalDocumentUrl, 1200, 0.7) : null;
      const compressedCandidateId = personalInfo.candidateIdImageUrl ? await compressImage(personalInfo.candidateIdImageUrl, 1200, 0.7) : null;
      const compressedRelativeId = personalInfo.relativeIdImageUrl ? await compressImage(personalInfo.relativeIdImageUrl, 1200, 0.7) : null;

      const { cocDocumentUrl, medicalDocumentUrl, candidateIdImageUrl, relativeIdImageUrl, labourIdUrl, ...cleanPersonalInfo } = personalInfo;

      const url = isEditMode ? `/api/candidates/${editId}` : '/api/candidates';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await api(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passportData: {
            ...passportData,
            placeOfBirth: passportData.placeOfBirth || personalInfo.city || '',
          },
          personalInfo: {
            ...cleanPersonalInfo,
            cocDocumentUrl: compressedCoc,
            medicalDocumentUrl: compressedMedical,
            candidateIdImageUrl: compressedCandidateId,
            relativeIdImageUrl: compressedRelativeId,
            labourIdUrl: labourIdUrl || null,
          },
          passportImageUrl: compressedPassport,
          facePhotoUrl: compressedFace,
          fullBodyPhotoUrl: compressedFullBody,
          videoUrl: videoUrl || null,
          allowVideo: allowVideo,
          status: isEditMode ? (candidates.find(c => c.id === editId)?.status || 'pending') : 'pending',
          isRequested: isEditMode ? (candidates.find(c => c.id === editId)?.isRequested || false) : false,
          visaSelected: isEditMode ? (candidates.find(c => c.id === editId)?.visaSelected || false) : false,
          registeredById: session?.user?.id || null,
          quickRegistrationId: quickRegistrationId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit registration');
      }

      const data = await response.json();
      setRegisteredCandidateId(data.id);
      setSubmitted(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── SUCCESS SCREEN ──
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 animate-scale-pop">
        <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-success" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Registration Complete!</h2>
        <p className="text-text-secondary mb-8">
          Candidate <strong>{passportData.givenNames} {passportData.surname}</strong> has been successfully registered.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" onClick={() => {
            setSubmitted(false); setStep(1); setPassportImage(null); setFacePhoto(null); setFullBodyPhoto(null);
            setProcessingComplete(false); setPassportData(emptyPassportData);
            setPersonalInfo(emptyPersonalInfo); setMusanedSuccess(false);
            setImportMethod('musaned'); setVideoUrl(''); setAllowVideo(false);
          }}>
            Add Another Candidate
          </Button>
          <a href={`/cv-generator${registeredCandidateId ? `?candidateId=${registeredCandidateId}` : ''}`}>
            <Button variant="primary">Generate CV</Button>
          </a>
        </div>
      </div>
    );
  }

  // ── MAIN RENDER ──
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50">
              <UserPlus size={22} className="text-primary" />
            </div>
            {isEditMode ? 'Edit Candidate' : 'Candidate Registration'}
          </h1>
          <p className="text-text-secondary mt-1 ml-12">{isEditMode ? 'Update candidate personal details' : 'Register new candidates for foreign employment processing'}</p>
        </div>

        {/* Top right: Scan Passport button (visible on step 1) */}
        {step === 1 && importMethod === 'musaned' && (
          <Button
            variant="outline"
            icon={<ScanLine size={16} />}
            onClick={() => { setImportMethod('passport'); setMusanedSuccess(false); setMusanedError(null); }}
          >
            Scan Passport
          </Button>
        )}
        {step === 1 && importMethod === 'passport' && (
          <Button
            variant="outline"
            icon={<Upload size={16} />}
            onClick={() => { setImportMethod('musaned'); setError(null); setProcessingComplete(false); setPassportImage(null); }}
          >
            Import from Musaned
          </Button>
        )}
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={step} onStepClick={(s) => { if (isEditMode && s === 1) return; if (s < step) setStep(s); }} />

      {/* Content Card */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm p-8">

        {/* ══ STEP 1: IMPORT ══ */}
        {step === 1 && (
          <div className="space-y-8">
            {importMethod === 'musaned' ? (
              /* ── Musaned Upload Screen (Matching attached design) ── */
              <div>
                {/* Info badges */}
                <div className="flex items-center justify-center gap-6 mb-8">
                  {[
                    { icon: <FileText size={18} />, label: 'Musaned CV', desc: 'PDF document' },
                    { icon: <UploadCloud size={18} />, label: 'Auto-Fill', desc: 'Extracts all fields' },
                    { icon: <CheckCircle2 size={18} />, label: 'Fast Process', desc: 'Instant registration' },
                  ].map(b => (
                    <div key={b.label} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">{b.icon}</div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-text-primary">{b.label}</p>
                        <p className="text-[11px] text-text-tertiary">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Drag & Drop zone */}
                <input type="file" accept="application/pdf" className="hidden" ref={musanedFileRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMusanedFile(f); }} />

                <div
                  className={cn(
                    'relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 cursor-pointer group',
                    isDragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50/50',
                    isProcessing && 'pointer-events-none'
                  )}
                  onClick={() => !isProcessing && musanedFileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleMusanedFile(f);
                  }}
                >
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <Loader2 size={32} className="text-primary animate-spin" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-text-primary">Extracting Data...</p>
                        <p className="text-sm text-text-tertiary mt-1">Reading Musaned CV PDF</p>
                      </div>
                    </div>
                  ) : musanedSuccess ? (
                    <div className="flex flex-col items-center gap-4 animate-scale-pop">
                      <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={32} className="text-success" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-text-primary">Extraction Successful!</p>
                        <p className="text-sm text-text-tertiary mt-1">Redirecting to profile form...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-110 transition-all">
                        <UploadCloud size={32} className="text-gray-400 group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-text-primary mb-1">Drag & drop to upload</p>
                        <p className="text-sm text-primary font-semibold cursor-pointer hover:underline">or browse</p>
                      </div>
                    </div>
                  )}
                </div>

                {musanedError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-fade-in-up">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-600 text-xs font-bold">!</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-red-800">Extraction Error</p>
                      <p className="text-xs text-red-600 mt-1">{musanedError}</p>
                      {candidateExists && (
                        <button
                          type="button"
                          onClick={() => router.push('/candidates')}
                          className="mt-3 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          Back to Candidates
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-center text-xs text-text-tertiary mt-4">
                  Upload a Musaned Candidate CV (PDF) to auto-fill the registration form
                </p>
              </div>
            ) : (
              /* ── Passport Scan Flow ── */
              <div>
                <PassportUploader
                  onImageUploaded={performOCR}
                  isProcessing={isProcessing}
                  processingComplete={processingComplete}
                  passportImage={passportImage}
                  ocrProgress={ocrProgress}
                />
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in-up mt-4">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-600 text-xs font-bold">!</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">{error}</p>
                      <div className="mt-2 flex gap-4">
                        <button className="text-xs text-red-600 hover:text-red-800 underline" onClick={() => { setPassportImage(null); setError(null); setProcessingComplete(false); }}>
                          Try again with a different photo
                        </button>
                        {passportImage && (
                          <button
                            type="button"
                            className="text-xs text-primary hover:text-indigo-800 font-semibold underline"
                            onClick={() => {
                              setError(null);
                              setProcessingComplete(true);
                            }}
                          >
                            Fill the form manually
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {passportImage && !processingComplete && !isProcessing && (
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setProcessingComplete(true);
                      }}
                      className="text-sm font-semibold text-primary hover:text-primary-dark underline"
                    >
                      Fill the form manually
                    </button>
                  </div>
                )}
                {processingComplete && (
                  <PassportDataFields data={passportData} onChange={handlePassportChange} animatingFields={animatingFields} isExtracted={processingComplete} />
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 2: PERSONAL INFO ══ */}
        {step === 2 && (
          <PersonalInfoForm
            data={personalInfo}
            onChange={handlePersonalChange}
            passportData={passportData}
            onPassportChange={handlePassportChange}
            passportImage={passportImage}
            onPassportImageChange={setPassportImage}
            facePhoto={facePhoto}
            onFacePhotoChange={setFacePhoto}
            brokers={brokers}
            onBrokerCreate={handleCreateBroker}
            fullBodyPhoto={fullBodyPhoto}
            onFullBodyPhotoChange={setFullBodyPhoto}
            videoUrl={videoUrl}
            onVideoUrlChange={setVideoUrl}
          />
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
          <div>
            {step > 1 && !(isEditMode && step === 2) && (
              <Button variant="outline" onClick={() => { setStep(1 as RegistrationStep); window.scrollTo(0, 0); }} icon={<ArrowLeft size={16} />}>
                Back
              </Button>
            )}
          </div>
          <div>
            {step === 1 ? (
              <Button
                onClick={() => { setStep(2 as RegistrationStep); window.scrollTo(0, 0); }}
                disabled={!processingComplete}
                icon={<ArrowRight size={16} />}
              >
                Next: Complete Profile
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={isSubmitting} icon={<CheckCircle2 size={16} />}>
                {isEditMode ? 'Save' : 'Register'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegistrationPage() {
  return (
    <React.Suspense fallback={<div className="p-10 flex justify-center"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
      <RegistrationContent />
    </React.Suspense>
  );
}
