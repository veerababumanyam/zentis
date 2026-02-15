





import React from 'react';
import type { Report } from '../../types';
import { HeartPulseIcon } from './HeartPulseIcon';
import { BeakerIcon } from './BeakerIcon';
import { ImageIcon } from './ImageIcon';
import { PillIcon } from './PillIcon';
import { DocumentIcon } from './DocumentIcon';
import { CtaIcon } from './CtaIcon';
import { HeartPumpIcon } from './HeartPumpIcon';
import { PacemakerIcon } from './PacemakerIcon';
import { StentIcon } from './StentIcon';
import { DicomIcon } from './DicomIcon';
import { PdfIcon } from './PdfIcon';

export const ReportTypeIcon: React.FC<{ type: Report['type'], className?: string }> = ({ type, className = "w-5 h-5" }) => {
    switch (type) {
        case 'ECG': return <HeartPulseIcon className={className} />;
        case 'Lab': return <BeakerIcon className={className} />;
        case 'Echo': return <ImageIcon className={className} />;
        case 'Imaging': return <ImageIcon className={className} />;
        case 'Meds': return <PillIcon className={className} />;
        case 'CTA': return <CtaIcon className={className} />;
        case 'Cath': return <StentIcon className={className} />;
        case 'Device': return <PacemakerIcon className={className} />;
        case 'HF Device': return <HeartPumpIcon className={className} />;
        case 'DICOM': return <DicomIcon className={className} />;
        case 'PDF': return <PdfIcon className={className} />;
        default: return <DocumentIcon className={className} />;
    }
};