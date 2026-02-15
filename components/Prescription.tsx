import React from 'react';
import type { PrescriptionMessage } from '../types';
import { PrescriptionIcon } from './icons/PrescriptionIcon';

interface PrescriptionProps {
  message: PrescriptionMessage;
}

export const Prescription: React.FC<PrescriptionProps> = React.memo(({ message }) => {
  return (
    <div className="bg-white rounded-lg border-2 border-blue-200 shadow-md my-2 font-serif text-gray-800">
        <header className="p-3 border-b-2 border-blue-200 bg-blue-50/50 flex items-center justify-between">
            <div>
                <h3 className="font-bold text-lg text-blue-800">{message.doctorInfo.name}, {message.doctorInfo.credentials}</h3>
                <p className="text-xs text-gray-600">Cardiology Associates - {message.doctorInfo.contact}</p>
            </div>
            <PrescriptionIcon className="w-10 h-10 text-blue-400" />
        </header>

        <div className="p-4 border-b border-gray-200 flex justify-between items-baseline text-sm">
            <div>
                <span className="font-semibold">Patient:</span> {message.patientName}
            </div>
             <div>
                <span className="font-semibold">Date:</span> {message.date}
            </div>
        </div>

        <div className="p-4">
            <div className="space-y-4">
                {message.medications.map((med, index) => (
                    <div key={index} className="flex items-start">
                        <div className="font-bold text-3xl text-blue-600 mr-3 mt-1">Rx</div>
                        <div className="flex-1 border-b border-gray-200 pb-2">
                            <p className="font-bold text-base">{med.name} {med.dosage}</p>
                            <p className="text-sm text-gray-600">
                                Sig: Take one tablet by mouth, {med.frequency.toLowerCase()}, in the {med.timing.toLowerCase()}.
                                {med.instructions && ` ${med.instructions}.`}
                            </p>
                            <div className="mt-2 text-xs flex justify-between">
                                <span>REFILLS: 3</span>
                                <span>QTY: 90 (NINETY)</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {message.notesToPharmacist && (
                <div className="mt-4 pt-3 border-t border-dashed">
                    <p className="text-xs text-gray-500"><span className="font-semibold">Notes to Pharmacist:</span> {message.notesToPharmacist}</p>
                </div>
            )}
        </div>

        <footer className="p-4 mt-4 flex justify-end items-center">
             <div className="w-2/3 border-t-2 border-gray-400 text-center pt-1">
                <p className="text-sm font-semibold">{message.doctorInfo.name}, {message.doctorInfo.credentials}</p>
                <p className="text-xs text-gray-500">(Substitution Permissible)</p>
             </div>
        </footer>
    </div>
  );
});
