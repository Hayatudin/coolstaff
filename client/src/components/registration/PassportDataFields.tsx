'use client';

import React from 'react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PassportData } from '@/types';

interface PassportDataFieldsProps {
  data: PassportData;
  onChange: (field: keyof PassportData, value: string) => void;
  animatingFields: Set<string>;
  isExtracted: boolean;
}

export default function PassportDataFields({
  data,
  onChange,
  animatingFields,
  isExtracted,
}: PassportDataFieldsProps) {
  const fields: { key: keyof PassportData; label: string; type?: string }[] = [
    { key: 'passportNumber', label: 'Passport Number' },
    { key: 'surname', label: 'Surname' },
    { key: 'givenNames', label: 'Given Names' },
    { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
    { key: 'gender', label: 'Gender' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'dateOfExpiry', label: 'Date of Expiry', type: 'date' },
  ];

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-6 bg-primary rounded-full" />
        <h3 className="text-lg font-semibold text-text-primary">Extracted Passport Data</h3>
        {isExtracted && (
          <span className="px-2.5 py-0.5 bg-success-light text-green-700 text-xs font-medium rounded-full animate-scale-pop">
            Auto-filled
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {fields.map((field, index) => (
          <div
            key={field.key}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {field.key === 'gender' ? (
              <Select
                label={field.label}
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                ]}
                value={data.gender || ''}
                onChange={(val) => onChange('gender', val)}
                disabled={animatingFields.has('gender')}
              />
            ) : (
              <Input
                label={field.label}
                type={field.type || 'text'}
                value={data[field.key]}
                onChange={(e) => onChange(field.key, e.target.value)}
                animating={animatingFields.has(field.key)}
                readOnly={animatingFields.has(field.key)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
