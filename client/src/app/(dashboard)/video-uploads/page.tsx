'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn, getFileUrl } from '@/lib/utils';
import Input from '@/components/ui/Input';
import FileUpload from '@/components/ui/FileUpload';
import {
  Video,
  Search,
  User,
  ExternalLink,
  CheckCircle,
  HelpCircle,
  FileVideo,
  RefreshCw,
  PlusCircle,
  ChevronRight,
  X,
  Eye,
  Camera,
  UserCircle,
  ScanLine,
  Upload,
} from 'lucide-react';

interface CandidateResult {
  id: string;
  givenNames: string;
  surname: string;
  passportNumber: string;
  nationality: string;
  passportImageUrl: string | null;
  source: 'candidate' | 'quickRegistration';
  fullName: string;
}

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

export default function VideoUploadsPage() {
  const [passportNumber, setPassportNumber] = useState('');
  const [searchResults, setSearchResults] = useState<CandidateResult[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateResult | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [facePhotoFile, setFacePhotoFile] = useState<File | null>(null);
  const [facePhotoPreview, setFacePhotoPreview] = useState<string | null>(null);
  const [fullBodyPhotoFile, setFullBodyPhotoFile] = useState<File | null>(null);
  const [fullBodyPhotoPreview, setFullBodyPhotoPreview] = useState<string | null>(null);

  const handleVideoSelect = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      alert("Max file size is 50MB");
      return;
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file) + '#.mp4');
  };

  const handleFaceSelect = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      alert("Max file size is 50MB");
      return;
    }
    if (facePhotoPreview) URL.revokeObjectURL(facePhotoPreview);
    setFacePhotoFile(file);
    setFacePhotoPreview(URL.createObjectURL(file));
  };

  const handleFullBodySelect = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      alert("Max file size is 50MB");
      return;
    }
    if (fullBodyPhotoPreview) URL.revokeObjectURL(fullBodyPhotoPreview);
    setFullBodyPhotoFile(file);
    setFullBodyPhotoPreview(URL.createObjectURL(file));
  };

  const handleClearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
  };

  const handleClearFace = () => {
    if (facePhotoPreview) URL.revokeObjectURL(facePhotoPreview);
    setFacePhotoFile(null);
    setFacePhotoPreview(null);
  };

  const handleClearFullBody = () => {
    if (fullBodyPhotoPreview) URL.revokeObjectURL(fullBodyPhotoPreview);
    setFullBodyPhotoFile(null);
    setFullBodyPhotoPreview(null);
  };

  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feedback states
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Image view modal
  const [viewingImage, setViewingImage] = useState<{ url: string; title: string } | null>(null);

  // Camera & Passport Scanning states
  const [passportImage, setPassportImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setScanError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (err) {
      console.error('Failed to open camera:', err);
      setScanError('Camera access denied or unavailable. Please upload an image instead.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setPassportImage(dataUrl);
      stopCamera();
      // Trigger OCR on captured snapshot
      performOCR(dataUrl);
    }
  };

  const performOCR = async (imageUrl: string) => {
    setPassportImage(imageUrl);
    setIsScanning(true);
    setScanError(null);
    setOcrProgress(0);

    try {
      const preprocessedUrl = await preprocessImageForOcr(imageUrl);
      setPassportImage(preprocessedUrl);
      setOcrProgress(20);

      const Tesseract = await import('tesseract.js');
      setOcrProgress(40);

      const result = await Tesseract.recognize(preprocessedUrl, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(40 + m.progress * 40);
          }
        },
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789< '
      } as any);
      setOcrProgress(80);

      const ocrText = result.data.text;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/ocr/passport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocrText }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to parse passport data');

      setOcrProgress(100);
      setIsScanning(false);

      if (data.passportNumber) {
        const pNum = data.passportNumber.toUpperCase();
        setPassportNumber(pNum);

        // Auto check if candidate is registered
        setIsSearching(true);
        try {
          const searchRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/video-uploads/search-candidates?q=${encodeURIComponent(pNum)}`);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.length > 0) {
              const exactMatch = searchData.find((c: any) => c.passportNumber.toUpperCase() === pNum) || searchData[0];
              handleSelectCandidate(exactMatch);
              setMessage({
                type: 'success',
                text: `Passport ${pNum} scanned successfully! Candidate "${exactMatch.fullName}" matched and linked.`,
              });
            } else {
              handleClearSelection();
              setMessage({
                type: 'success',
                text: `Passport ${pNum} scanned successfully! This is a new passport number. It will be stored as new when submitted.`,
              });
            }
          }
        } catch (searchErr) {
          console.error('Failed to search candidate after scan:', searchErr);
        } finally {
          setIsSearching(false);
        }
      } else {
        throw new Error('MRZ was scanned but Passport Number could not be extracted. Please position the passport correctly and try again.');
      }
    } catch (err: any) {
      console.error(err);
      setScanError(err.message || 'Failed to scan passport MRZ. Please position the passport correctly.');
      setIsScanning(false);
    }
  };

  // Debounced real-time candidate search by passport number
  useEffect(() => {
    if (!passportNumber || passportNumber.trim().length < 2 || selectedCandidate) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/video-uploads/search-candidates?q=${encodeURIComponent(passportNumber)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
          setShowDropdown(data.length > 0);
        }
      } catch (err) {
        console.error('Failed to search candidates:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [passportNumber, selectedCandidate]);

  // Click outside listener for the search autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCandidate = (candidate: CandidateResult) => {
    setSelectedCandidate(candidate);
    setPassportNumber(candidate.passportNumber);
    setShowDropdown(false);
  };

  const handleClearSelection = () => {
    setSelectedCandidate(null);
    setPassportNumber('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validate inputs
    if (!videoFile) {
      setMessage({ type: 'error', text: 'Please upload a video file first' });
      return;
    }

    const trimmedPassport = passportNumber.trim().toUpperCase();
    if (!selectedCandidate && !trimmedPassport) {
      setMessage({ type: 'error', text: 'Please enter a passport number or select a candidate from the dropdown' });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (selectedCandidate) {
        formData.append('id', selectedCandidate.id);
        formData.append('source', selectedCandidate.source);
      } else {
        formData.append('passportNumber', trimmedPassport);
      }

      formData.append('video', videoFile);
      if (facePhotoFile) {
        formData.append('facePhoto', facePhotoFile);
      }
      if (fullBodyPhotoFile) {
        formData.append('fullBodyPhoto', fullBodyPhotoFile);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/video-uploads/save`, {
        method: 'POST',
        body: formData,
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        setMessage({
          type: 'success',
          text: selectedCandidate
            ? `Successfully uploaded and attached video to candidate "${selectedCandidate.fullName}" (${selectedCandidate.passportNumber})!`
            : `Successfully uploaded and pre-registered video for passport "${trimmedPassport}"!`,
        });

        // Reset state
        handleClearVideo();
        handleClearFace();
        handleClearFullBody();
        setPassportImage(null);
        handleClearSelection();
      } else {
        setMessage({
          type: 'error',
          text: resData.error || 'Failed to save video. Please try again.',
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: 'Server connection failed. Please ensure the backend is running.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Video Uploads Portal</h1>
          <p className="text-sm text-text-secondary mt-1">
            Upload interview videos & photos directly to candidates or buffer them prior to registration.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-full text-rose-700 text-xs font-semibold self-start">
          <FileVideo size={14} />
          Uploader Access Active
        </div>
      </div>

      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl shadow-sm p-6 space-y-6 relative overflow-visible">

          {/* Form Section 1: Identify Candidate by Passport Number */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-50 text-primary text-xs font-bold">1</span>
              <h3 className="text-base font-semibold text-text-primary">Identify Candidate</h3>
            </div>

            {/* Passport Scanner Panel */}
            <div className="bg-lavender-dark/10 border border-primary/10 rounded-2xl p-5 mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScanLine className="text-primary animate-pulse" size={18} />
                  <h4 className="text-sm font-bold text-text-primary">Passport OCR Scanner</h4>
                </div>
                {passportImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setPassportImage(null);
                      setOcrProgress(0);
                      setIsScanning(false);
                      setScanError(null);
                    }}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Reset Scanner
                  </button>
                )}
              </div>

              {/* Camera / Upload buttons */}
              {!isCameraActive && !passportImage && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary-50/20 text-xs font-semibold text-primary cursor-pointer transition-all duration-150">
                    <Upload size={14} />
                    Import Passport Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              performOCR(ev.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary-50/20 text-xs font-semibold text-primary transition-all duration-150 cursor-pointer"
                  >
                    <Camera size={14} />
                    Take Live Photo
                  </button>
                </div>
              )}

              {/* Webcam Stream Area */}
              {isCameraActive && (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] max-w-md mx-auto border-2 border-primary">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-4 border border-dashed border-white/50 rounded-lg pointer-events-none flex items-center justify-center">
                    <div className="text-[10px] text-white/70 bg-black/40 px-2 py-1 rounded">Align Passport MRZ inside frame</div>
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={captureSnapshot}
                      className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-lg shadow cursor-pointer active:scale-95 transition-transform"
                    >
                      Capture Snapshot
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded-lg shadow cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Scanned Image and Progress Indicator */}
              {passportImage && (
                <div className="relative rounded-xl overflow-hidden border border-border bg-gray-50 p-4 flex flex-col items-center gap-3">
                  <div className="relative w-full max-w-[200px] aspect-[3/2] overflow-hidden rounded border border-border">
                    <img src={passportImage} alt="Scanned passport" className="w-full h-full object-contain" />
                    {isScanning && <div className="scan-animation absolute inset-0" />}
                  </div>
                  {isScanning && (
                    <div className="w-full max-w-xs space-y-1">
                      <div className="flex justify-between text-[10px] text-text-secondary font-medium">
                        <span>Reading passport data...</span>
                        <span>{Math.round(ocrProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
                      </div>
                    </div>
                  )}
                  {!isScanning && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle size={14} /> Scan Complete & Extracted!
                    </span>
                  )}
                </div>
              )}

              {scanError && (
                <div className="text-xs text-red-600 font-medium bg-red-50 p-2.5 rounded-lg border border-red-100">
                  {scanError}
                </div>
              )}
            </div>

            {/* Passport Number Search input */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Passport Number
              </label>
              <div className="relative">
                <Input
                  placeholder="Type passport number to search or pre-register..."
                  value={passportNumber}
                  onChange={(e) => {
                    setPassportNumber(e.target.value.toUpperCase());
                    if (selectedCandidate) handleClearSelection();
                  }}
                  disabled={!!selectedCandidate}
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-text-tertiary">
                  {isSearching ? (
                    <RefreshCw size={16} className="animate-spin text-primary" />
                  ) : (
                    <Search size={16} />
                  )}
                </div>
              </div>

              {/* Autocomplete dropdown list */}
              {showDropdown && (
                <div className="absolute left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-border/50 animate-dropdown">
                  {searchResults.map((c) => (
                    <button
                      key={`${c.source}-${c.id}`}
                      type="button"
                      onClick={() => handleSelectCandidate(c)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-primary-50/50 transition-colors duration-150 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary overflow-hidden border border-border">
                          {c.passportImageUrl ? (
                            <img src={getFileUrl(c.passportImageUrl)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={16} />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                            {c.passportNumber}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            {c.fullName} • {c.nationality}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                          c.source === 'candidate'
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        )}>
                          {c.source === 'candidate' ? 'Full candidate' : 'Entry Record'}
                        </span>
                        <ChevronRight size={14} className="text-text-tertiary group-hover:text-primary transition-transform duration-150 group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Candidate Badge */}
            {selectedCandidate && (
              <div className="flex items-center justify-between p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl animate-scale-pop">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-indigo-600 shrink-0" size={18} />
                  <div>
                    <p className="text-xs font-bold text-indigo-900">LINKED CANDIDATE ACTIVE</p>
                    <p className="text-sm font-semibold text-indigo-950 mt-0.5">
                      {selectedCandidate.passportNumber} — {selectedCandidate.fullName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors uppercase tracking-wider shrink-0 ml-4 hover:underline"
                >
                  Change
                </button>
              </div>
            )}

            {/* Manual Entry Hint */}
            {!selectedCandidate && passportNumber.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="flex items-center gap-2 p-3 bg-amber-50/60 border border-amber-100 rounded-xl text-xs text-amber-800 animate-fade-in">
                <PlusCircle size={14} className="text-amber-600 shrink-0" />
                <span>
                  No matching candidate found. <strong>"{passportNumber.trim().toUpperCase()}"</strong> will be pre-registered when you submit.
                </span>
              </div>
            )}
          </div>

          {/* Form Section 2: Upload Video File */}
          <div className="space-y-4 border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-50 text-primary text-xs font-bold">2</span>
              <h3 className="text-base font-semibold text-text-primary">Upload Video File</h3>
            </div>

            <div>
              <FileUpload
                label="Candidate Video"
                shape="rect"
                compact
                accept="video/*"
                preview={videoPreview}
                onFileSelect={handleVideoSelect}
                onClear={handleClearVideo}
                helperText="Supports MP4, WebM, MOV — Max 50MB"
              />
            </div>
          </div>

          {/* Form Section 3: Photo Uploads */}
          <div className="space-y-4 border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-50 text-primary text-xs font-bold">3</span>
              <h3 className="text-base font-semibold text-text-primary">Upload Photos <span className="text-text-tertiary font-normal text-sm">(Optional)</span></h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Face Photo */}
              <div className="space-y-2">
                <FileUpload
                  label="Face Photo"
                  shape="circle"
                  preview={facePhotoPreview}
                  onFileSelect={handleFaceSelect}
                  onClear={handleClearFace}
                  helperText="Circle crop — Max 50MB"
                />
                {facePhotoPreview && (
                  <button
                    type="button"
                    onClick={() => setViewingImage({ url: facePhotoPreview, title: 'Face Photo' })}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                  >
                    <Eye size={14} /> View Full Image
                  </button>
                )}
              </div>

              {/* Full Body Photo */}
              <div className="space-y-2">
                <FileUpload
                  label="Full Body Photo"
                  shape="rect"
                  compact
                  preview={fullBodyPhotoPreview}
                  onFileSelect={handleFullBodySelect}
                  onClear={handleClearFullBody}
                  helperText="Rectangle — Max 50MB"
                />
                {fullBodyPhotoPreview && (
                  <button
                    type="button"
                    onClick={() => setViewingImage({ url: fullBodyPhotoPreview, title: 'Full Body Photo' })}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                  >
                    <Eye size={14} /> View Full Image
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Alert / Notification Feedback */}
          {message && (
            <div className={cn(
              "p-4 rounded-xl text-sm border animate-scale-pop flex items-start gap-2.5",
              message.type === 'success'
                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                : "bg-red-50 text-red-800 border-red-100"
            )}>
              {message.type === 'success' ? (
                <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={18} />
              ) : (
                <HelpCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
              )}
              <p className="font-medium leading-relaxed">{message.text}</p>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full py-3 px-4 rounded-xl font-semibold text-sm text-white shadow-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer",
                isSubmitting
                  ? "bg-primary/70 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/95 active:scale-[0.98] hover:shadow-md"
              )}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Saving Video & Photos...
                </>
              ) : (
                <>
                  <FileVideo size={16} />
                  Push Video
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Image View Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="relative bg-surface rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-primary" />
                <h3 className="text-sm font-bold text-text-primary">{viewingImage.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingImage(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-text-secondary hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex items-center justify-center bg-gray-50 max-h-[75vh] overflow-auto">
              <img
                src={viewingImage.url}
                alt={viewingImage.title}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
