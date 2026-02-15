
import React from 'react';
import { BotIcon } from './icons/BotIcon';
import { HeartPulseIcon } from './icons/HeartPulseIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { RadioIcon } from './icons/RadioIcon';
import { EyeIcon, BrainIcon, KidneyIcon, DnaIcon, LungsIcon, DropIcon, BugIcon, StomachIcon, JointIcon, ElderIcon } from './icons/SpecialtyIcons';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { StentIcon } from './icons/StentIcon';
import { PacemakerIcon } from './icons/PacemakerIcon';
import { HeartPumpIcon } from './icons/HeartPumpIcon';

interface LandingPageProps {
    onEnter: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
    <div className="group relative p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10">
            <div className="mb-4 p-3 rounded-full bg-blue-500/20 w-fit text-blue-400 group-hover:text-blue-300 group-hover:bg-blue-500/30 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-100 transition-colors">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300">{description}</p>
        </div>
    </div>
);

const SpecialtyCard: React.FC<{ icon: React.ReactNode, title: string, desc: string, color: string }> = ({ icon, title, desc, color }) => (
    <div className="flex items-start p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group cursor-default">
        <div className={`mt-1 mr-3 p-2 rounded-lg bg-black/30 ${color} shadow-sm group-hover:scale-110 transition-transform`}>
            {icon}
        </div>
        <div>
            <h4 className="text-white font-bold text-sm tracking-wide group-hover:text-blue-200 transition-colors">{title}</h4>
            <p className="text-gray-500 text-xs mt-1.5 leading-relaxed group-hover:text-gray-400">{desc}</p>
        </div>
    </div>
);

