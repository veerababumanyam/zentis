import React from 'react';
import { useInView } from './LandingUtils';
import { MicrophoneIcon } from '../icons/MicrophoneIcon';
import { EyeIcon } from '../icons/SpecialtyIcons';
import { HeartPulseIcon } from '../icons/HeartPulseIcon';

/* ─── Biomarker Item ────────────────────────────────────────── */

const BiomarkerItem: React.FC<{ label: string; sub: string; dotColor?: string }> = ({ label, sub, dotColor = 'bg-blue-500' }) => (
    <div className="flex items-start space-x-3 p-3.5 rounded-xl landing-glass-card border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:scale-[1.02] cursor-default group">
        <div className={`w-2.5 h-2.5 rounded-full ${dotColor} mt-1.5 flex-shrink-0 shadow-[0_0_10px_currentColor] group-hover:scale-125 transition-transform duration-300`} />
        <div>
            <p className="text-white font-semibold text-sm tracking-wide">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5 group-hover:text-gray-400 transition-colors duration-300">{sub}</p>
        </div>
    </div>
);

/* ─── Biomarker Detection Section ───────────────────────────── */

export const BiomarkerSection: React.FC = () => {
    const { ref: headerRef, isVisible: headerVisible } = useInView();
    const { ref: hudRef, isVisible: hudVisible } = useInView();

    return (
        <section id="biomarkers" className="px-5 md:px-8 py-24 md:py-32 relative" aria-labelledby="biomarkers-heading">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24 items-center">
                    {/* Left: Content */}
                    <div
                        ref={headerRef}
                        className={`transition-all duration-1000 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                    >
                        <div className="inline-flex items-center px-4 py-2 rounded-full border border-rose-400/20 bg-rose-500/[0.08] text-rose-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                            Real-Time Detection
                        </div>
                        <h2 id="biomarkers-heading" className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                            Advanced{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-purple-400">Biomarker Detection</span>
                        </h2>
                        <p className="text-gray-400 mb-10 leading-relaxed text-lg font-light">
                            The AI Agent passively analyzes voice acoustics, facial expressions, and visual signs to detect medical and emotional symptoms in real-time.
                        </p>

                        <div className="space-y-10">
                            <div>
                                <h3 className="flex items-center text-blue-400 font-bold uppercase text-xs tracking-[0.2em] mb-5">
                                    <MicrophoneIcon className="w-4 h-4 mr-2" /> Voice-Based Biomarkers
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <BiomarkerItem label="Dyspnea" sub="Breathiness, short phrases, gasping" />
                                    <BiomarkerItem label="Dysarthria" sub="Slurred speech, neurological signs" />
                                    <BiomarkerItem label="Stress / Anxiety" sub="Pressured speech, pitch variability" />
                                    <BiomarkerItem label="Pain / Fatigue" sub="Strained tone, monotone energy" />
                                </div>
                            </div>

                            <div>
                                <h3 className="flex items-center text-purple-400 font-bold uppercase text-xs tracking-[0.2em] mb-5">
                                    <EyeIcon className="w-4 h-4 mr-2" /> Visual Biomarkers
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <BiomarkerItem label="Dermatologic" sub="Cyanosis, Jaundice, Pallor" dotColor="bg-purple-500" />
                                    <BiomarkerItem label="Neurological" sub="Facial asymmetry, Tremors" dotColor="bg-purple-500" />
                                    <BiomarkerItem label="Cardio-Respiratory" sub="JVD, Tripoding, Pedal Edema" dotColor="bg-purple-500" />
                                    <BiomarkerItem label="Acute Distress" sub="Diaphoresis, Pursed-lip breathing" dotColor="bg-purple-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Live HUD Visualization */}
                    <div
                        ref={hudRef}
                        className={`relative group transition-all duration-1000 delay-200 ${hudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    >
                        {/* Glow backdrop */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-[60px] opacity-15 group-hover:opacity-30 transition-opacity duration-700" aria-hidden="true" />

                        <div className="relative landing-glass-card border border-white/[0.1] rounded-3xl p-8 shadow-2xl overflow-hidden group-hover:border-white/[0.18] transition-all duration-500">
                            {/* HUD Scan Line */}
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-60 landing-scan-line" aria-hidden="true" />

                            <div className="flex justify-between items-center mb-8 border-b border-white/[0.06] pb-4">
                                <div className="flex items-center space-x-3 text-white">
                                    <HeartPulseIcon className="w-6 h-6 text-red-500 animate-pulse" />
                                    <span className="font-bold text-sm tracking-widest uppercase">Live Bio-Signal HUD</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                    <div className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-md border border-red-500/30">REC</div>
                                </div>
                            </div>

                            <div className="space-y-3" role="list" aria-label="Detected biomarkers">
                                <div role="listitem" className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-transparent border-l-4 border-red-500 hover:bg-red-500/20 transition-colors duration-300">
                                    <div>
                                        <div className="text-white text-sm font-bold">Dyspnea Detected</div>
                                        <div className="text-red-300/60 text-xs">Audio Analysis • Breathiness</div>
                                    </div>
                                    <div className="text-red-400 text-[10px] font-bold border border-red-500/30 px-2 py-1 rounded-md bg-red-500/10">HIGH CONFIDENCE</div>
                                </div>
                                <div role="listitem" className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-transparent border-l-4 border-yellow-500 hover:bg-yellow-500/20 transition-colors duration-300">
                                    <div>
                                        <div className="text-white text-sm font-bold">Mild Tremor (Hand)</div>
                                        <div className="text-yellow-300/60 text-xs">Video Analysis • Frequency 5Hz</div>
                                    </div>
                                    <div className="text-yellow-400 text-[10px] font-bold border border-yellow-500/30 px-2 py-1 rounded-md bg-yellow-500/10">MEDIUM</div>
                                </div>
                                <div role="listitem" className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-transparent border-l-4 border-blue-500 hover:bg-blue-500/20 transition-colors duration-300">
                                    <div>
                                        <div className="text-white text-sm font-bold">Cyanosis (Lips)</div>
                                        <div className="text-blue-300/60 text-xs">Video Analysis • Colorimetry</div>
                                    </div>
                                    <div className="text-blue-400 text-[10px] font-bold border border-blue-500/30 px-2 py-1 rounded-md bg-blue-500/10">VISUAL SIGN</div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/[0.06]">
                                <p className="text-gray-400 text-xs leading-relaxed font-mono">
                                    <span className="text-blue-400 font-bold mr-2">AI INSIGHT:</span>
                                    Patient shows signs of acute respiratory distress correlating with visible cyanosis. Cross-referencing with HFrEF history suggests potential decompensation.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
