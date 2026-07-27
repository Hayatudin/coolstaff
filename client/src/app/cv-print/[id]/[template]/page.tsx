'use client';

import { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import ALMTemplate from '@/components/cv/templates/ALMTemplate';
import AlmalaTemplate from '@/components/cv/templates/AlmalaTemplate';
import AlShablanTemplate from '@/components/cv/templates/AlShablanTemplate';
import KA7Template from '@/components/cv/templates/KA7Template';
import KU2Template from '@/components/cv/templates/KU2Template';
import MATemplate from '@/components/cv/templates/MATemplate';
import RATemplate from '@/components/cv/templates/RATemplate';
import UssusTemplate from '@/components/cv/templates/UssusTemplate';
import VisionTemplate from '@/components/cv/templates/VisionTemplate';

const TEMPLATE_COMPONENTS: Record<string, any> = {
  'alm': ALMTemplate,
  'almala': AlmalaTemplate,
  'al-shablan': AlShablanTemplate,
  'ka7': KA7Template,
  'ku2': KU2Template,
  'ma': MATemplate,
  'ra': RATemplate,
  'ussus': UssusTemplate,
  'vision': VisionTemplate,
};

import { getFileUrl, convertImageToBase64 } from '@/lib/utils';

export default function CVPrintPage({ params }: { params: Promise<{ id: string; template: string }> }) {
  const { id, template } = use(params);
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<{ face: string | null; body: string | null; passport: string | null }>({ face: null, body: null, passport: null });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api(`/api/candidates/${id}`);
        const data = await res.json();
        
        // Preload images to Base64 to ensure they are fully loaded before rendering
        const faceUrl = getFileUrl(data.facePhotoUrl || data.passportImageUrl);
        const bodyUrl = getFileUrl(data.fullBodyPhotoUrl);
        const passportUrl = getFileUrl(data.passportImageUrl);

        const [face, body, passport] = await Promise.all([
          convertImageToBase64(faceUrl),
          convertImageToBase64(bodyUrl),
          convertImageToBase64(passportUrl)
        ]);

        setImages({ face, body, passport });
        setCandidate({
          ...data,
          passportImageUrl: passport || getFileUrl(data.passportImageUrl)
        });
      } catch (err) {
        console.error('Failed to fetch candidate:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <div className="p-10 flex items-center justify-center min-h-screen text-gray-500">Loading CV images...</div>;
  if (!candidate) return <div className="p-10">Candidate not found</div>;

  const TemplateComponent = TEMPLATE_COMPONENTS[template] || ALMTemplate;

  return (
    <div className="bg-white min-h-screen">
      <style jsx global>{`
        @page {
          size: A4;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
        }
        #cv-container {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          box-shadow: none !important;
        }
      `}</style>
      <div id="cv-container">
        <TemplateComponent 
          candidate={candidate} 
          facePhoto={images.face || getFileUrl(candidate.facePhotoUrl || candidate.passportImageUrl)} 
          fullBodyPhoto={images.body || getFileUrl(candidate.fullBodyPhotoUrl)} 
        />
      </div>
    </div>
  );
}