const BiomarkerItem: React.FC<{ label: string, sub: string; dotColor?: string }> = ({ label, sub, dotColor = "bg-blue-500" }) => (
    <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] cursor-default">
        <div className={`w-2 h-2 rounded-full ${dotColor} mt-2 flex-shrink-0 shadow-[0_0_8px_currentColor]`}></div>
        <div>
            <p className="text-white font-semibold text-sm tracking-wide">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
        </div>
    </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
    return (
        <div className="w-full h-full overflow-y-auto custom-scrollbar relative z-20 bg-gray-950/80 backdrop-blur-sm text-white font-sans selection:bg-blue-500/30">
            
            {/* Ambient Glows specific to Landing Page */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10 pointer-events-none opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

            {/* Nav */}
            <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full relative z-50">
                <div className="flex items-center space-x-3 group cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
                        <BotIcon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight group-hover:text-blue-200 transition-colors">MediSnap AI</span>
                </div>
                <button 
                    onClick={onEnter}
                    className="px-6 py-2.5 rounded-full bg-white/10 text-white font-medium hover:bg-white/20 transition-all border border-white/10 text-sm backdrop-blur-md hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                    Sign In
                </button>
            </nav>

            {/* Hero */}
            <section className="relative pt-24 pb-32 px-6 flex flex-col items-center text-center max-w-5xl mx-auto z-10">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300 text-xs font-bold uppercase tracking-widest mb-8 animate-fadeIn shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                    <SparklesIcon className="w-3.5 h-3.5 mr-2 animate-pulse" />
                    Next Gen Healthcare
                </div>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-gray-400 mb-8 tracking-tight leading-[1.1] drop-shadow-2xl animate-slideUpFade">
                    The Future of Health<br /> is Conversational.
                </h1>
                <p className="text-lg md:text-xl text-gray-400 max-w-3xl mb-12 leading-relaxed animate-slideUpFade delay-100 font-light">
                    An intelligent co-pilot that transforms complex patient data into actionable insights. 
                    Featuring <span className="text-blue-400 font-semibold glow-text">Live Bio-Signals</span>, <span className="text-purple-400 font-semibold glow-text">Multi-Agent Medical Boards</span>, and real-time critics.
                </p>
                <div className="flex flex-col sm:flex-row gap-5 animate-slideUpFade delay-200 w-full sm:w-auto">
                    <button 
                        onClick={onEnter}
                        className="px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 transition-all w-full sm:w-auto"
                    >
                        Launch Application
                    </button>
                    <button className="px-8 py-4 rounded-full bg-white/5 text-white font-bold text-lg border border-white/10 hover:bg-white/10 transition-all w-full sm:w-auto hover:border-white/30">
                        View Documentation
                    </button>
                </div>
            </section>

            {/* Core Features Grid */}
            <section className="px-6 py-24 bg-black/40 backdrop-blur-md border-y border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:32px_32px]"></div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard 
                            icon={<UsersIcon className="w-8 h-8"/>}
                            title="Bio-AI Board"
                            description="Simulate a multidisciplinary medical board review. Specialists in Nephrology, Neurology, and Oncology collaborate to reach consensus on complex cases."
                        />
                        <FeatureCard 
                            icon={<ChatBubbleLeftRightIcon className="w-8 h-8"/>}
                            title="Clinical Critics"
                            description="Adversarial AI agents debate diagnosis and treatment plans in real-time, identifying blind spots and ensuring robust clinical reasoning."
                        />
                        <FeatureCard 
                            icon={<RadioIcon className="w-8 h-8"/>}
                            title="Live Assistant"
                            description="Multimodal real-time analysis of video and audio streams. Automatically detects biomarkers while you converse with the patient."
                        />
                    </div>
                </div>
            </section>

            {/* Specialized Ecosystem Grid */}
            <section className="px-6 py-24 relative z-10 bg-gradient-to-b from-transparent to-black/20">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Comprehensive Medical Intelligence</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg font-light">
                            A unified ecosystem of specialized AI agents, each trained on domain-specific guidelines and reporting standards to ensure expert-level analysis across every system.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SpecialtyCard icon={<StentIcon className="w-6 h-6"/>} title="Interventional" desc="Angiograms, PCI planning, SYNTAX scores" color="text-blue-400" />
                        <SpecialtyCard icon={<PacemakerIcon className="w-6 h-6"/>} title="Electrophysiology" desc="Device interrogation, Arrhythmia burden" color="text-cyan-400" />
                        <SpecialtyCard icon={<HeartPumpIcon className="w-6 h-6"/>} title="Heart Failure" desc="LVAD parameters, Transplant evaluation" color="text-red-400" />
                        <SpecialtyCard icon={<BrainIcon className="w-6 h-6"/>} title="Neurology" desc="Stroke protocols, MRI Brain analysis" color="text-indigo-400" />
                        
                        <SpecialtyCard icon={<KidneyIcon className="w-6 h-6"/>} title="Nephrology" desc="CKD staging, Electrolyte management" color="text-yellow-400" />
                        <SpecialtyCard icon={<DnaIcon className="w-6 h-6"/>} title="Oncology" desc="TNM staging, Biomarker profiles" color="text-pink-400" />
                        <SpecialtyCard icon={<LungsIcon className="w-6 h-6"/>} title="Pulmonology" desc="PFT interpretation, Nodule tracking" color="text-teal-400" />
                        <SpecialtyCard icon={<DropIcon className="w-6 h-6"/>} title="Endocrinology" desc="Diabetes & Thyroid management" color="text-purple-400" />
                        
                        <SpecialtyCard icon={<BugIcon className="w-6 h-6"/>} title="Infectious Disease" desc="Sepsis, Antibiotic stewardship" color="text-green-400" />
                        <SpecialtyCard icon={<StomachIcon className="w-6 h-6"/>} title="Gastroenterology" desc="Endoscopy, Liver function" color="text-orange-400" />
                        <SpecialtyCard icon={<JointIcon className="w-6 h-6"/>} title="Rheumatology" desc="Autoimmune markers, Inflammation" color="text-rose-400" />
                        <SpecialtyCard icon={<ElderIcon className="w-6 h-6"/>} title="Geriatrics" desc="Frailty, Polypharmacy, Falls" color="text-amber-400" />
                    </div>
                </div>
            </section>

            {/* Biomarker Section */}
            <section className="px-6 py-32 max-w-7xl mx-auto border-t border-white/5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div>
                        <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">Advanced Biomarker Detection</h2>
                        <p className="text-gray-400 mb-10 leading-relaxed text-lg font-light">
                            The AI Agent passively analyzes voice acoustics, facial expressions, and visual signs to detect medical and emotional symptoms in real-time, often before they are clinically obvious.
                        </p>
                        
                        <div className="space-y-10">
                            <div>
                                <h4 className="flex items-center text-blue-400 font-bold uppercase text-xs tracking-[0.2em] mb-5">
                                    <MicrophoneIcon className="w-4 h-4 mr-2" /> Voice-Based Biomarkers
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <BiomarkerItem label="Dyspnea" sub="Breathiness, short phrases, gasping" />
                                    <BiomarkerItem label="Dysarthria" sub="Slurred speech, neurological signs" />
                                    <BiomarkerItem label="Stress / Anxiety" sub="Pressured speech, pitch variability" />
                                    <BiomarkerItem label="Pain / Fatigue" sub="Strained tone, monotone energy" />
                                </div>
                            </div>

                            <div>
                                <h4 className="flex items-center text-purple-400 font-bold uppercase text-xs tracking-[0.2em] mb-5">
                                    <EyeIcon className="w-4 h-4 mr-2" /> Visual Biomarkers
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <BiomarkerItem label="Dermatologic" sub="Cyanosis, Jaundice, Pallor" dotColor="bg-purple-500" />
                                    <BiomarkerItem label="Neurological" sub="Facial asymmetry, Tremors" dotColor="bg-purple-500" />
                                    <BiomarkerItem label="Cardio-Respiratory" sub="JVD, Tripoding, Pedal Edema" dotColor="bg-purple-500" />
                                    <BiomarkerItem label="Acute Distress" sub="Diaphoresis, Pursed-lip breathing" dotColor="bg-purple-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* HUD Visualization */}
                    <div className="relative group perspective-1000">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-[50px] opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>
                        
                        <div className="relative bg-[#0B1120] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden backdrop-blur-xl transition-transform duration-500 hover:rotate-1">
                            {/* HUD Scan Line Animation */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 animate-scan"></div>
                            
                            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                                <div className="flex items-center space-x-3 text-white">
                                    <HeartPulseIcon className="w-6 h-6 text-red-500 animate-pulse" />
                                    <span className="font-bold text-sm tracking-widest uppercase">Live Bio-Signal HUD</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                                    <div className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded border border-red-500/30">REC</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-transparent border-l-4 border-red-500 hover:bg-red-500/20 transition-colors">
                                    <div>
                                        <div className="text-white text-sm font-bold">Dyspnea Detected</div>
                                        <div className="text-red-300/60 text-xs">Audio Analysis • Breathiness</div>
                                    </div>
                                    <div className="text-red-400 text-[10px] font-bold border border-red-500/30 px-2 py-1 rounded bg-red-500/10">HIGH CONFIDENCE</div>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-transparent border-l-4 border-yellow-500 hover:bg-yellow-500/20 transition-colors">
                                    <div>
                                        <div className="text-white text-sm font-bold">Mild Tremor (Hand)</div>
                                        <div className="text-yellow-300/60 text-xs">Video Analysis • Frequency 5Hz</div>
                                    </div>
                                    <div className="text-yellow-400 text-[10px] font-bold border border-yellow-500/30 px-2 py-1 rounded bg-yellow-500/10">MEDIUM</div>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-transparent border-l-4 border-blue-500 hover:bg-blue-500/20 transition-colors">
                                    <div>
                                        <div className="text-white text-sm font-bold">Cyanosis (Lips)</div>
                                        <div className="text-blue-300/60 text-xs">Video Analysis • Colorimetry</div>
                                    </div>
                                    <div className="text-blue-400 text-[10px] font-bold border border-blue-500/30 px-2 py-1 rounded bg-blue-500/10">VISUAL SIGN</div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/10 relative">
                                <div className="absolute top-0 left-0 w-8 h-px bg-white/20"></div>
                                <p className="text-gray-400 text-xs leading-relaxed font-mono">
                                    <span className="text-blue-400 font-bold mr-2">AI INSIGHT:</span>
                                    Patient shows signs of acute respiratory distress correlating with visible cyanosis. Cross-referencing with HFrEF history suggests potential decompensation. Recommended immediate SpO2 check.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 text-center text-gray-500 text-sm bg-black/20">
                <p>&copy; {new Date().getFullYear()} MediSnap AI. All rights reserved.</p>
                <div className="flex justify-center space-x-8 mt-6">
                    <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                    <a href="#" className="hover:text-white transition-colors">Contact Support</a>
                </div>
            </footer>
        </div>
    );
};
