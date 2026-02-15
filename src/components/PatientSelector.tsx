
import React, { useRef, useEffect, useMemo } from 'react';
import type { Patient } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { LogoIcon } from './icons/LogoIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { useTheme } from '../hooks/useTheme';
import { SunIcon } from './icons/SunIcon';
import { BRAND_NAME } from '../constants/branding';
import { MoonIcon } from './icons/MoonIcon';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

interface CategorizedAgenda {
  upcomingInFocus: Patient[];
  recentlySeen: Patient[];
  earlierToday: Patient[];
  laterToday: Patient[];
  currentAppointmentPatientId: string | null;
}

const useCategorizedAgenda = (patients: Patient[], currentTime: string): CategorizedAgenda => {
  return useMemo(() => {
    const sortedPatients = [...patients].sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
    const now = parseInt(currentTime.replace(':', ''), 10);
    const oneHour = 100;

    const focusStart = now - oneHour;

    let currentAppointmentPatientIndex = sortedPatients.findIndex(p => parseInt(p.appointmentTime.replace(':', ''), 10) >= now);
    if (currentAppointmentPatientIndex === -1 && sortedPatients.length > 0) {
      currentAppointmentPatientIndex = sortedPatients.length - 1;
    }
    const currentAppointmentPatientId = sortedPatients[currentAppointmentPatientIndex]?.id || null;

    const categorized: Omit<CategorizedAgenda, 'currentAppointmentPatientId'> = {
      upcomingInFocus: [],
      recentlySeen: [],
      earlierToday: [],
      laterToday: [],
    };

    sortedPatients.forEach(p => {
      const patientTime = parseInt(p.appointmentTime.replace(':', ''), 10);

      if (patientTime >= now) {
        // All future patients go to "Up Next"
        categorized.upcomingInFocus.push(p);
      } else {
        // Past patients
        if (patientTime >= focusStart) {
          categorized.recentlySeen.push(p);
        } else {
          categorized.earlierToday.push(p);
        }
      }
    });

    categorized.recentlySeen.reverse();

    return { ...categorized, currentAppointmentPatientId };
  }, [patients, currentTime]);
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};


