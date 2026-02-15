
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { useAppContext } from '../contexts/AppContext';
import { XIcon } from './icons/XIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { RadioIcon } from './icons/RadioIcon';
import { UserIcon } from './icons/UserIcon';
import { BotIcon } from './icons/BotIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ActivityIcon } from './icons/ActivityIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { HeartPulseIcon } from './icons/HeartPulseIcon';
import { EyeIcon } from './icons/SpecialtyIcons';
import { SpeakerIcon } from './icons/SpeakerIcon';
import * as apiManager from '../services/apiManager';

// --- HELPER FUNCTIONS ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const JPEG_QUALITY = 0.5;
// 1 FPS is sufficient for detecting static/semi-static clinical signs (cyanosis, edema, JVD)
// while minimizing bandwidth and processing load compared to 30 FPS.
const FRAME_RATE = 1;

type LiveMode = 'clinician' | 'patient';

interface DetectedBiomarker {
    type: 'audio' | 'visual';
    symptom: string;
    severity: 'Low' | 'Medium' | 'High';
    confidence: string;
    timestamp: number;
    location?: string;
    potentialCauses?: string; // New field for context correlation
}

export const LiveAssistant: React.FC = () => {
  const { state, actions } = useAppContext();
  const { isLiveModeOpen, selectedPatient: patient } = state;
  const { toggleLiveMode, showToast, handleGenerateClinicalNote, handleAddReport } = actions;

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isAITurn, setIsAITurn] = useState(false);
  const [mode, setMode] = useState<LiveMode>('clinician');
  const [isScribeActive, setIsScribeActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  
  // Advanced Features State
  const [biomarkers, setBiomarkers] = useState<DetectedBiomarker[]>([]);
  const [activeConsult, setActiveConsult] = useState<{specialty: string, status: 'calling' | 'received'} | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  
  // Track output node to control muting (Scribe Mode)
  const outputGainNodeRef = useRef<GainNode | null>(null);

  const cleanup = useCallback(() => {
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    if (sessionRef.current) {
        try {
            sessionRef.current.close();
        } catch (e) {
            console.debug('Session close error (likely already closed)', e);
        }
        sessionRef.current = null;
    }
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }
    setIsSessionActive(false);
    setLiveTranscript('');
    setBiomarkers([]);
    setActiveConsult(null);
  }, []);

  // Update output volume based on scribe mode
  useEffect(() => {
      if (outputGainNodeRef.current && outputAudioContextRef.current) {
          const targetGain = isScribeActive ? 0 : 1;
          outputGainNodeRef.current.gain.setTargetAtTime(targetGain, outputAudioContextRef.current.currentTime, 0.1);
      }
  }, [isScribeActive]);

  // Remove old biomarkers after 20 seconds to keep the HUD fresh but allow reading time
  useEffect(() => {
      const interval = setInterval(() => {
          setBiomarkers(prev => prev.filter(b => Date.now() - b.timestamp < 20000));
      }, 1000);
      return () => clearInterval(interval);
  }, []);

  const getSystemInstruction = () => {
      const baseInstruction = `You are CardioSnap Live, an advanced multimodal medical AI assistant.
      
      **Patient Profile:**
      - Name: ${patient?.name} (${patient?.age}, ${patient?.gender})
      - Condition: ${patient?.currentStatus.condition}
      - History: ${patient?.medicalHistory.map(h => h.description).join(', ')}
      - Medications: ${patient?.currentStatus.medications.join(', ')}
      - Recent Vitals: ${patient?.currentStatus.vitals}

      **YOUR CAPABILITIES:**
      1. **Conversational Expert:** Answer clinical questions accurately using provided patient data.
      
      2. **Multimodal Diagnostic Monitor (PASSIVE SCANNING):**
         Continuously analyze AUDIO and VIDEO streams.
         - Do not interrupt the flow of conversation to announce these unless they are critical emergencies.
         - Log findings silently using the provided tools.
         - **CRITICAL:** When you detect a sign, **immediately cross-reference it with the patient's medications and history.** 
           - Example 1: If you see "Tremors", check if they are on Lithium or Albuterol. If so, include "Possible drug side effect (Lithium)" in the 'potential_causes' field of the tool.
           - Example 2: If you see "Edema", check if they have Heart Failure. Include "Consistent with HFrEF history" in 'potential_causes'.
         
         **A. Audio Biomarkers (Voice Analysis):**
         - **Dyspnea:** Gasping, short phrases, audible inspiration.
         - **Dysarthria:** Slurred, slow, or garbled speech (Stroke/Neuro sign).
         - **Emotional State:** Anxiety (pressured speech), Pain (strained quality), Depression (monotone).
         - **Cough:** Persistent or productive cough.
         > Tool: \`report_audio_biomarker\`

         **B. Visual Biomarkers (Video Analysis):**
         - **Dermatologic/Perfusion:** Cyanosis (blue lips/fingertips), Jaundice (yellow sclera/skin), Pallor (anemia), Diaphoresis (sweating), Malar Rash.
         - **Neurologic:** Facial Asymmetry/Droop (Stroke/Bell's), Ptosis, Resting Tremors, Intention Tremors, Gait abnormalities (if visible).
         - **Respiratory:** Tripoding (leaning forward), Pursed-lip breathing, Accessory muscle use (neck).
         - **Cardiovascular:** Jugular Venous Distension (JVD), Peripheral Edema (if legs visible), Xanthelasma (Lipid deposits near eyes).
         > Tool: \`report_visual_sign\`
      
      3. **Multi-Agent Orchestrator:** 
         - If the user asks for a specific specialist opinion (e.g., "What would Nephrology say?"), OR if the case is complex, USE the \`consult_specialist\` tool.
      `;

      if (isScribeActive) {
          return `${baseInstruction}
          **CURRENT MODE: SCRIBE (AMBIENT LISTENING)**
          - Listen silently. Do not speak unless there is a life-threatening emergency.
          - Your audio output is muted for the user, but you should still process inputs to update the transcript and detect biomarkers.`;
      }

      if (mode === 'patient') {
          return `${baseInstruction}
          **CURRENT MODE: PATIENT EDUCATION**
          - Tone: Empathetic, reassuring, clear, slow-paced.
          - Language: 6th-grade reading level. Avoid jargon. Use analogies.`;
      }

      // Default Clinician Mode
      return `${baseInstruction}
      **CURRENT MODE: CLINICIAN CO-PILOT**
      - Tone: Professional, concise, efficient.
      - Language: Medical terminology permitted.`;
  };

  const tools: FunctionDeclaration[] = [
      {
        name: "consult_specialist",
        description: "Consult a specific medical specialist AI agent for their opinion on the patient case.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            specialty: { type: Type.STRING, description: "The medical specialty to consult (e.g., Cardiology, Nephrology, Neurology, Oncology)." },
            query: { type: Type.STRING, description: "The specific clinical question or context for the specialist." }
          },
          required: ["specialty", "query"]
        }
      },
      {
        name: "report_audio_biomarker",
        description: "Log a detected symptom based on VOICE/AUDIO characteristics.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            symptom: { type: Type.STRING, enum: ["Stress", "Dyspnea", "Dysarthria", "Pain", "Fatigue", "Cough"], description: "The detected symptom." },
            severity: { type: Type.STRING, enum: ["Low", "Medium", "High"], description: "The estimated severity." },
            confidence: { type: Type.STRING, description: "Confidence level." },
            potential_causes: { type: Type.STRING, description: "Correlated causes based on patient history/meds (e.g. 'Possible Lithium toxicity')" }
          },
          required: ["symptom", "severity"]
        }
      },
      {
        name: "report_visual_sign",
        description: "Log a visible medical sign detected in the VIDEO feed.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            sign: { type: Type.STRING, description: "e.g., Cyanosis, Facial Droop, JVD, Tripoding, Pallor, Tremor, Rash, Jaundice, Xanthelasma" },
            location: { type: Type.STRING, description: "e.g., Face, Lips, Neck, Hands, Eyes" },
            severity: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
            confidence: { type: Type.STRING, description: "Confidence level." },
            potential_causes: { type: Type.STRING, description: "Correlated causes based on patient history/meds (e.g. 'History of Liver Disease')" }
          },
          required: ["sign", "location", "severity"]
        }
      }
  ];

  const startSession = useCallback(async () => {
    if (!patient) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 640, height: 480 } });
      if (videoRef.current) videoRef.current.srcObject = stream;

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Create Gain Node for muting output (Scribe Mode)
      outputGainNodeRef.current = outputAudioContextRef.current.createGain();
      outputGainNodeRef.current.gain.value = isScribeActive ? 0 : 1;
      outputGainNodeRef.current.connect(outputAudioContextRef.current.destination);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsSessionActive(true);
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);

            // Stream video frames
            frameIntervalRef.current = window.setInterval(() => {
              if (canvasRef.current && videoRef.current) {
                const canvas = canvasRef.current;
                const video = videoRef.current;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                  canvas.toBlob(async (blob) => {
                    if (blob) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64Data = (reader.result as string).split(',')[1];
                        sessionPromise.then((session) => {
                          session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } });
                        });
                      };
                      reader.readAsDataURL(blob);
                    }
                  }, 'image/jpeg', JPEG_QUALITY);
                }
              }
            }, 1000 / FRAME_RATE);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Tool Calls
            if (message.toolCall) {
                const functionResponses = [];
                for (const fc of message.toolCall.functionCalls) {
                    console.log('Tool Call:', fc.name, fc.args);
                    
                    let result: any = { status: 'ok' };

                    if (fc.name === 'consult_specialist') {
                        const { specialty, query } = fc.args as any;
                        setActiveConsult({ specialty, status: 'calling' });
                        
                        try {
                            const report = await apiManager.generateSpecialistReport(patient, specialty);
                            result = { opinion: `The ${specialty} specialist reports: ${report.findings}. Recommendations: ${report.recommendations.join(', ')}.` };
                            setActiveConsult({ specialty, status: 'received' });
                            // Clear status after 3s
                            setTimeout(() => setActiveConsult(null), 4000);
                        } catch (e) {
                            result = { error: "Specialist unavailable." };
                            setActiveConsult(null);
                        }
                    } else if (fc.name === 'report_audio_biomarker') {
                        const { symptom, severity, confidence, potential_causes } = fc.args as any;
                        setBiomarkers(prev => [...prev, { type: 'audio', symptom, severity, confidence, potentialCauses: potential_causes, timestamp: Date.now() }]);
                        result = { status: "logged" };
                    } else if (fc.name === 'report_visual_sign') {
                        const { sign, location, severity, confidence, potential_causes } = fc.args as any;
                        setBiomarkers(prev => [...prev, { type: 'visual', symptom: `${sign} (${location})`, severity, confidence, potentialCauses: potential_causes, timestamp: Date.now() }]);
                        result = { status: "logged" };
                    }

                    functionResponses.push({
                        id: fc.id,
                        name: fc.name,
                        response: { result }
                    });
                }
                
                if (functionResponses.length > 0) {
                    sessionPromise.then(session => session.sendToolResponse({ functionResponses }));
                }
            }

            // Handle Transcription accumulation
            if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                if (text) {
                    setLiveTranscript(prev => prev + text);
                }
            }

            // Handle Audio Output
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64EncodedAudioString && outputAudioContextRef.current) {
              setIsAITurn(true);
              const ctx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              // Connect source to the gain node (which handles muting) instead of direct destination
              if (outputGainNodeRef.current) {
                  source.connect(outputGainNodeRef.current);
              } else {
                  source.connect(ctx.destination);
              }
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsAITurn(false);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAITurn(false);
            }
          },
          onerror: (e) => {
              console.error('Live session error:', e);
              setIsSessionActive(false);
          },
          onclose: () => {
              console.log('Live session closed');
              setIsSessionActive(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: { model: "gemini-2.5-flash-native-audio-preview-12-2025" }, 
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: getSystemInstruction(),
          tools: [{ functionDeclarations: tools }]
        },
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start live session:', err);
      showToast('Failed to access camera/microphone.', 'error');
      toggleLiveMode();
    }
  }, [patient, toggleLiveMode, showToast, isScribeActive, mode]);

  // Restart session when Mode or Scribe state changes to update system instruction
  useEffect(() => {
      if (isLiveModeOpen) {
          // Close existing session cleanly
          if (sessionRef.current) {
              sessionRef.current.close();
              sessionRef.current = null; // Ensure nullified immediately
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              if (inputAudioContextRef.current) { inputAudioContextRef.current.close(); inputAudioContextRef.current = null; }
              if (outputAudioContextRef.current) { outputAudioContextRef.current.close(); outputAudioContextRef.current = null; }
              if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
          }
          // Small delay to allow cleanup before restarting
          const timer = setTimeout(() => {
              startSession();
          }, 500);
          return () => clearTimeout(timer);
      } else {
          cleanup();
      }
  }, [isLiveModeOpen, mode, isScribeActive]);

  const handleSaveToChart = async () => {
      if (!patient || (!liveTranscript && biomarkers.length === 0)) {
          showToast('No data to save yet.', 'info');
          return;
      }
      
      const sessionReport = {
          title: `Live Session: ${new Date().toLocaleString()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'LiveSession' as const,
          content: {
              type: 'live_session' as const,
              transcript: liveTranscript,
              biomarkers: biomarkers
          },
          aiSummary: `Live consultation session. Transcript length: ${liveTranscript.length} chars. Detected ${biomarkers.length} bio-signals.`,
          keyFindings: biomarkers.map(b => `${b.severity} ${b.symptom} (${b.type})`)
      };

      await handleAddReport(patient.id, sessionReport);
      showToast('Session saved to patient chart.', 'success');
      toggleLiveMode();
  };

  const handleDraftNote = () => {
      if (!liveTranscript) {
          showToast('No transcript available yet.', 'info');
          return;
      }
      handleGenerateClinicalNote(liveTranscript);
      toggleLiveMode(); // Close live mode when generating note
  };

  if (!isLiveModeOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col relative aspect-[16/10]">
        <header className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/60 to-transparent text-white">
          <div className="flex items-center space-x-2">
            <RadioIcon className={`w-5 h-5 ${isSessionActive ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
            <span className="font-bold text-lg">Live AI Consultation</span>
          </div>
          
          <div className="flex items-center space-x-2 bg-black/40 rounded-full p-1 backdrop-blur-md">
             <button
                onClick={() => { setMode('clinician'); setIsScribeActive(false); }}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!isScribeActive && mode === 'clinician' ? 'bg-white text-black shadow-sm' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                title="Clinician Mode: Concise, Medical Terms"
             >
                 <BotIcon className="w-4 h-4" />
                 <span>Clinician</span>
             </button>
             <button
                onClick={() => { setMode('patient'); setIsScribeActive(false); }}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!isScribeActive && mode === 'patient' ? 'bg-white text-black shadow-sm' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                title="Patient Mode: Simple Language, Empathetic"
             >
                 <UserIcon className="w-4 h-4" />
                 <span>Patient</span>
             </button>
             <button
                onClick={() => setIsScribeActive(true)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${isScribeActive ? 'bg-red-500 text-white shadow-sm' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                title="Scribe Mode: Silent listening for documentation"
             >
                 <MicrophoneIcon className="w-4 h-4" />
                 <span>Scribe</span>
             </button>
          </div>

          <button 
            onClick={toggleLiveMode}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        {/* Video Preview */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover grayscale brightness-50 opacity-40"
          />
          
          {/* Main Status Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
                <div className={`w-32 h-32 rounded-full border-4 border-blue-500/30 flex items-center justify-center transition-transform duration-500 ${isAITurn ? 'scale-110' : 'scale-100'}`}>
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_50px_-12px_rgba(37,99,235,0.5)] ${isScribeActive ? 'bg-red-600' : 'bg-blue-600'} ${isAITurn || isScribeActive ? 'animate-pulse' : ''}`}>
                         {isScribeActive ? <MicrophoneIcon className="w-12 h-12 text-white" /> : <BotIcon className="w-12 h-12 text-white" />}
                    </div>
                </div>
                {isAITurn && !isScribeActive && (
                    <div className="absolute -inset-4 rounded-full border-2 border-blue-400 animate-ping opacity-20"></div>
                )}
            </div>
            
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                    {isScribeActive ? 'Listening (Scribe Mode)...' : (isAITurn ? 'AI is Speaking...' : (isSessionActive ? 'Listening & Watching...' : 'Connecting...'))}
                </h3>
                <p className="text-blue-100/70 text-sm font-medium uppercase tracking-widest flex items-center justify-center">
                    <ActivityIcon className="w-4 h-4 mr-2" />
                    {isScribeActive ? 'Output Muted • Transcribing' : 'Multimodal analysis active'}
                </p>
            </div>
          </div>

          {/* Active Biomarkers HUD */}
          <div className="absolute top-20 left-4 flex flex-col space-y-3 z-30 max-h-[70%] overflow-y-auto pr-2 no-scrollbar">
              {/* Bio-Signals Header */}
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                  <HeartPulseIcon className="w-4 h-4 mr-1 text-blue-400" /> Bio-Signals Detected
              </div>
              
              {biomarkers.length === 0 ? (
                  <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-xs text-gray-400 italic">
                      Monitoring audio & visual acoustics...
                  </div>
              ) : (
                  biomarkers.slice().reverse().map((b) => (
                      <div key={`${b.symptom}-${b.timestamp}`} className={`flex flex-col px-3 py-2 backdrop-blur-md rounded-lg border w-64 animate-slideInLeft shadow-lg ${b.type === 'visual' ? 'bg-purple-900/60 border-purple-500/30' : 'bg-blue-900/60 border-blue-500/30'}`}>
                          <div className="flex items-start justify-between w-full">
                              <div className="flex items-center space-x-2">
                                  {b.type === 'visual' ? (
                                      <div className="p-1 bg-purple-500/20 rounded-full"><EyeIcon className="w-3 h-3 text-purple-300" /></div>
                                  ) : (
                                      <div className="p-1 bg-blue-500/20 rounded-full"><SpeakerIcon className="w-3 h-3 text-blue-300" /></div>
                                  )}
                                  <div>
                                      <p className="text-white font-bold text-xs">{b.symptom}</p>
                                      <p className="text-[9px] text-gray-300">{b.type.toUpperCase()} • {new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                                  </div>
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                  b.severity === 'High' ? 'bg-red-500/40 text-red-100 border-red-500/50' : 
                                  b.severity === 'Medium' ? 'bg-orange-500/40 text-orange-100 border-orange-500/50' : 
                                  'bg-green-500/40 text-green-100 border-green-500/50'
                              }`}>
                                  {b.severity}
                              </span>
                          </div>
                          {/* Potential Cause Correlation Line */}
                          {b.potentialCauses && (
                              <div className="mt-1.5 pt-1.5 border-t border-white/10">
                                  <p className="text-[10px] text-yellow-300 font-medium flex items-start">
                                      <span className="mr-1">⚠</span>
                                      {b.potentialCauses}
                                  </p>
                              </div>
                          )}
                      </div>
                  ))
              )}
          </div>

          {/* Agent Activity Overlay */}
          {activeConsult && (
              <div className="absolute top-20 right-4 z-30 flex flex-col items-end">
                  <div className="px-4 py-2 bg-indigo-600/90 backdrop-blur-md rounded-lg shadow-lg border border-indigo-400/50 flex items-center space-x-3 animate-fadeIn">
                      <SparklesIcon className="w-5 h-5 text-white animate-spin" />
                      <div>
                          <p className="text-white font-bold text-sm">
                              {activeConsult.status === 'calling' ? `Consulting ${activeConsult.specialty}...` : 'Opinion Received'}
                          </p>
                          <p className="text-[10px] text-indigo-200">
                              {activeConsult.status === 'calling' ? 'Accessing specialized agent...' : 'Synthesizing response...'}
                          </p>
                      </div>
                  </div>
              </div>
          )}

          {/* Transcript Overlay (Scribe Mode or Debug) */}
          {liveTranscript && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md rounded-lg p-3 max-h-32 overflow-y-auto border border-white/10">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Live Transcript</p>
                  <p className="text-sm text-gray-200 font-mono leading-relaxed">{liveTranscript.slice(-300)}</p>
              </div>
          )}

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <footer className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
           <div className="flex-1 pr-4">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Active Patient</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{patient?.name}</p>
           </div>
           
           <div className="flex space-x-3">
               {/* Quick Save Option */}
               {(liveTranscript || biomarkers.length > 0) && (
                   <button
                        onClick={handleSaveToChart}
                        className="px-5 py-2.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100 font-bold rounded-full transition-all hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center space-x-2"
                   >
                       <ActivityIcon className="w-4 h-4" />
                       <span>Save to Chart</span>
                   </button>
               )}
               {/* Draft Note Option */}
               {liveTranscript && (
                   <button
                        onClick={handleDraftNote}
                        className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white font-bold rounded-full transition-all hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center space-x-2"
                   >
                       <ClipboardListIcon className="w-4 h-4" />
                       <span>Draft Note</span>
                   </button>
               )}
               <button 
                    onClick={toggleLiveMode}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-all shadow-lg hover:shadow-red-500/40 flex items-center space-x-2"
               >
                  <span>End Consultation</span>
               </button>
           </div>
        </footer>
      </div>
    </div>
  );
};
