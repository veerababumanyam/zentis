import React from 'react';
import type { SmartSummaryHighlight } from '../types';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { PillIcon } from './icons/PillIcon';
import { HeartPulseIcon } from './icons/HeartPulseIcon';
import { ImageIcon } from './icons/ImageIcon';

interface HighlightIconProps {
  iconType: SmartSummaryHighlight['icon'];
  className?: string;
}

export const HighlightIcon: React.FC<HighlightIconProps> = ({ iconType, className = "w-5 h-5" }) => {
    switch (iconType) {
        case 'alert':
            return <AlertTriangleIcon className={className} />;
        case 'labs':
            return <BeakerIcon className={className} />;
        case 'meds':
            return <PillIcon className={className} />;
        case 'vitals':
            return <HeartPulseIcon className={className} />;
        case 'echo':
            return <ImageIcon className={className} />;
        default:
            return null;
    }
};