const PatientSkeleton: React.FC = () => (
  <div className="flex flex-col h-full animate-pulse">
    <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
      <div className="w-3/4 h-8 bg-gray-200/50 dark:bg-gray-700/50 rounded-lg"></div>
    </div>
    <div className="p-4">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Patients</h2>
      <div className="relative mb-4">
        <div className="w-full h-10 bg-gray-200/50 dark:bg-gray-700/50 rounded-xl"></div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 -mr-4 pr-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-full p-3 rounded-2xl bg-gray-200/30 dark:bg-gray-700/30 flex items-start space-x-3 mb-2">
            <div className="w-12 h-10 bg-gray-300/50 dark:bg-gray-600/50 rounded-lg"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="w-3/4 h-4 bg-gray-300/50 dark:bg-gray-600/50 rounded"></div>
              <div className="w-1/2 h-3 bg-gray-300/50 dark:bg-gray-600/50 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

interface AgendaSectionProps {
  title: string;
  patients: Patient[];
  selectedPatient: Patient | null;
  onSelectPatient: (patientId: string) => void;
  currentAppointmentPatientId: string | null;
  isOutOfFocus?: boolean;
  itemRef?: React.RefObject<HTMLButtonElement>;
}

const AgendaSection: React.FC<AgendaSectionProps> = React.memo(({ title, patients, selectedPatient, onSelectPatient, currentAppointmentPatientId, isOutOfFocus = false, itemRef }) => {
  if (patients.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-widest px-2 backdrop-blur-sm sticky top-0 z-10">
        {title}
      </h3>
      <div className="space-y-2" role="list">
        {patients.map(patient => (
          <PatientListItem
            key={patient.id}
            patient={patient}
            selectedPatient={selectedPatient}
            currentAppointmentPatientId={currentAppointmentPatientId}
            isOutOfFocus={isOutOfFocus}
            onSelectPatient={onSelectPatient}
            itemRef={patient.id === currentAppointmentPatientId ? itemRef : undefined}
          />
        ))}
      </div>
    </div>
  );
});


const PatientListItem: React.FC<{
  patient: Patient;
  selectedPatient: Patient | null;
  currentAppointmentPatientId: string | null;
  isOutOfFocus: boolean;
  onSelectPatient: (patientId: string) => void;
  itemRef?: React.RefObject<HTMLButtonElement>;
}> = React.memo(({ patient, selectedPatient, currentAppointmentPatientId, isOutOfFocus, onSelectPatient, itemRef }) => {

  const isSelected = selectedPatient?.id === patient.id;
  const isCurrent = currentAppointmentPatientId === patient.id;

  const getDynamicClasses = () => {
    if (isSelected) {
      return 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-xl shadow-blue-500/30 border-transparent transform scale-[1.02] z-10';
    }
    if (isCurrent) {
      return 'bg-blue-50/80 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100 border-l-4 border-blue-500 shadow-md hover:shadow-lg';
    }
    if (isOutOfFocus) {
      return 'bg-white/40 dark:bg-gray-800/30 hover:bg-white/60 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400 backdrop-blur-sm border border-transparent hover:shadow-md';
    }
    return 'bg-white/60 dark:bg-gray-800/50 hover:bg-white/90 dark:hover:bg-gray-800/80 text-gray-800 dark:text-gray-200 backdrop-blur-md shadow-sm hover:shadow-lg hover:-translate-y-0.5 border border-white/40 dark:border-gray-700/40';
  };

  return (
    <button
      type="button"
      ref={itemRef}
      onClick={() => onSelectPatient(patient.id)}
      aria-selected={isSelected}
      role="listitem"
      title={`Select ${patient.name} - ${patient.currentStatus.condition}`}
      className={`w-full text-left p-3 rounded-2xl transition-all duration-300 flex items-center justify-between cursor-pointer relative group
        outline-none
        focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900
        ${getDynamicClasses()}`}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className={`font-mono text-xs w-12 text-center flex-shrink-0 py-1 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100/50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400'} shadow-inner`}>
          <span className="font-bold">
            {patient.appointmentTime}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <p className="font-bold truncate text-sm">{patient.name}</p>
            {patient.pendingLabs && patient.pendingLabs.length > 0 && (
              <div className="ml-2 flex items-center group/tooltip relative" title={`Waiting on: ${patient.pendingLabs.join(', ')}`}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSelected ? 'bg-white' : 'bg-amber-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSelected ? 'bg-white' : 'bg-amber-500'}`}></span>
                </span>
              </div>
            )}
          </div>
          <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
            {patient.age}, {patient.gender} • {patient.currentStatus.condition}
          </p>
        </div>
      </div>
      {isCurrent && !isSelected && (
        <span className="absolute top-2 right-2 text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full shadow-sm">
          NEXT
        </span>
      )}
    </button>
  );
});


export const PatientSelector: React.FC = () => {
  const { state, actions } = useAppContext();
  const { logout } = useAuth();
  const { allPatients, selectedPatient, searchQuery, isAppLoading, isPatientListCollapsed } = state;
  const currentTime = '10:20';

  const categorizedAgenda = useCategorizedAgenda(allPatients, currentTime);

  const searchedPatients = useMemo(() => {
    if (!searchQuery) return null;
    const lowerQuery = searchQuery.toLowerCase();
    return allPatients.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      String(p.age).includes(lowerQuery) ||
      p.gender.toLowerCase().includes(lowerQuery) ||
      p.currentStatus.condition.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, allPatients]);

  const currentPatientRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (currentPatientRef.current && !searchQuery) {
      setTimeout(() => {
        currentPatientRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [categorizedAgenda.currentAppointmentPatientId, searchQuery]);

  if (isAppLoading) {
    return <PatientSkeleton />;
  }

  const hasPatientsOnAgenda = [
    categorizedAgenda.upcomingInFocus,
    categorizedAgenda.recentlySeen,
    categorizedAgenda.laterToday,
    categorizedAgenda.earlierToday,
  ].some(section => section.length > 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className={`z-20 flex items-center p-4 -mx-4 -mt-4 mb-2 transition-all ${isPatientListCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center" title="Zentis AI Assistant">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center transform rotate-3 flex-shrink-0">
            <LogoIcon className="w-6 h-6 text-white" />
          </div>
          {!isPatientListCollapsed && (
            <div className="ml-3">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">Zentis</h1>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 tracking-wider">AI ASSISTANT</span>
            </div>
          )}
        </div>
        {!isPatientListCollapsed && (
          <div className="flex items-center space-x-1">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
            </button>
            <button
              onClick={actions.togglePerformanceModal}
              className="p-2 text-gray-500 dark:text-gray-400 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="AI Performance & Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button
              onClick={logout}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
              title="Sign Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        )}
      </header>

      {!isPatientListCollapsed && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Patients</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={actions.toggleHuddleModal}
                className="glass-card flex items-center space-x-2 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all border border-blue-200/50 dark:border-blue-800/50 shadow-sm hover:shadow-md"
                title="View Daily Huddle Summary"
              >
                <ClipboardListIcon className="w-4 h-4" />
                <span>Huddle</span>
              </button>
              <button
                onClick={actions.toggleConsultationModal}
                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-1.5 rounded-full hover:scale-105 transition-transform shadow-lg"
                title="Start New Patient Consultation"
              >
                <PlusCircleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative mb-6 mx-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => actions.setSearchQuery(e.target.value)}
              title="Search by name, age, or condition"
              className="w-full pl-9 pr-4 py-2.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:outline-none text-sm transition-all shadow-inner focus:bg-white dark:focus:bg-gray-800"
            />
          </div>

          <div className="flex-1 overflow-y-auto -mr-4 pr-4 custom-scrollbar pb-4">
            {searchQuery ? (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-widest px-2">
                  Search Results
                </h3>
                {searchedPatients && searchedPatients.length > 0 ? (
                  searchedPatients.map((patient) => (
                    <PatientListItem
                      key={patient.id}
                      patient={patient}
                      selectedPatient={selectedPatient}
                      currentAppointmentPatientId={categorizedAgenda.currentAppointmentPatientId}
                      isOutOfFocus={false}
                      onSelectPatient={actions.selectPatient}
                    />
                  ))
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-8 p-4 glass-card rounded-xl mx-2">
                    <p>No patients found.</p>
                  </div>
                )}
              </div>
            ) : hasPatientsOnAgenda ? (
              <>
                <AgendaSection title="Up Next" patients={categorizedAgenda.upcomingInFocus} selectedPatient={selectedPatient} onSelectPatient={actions.selectPatient} currentAppointmentPatientId={categorizedAgenda.currentAppointmentPatientId} itemRef={currentPatientRef} />
                <AgendaSection title="Recently Seen" patients={categorizedAgenda.recentlySeen} selectedPatient={selectedPatient} onSelectPatient={actions.selectPatient} currentAppointmentPatientId={categorizedAgenda.currentAppointmentPatientId} />
                <AgendaSection title="Later Today" patients={categorizedAgenda.laterToday} selectedPatient={selectedPatient} onSelectPatient={actions.selectPatient} currentAppointmentPatientId={categorizedAgenda.currentAppointmentPatientId} isOutOfFocus />
                <AgendaSection title="Earlier Today" patients={categorizedAgenda.earlierToday} selectedPatient={selectedPatient} onSelectPatient={actions.selectPatient} currentAppointmentPatientId={categorizedAgenda.currentAppointmentPatientId} isOutOfFocus />
              </>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-8 p-6 glass-card rounded-xl mx-2 flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-3">
                  <ClipboardListIcon className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-sm font-medium mb-1">Your patient list is empty.</p>
                <p className="text-xs opacity-70 mb-4">Start by adding your first patient.</p>
                <button
                  onClick={actions.toggleConsultationModal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2"
                >
                  <PlusCircleIcon className="w-4 h-4" />
                  Add Patient
                </button>
              </div>
            )
            }
          </div>
        </div>
      )}

      {isPatientListCollapsed && (
        <div className="flex flex-col items-center flex-1 py-4 w-full h-full">
          {/* Top Actions */}
          <div className="flex flex-col items-center space-y-3 flex-shrink-0">
            <button
              onClick={actions.toggleHuddleModal}
              className="flex flex-col items-center justify-center p-2 text-blue-600 bg-blue-100/50 dark:bg-blue-900/30 rounded-xl hover:scale-110 transition-transform shadow-md gap-0.5 w-12 h-12"
              title="Daily Huddle: View morning report"
            >
              <ClipboardListIcon className="w-5 h-5" />
              <span className="text-[9px] font-bold">Huddle</span>
            </button>
            <button
              onClick={actions.toggleConsultationModal}
              className="flex flex-col items-center justify-center p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors gap-0.5 w-12 h-12"
              title="New Consultation: Add a new patient"
            >
              <PlusCircleIcon className="w-6 h-6" />
              <span className="text-[9px] font-medium">New</span>
            </button>
          </div>

          {/* Compact Patient List */}
          <div className="flex-1 w-full my-4 overflow-y-auto no-scrollbar space-y-3 flex flex-col items-center px-1">
            <div className="h-px w-full bg-gray-200 dark:bg-gray-700 my-2 flex-shrink-0" />
            {allPatients.map(p => {
              const isSelected = selectedPatient?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => actions.selectPatient(p.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-sm relative group flex-shrink-0
                                ${isSelected
                      ? 'bg-blue-600 text-white shadow-blue-500/40 ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-900'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                >
                  {getInitials(p.name)}

                  {/* Hover Tooltip */}
                  <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                    <p className="font-bold">{p.name}</p>
                    <p className="text-gray-400">{p.appointmentTime} • {p.age}{p.gender[0]}</p>
                    <p className="mt-1 text-[10px] text-gray-300">{p.currentStatus.condition}</p>
                    {/* Arrow */}
                    <div className="absolute top-1/2 -left-1 -mt-1 border-4 border-transparent border-r-gray-900"></div>
                  </div>
                </button>
              );
            })}
            <div className="h-px w-full bg-gray-200 dark:bg-gray-700 my-2 flex-shrink-0" />
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col items-center space-y-2 flex-shrink-0">
            <button
              onClick={toggleTheme}
              className="flex flex-col items-center justify-center p-2 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-12 h-12 gap-0.5"
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
              <span className="text-[9px] font-medium">{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>
            <button
              onClick={actions.togglePerformanceModal}
              className="flex flex-col items-center justify-center p-2 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-12 h-12 gap-0.5"
              title="Settings & AI Performance"
            >
              <SettingsIcon className="w-5 h-5" />
              <span className="text-[9px] font-medium">Config</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
