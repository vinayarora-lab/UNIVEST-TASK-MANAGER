/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  Square, 
  FileSpreadsheet, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  User, 
  AlertCircle,
  Loader2,
  Sparkles,
  Send,
  FileText,
  Mail
} from 'lucide-react';
import { processMeetingAudio, TaskItem } from './services/geminiService';
import { exportTasksToExcel } from './services/excelService';
import { cn } from './lib/utils';

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError('Microphone access denied or not available.');
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const meetingData = await processMeetingAudio(base64Audio, 'audio/webm');
        setTasks((prev) => [...prev, ...meetingData.tasks]);
        setSummary(meetingData.summary);
        setIsProcessing(false);
      };
    } catch (err) {
      setError('Failed to process audio with AI. Please try again.');
      setIsProcessing(false);
      console.error(err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const clearTasks = () => {
    setTasks([]);
    setSummary(null);
  };

  const sendTaskToOwner = (task: TaskItem) => {
    const subject = `Action Item: ${task.task}`;
    const body = `Hi ${task.owner},\n\nYou have been assigned the following task from today's meeting:\n\n` +
      `Task: ${task.task}\n` +
      `Priority: ${task.priority}\n` +
      `Deadline: ${task.deadline}\n` +
      `Files: ${task.files}\n\n` +
      `Best regards,\nUnivest Meeting Assistant`;

    const mailtoUrl = `mailto:${task.ownerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Create a temporary link and click it - this is more reliable in iframes
    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show a small feedback or fallback info
    console.log(`Attempting to send email to ${task.ownerEmail}`);
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text p-6 md:p-12 flex flex-col font-sans max-w-7xl mx-auto w-full">
      {/* Header Section */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center shadow-lg shadow-brand-accent/20">
            <Mic className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase tracking-tighter">Univest <span className="text-brand-accent">Meeting Task Manager</span></h1>
            <p className="text-xs text-brand-muted uppercase tracking-widest font-mono">Enterprise AI Audio Processor</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <AnimatePresence>
            {isRecording && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="status-badge"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="font-mono">LIVE AUDIO FEED</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            disabled={tasks.length === 0}
            onClick={() => exportTasksToExcel(tasks)}
            className="bg-white text-brand-bg px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors disabled:opacity-20 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export to Excel
          </button>
        </div>
      </header>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-grow auto-rows-min">
        
        {/* Audio Visualization / Recording Card */}
        <div className="md:col-span-8 bento-card flex flex-col justify-between min-h-[220px]">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-sm font-medium text-brand-muted uppercase tracking-wider font-mono">Audio Spectrum</h2>
            <div className="flex items-center gap-3">
              <span className="text-[11px] bg-brand-border px-3 py-1 rounded text-slate-300 font-mono tracking-widest">
                {formatTime(recordingTime)}
              </span>
              {(tasks.length > 0 || summary) && (
                <button onClick={clearTasks} className="p-1 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-end gap-1.5 h-20 mb-8 px-2 overflow-hidden">
            {[...Array(40)].map((_, i) => (
              <motion.div
                key={i}
                animate={isRecording ? {
                   height: [`${Math.random() * 20 + 10}%`, `${Math.random() * 80 + 20}%`, `${Math.random() * 20 + 5}%`]
                } : { height: '10%' }}
                transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.05 }}
                className={cn(
                  "w-full rounded-full",
                  i % 3 === 0 ? "bg-brand-accent/40" : i % 3 === 1 ? "bg-brand-accent/70" : "bg-brand-accent"
                )}
              />
            ))}
          </div>

          <div className="flex justify-between items-center gap-4">
             {!isRecording ? (
                <button 
                  onClick={startRecording}
                  disabled={isProcessing}
                  className="flex-grow bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 py-3 rounded-2xl font-bold tracking-widest hover:bg-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Mic className="w-4 h-4" /> START CAPTURE
                </button>
             ) : (
                <button 
                  onClick={stopRecording}
                  className="flex-grow bg-red-500/20 border border-red-500/30 text-red-400 py-3 rounded-2xl font-bold tracking-widest hover:bg-red-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Square className="w-4 h-4" /> FINALIZE & PROCESS
                </button>
             )}
             
             {isProcessing && (
                <div className="flex items-center gap-2 px-6 py-3 bg-brand-accent/10 border border-brand-accent/20 rounded-2xl">
                   <Loader2 className="w-4 h-4 animate-spin text-brand-accent" />
                   <span className="text-xs font-mono text-brand-accent font-bold">ANALYZING...</span>
                </div>
             )}
          </div>
        </div>

        {/* Info/Participants Card - Now Meeting Summary */}
        <div className="md:col-span-4 bento-card flex flex-col">
          <h2 className="text-sm font-medium text-brand-muted mb-4 uppercase tracking-wider font-mono flex items-center gap-2">
            <FileText className="w-4 h-4" /> Meeting Summary
          </h2>
          <div className="flex-grow overflow-auto min-h-[140px] text-xs leading-relaxed text-slate-300">
            {summary ? (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {summary}
              </motion.p>
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
                <Sparkles className="w-6 h-6 mb-2" />
                <p className="font-mono">Waiting for meeting analysis...</p>
              </div>
            )}
          </div>
        </div>

        {/* Task Extraction Grid (Table Card) */}
        <div className="md:col-span-12 bento-card !p-0 overflow-hidden flex flex-col min-h-[400px]">
          <div className="bg-slate-800/80 px-6 py-4 border-b border-brand-border flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 font-mono flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Extraction Results: Action Item Registry
            </h3>
            <div className="flex gap-2">
              <div className="h-2 w-2 rounded-full bg-brand-border"></div>
              <div className="h-2 w-2 rounded-full bg-brand-border"></div>
              <div className="h-2 w-2 rounded-full bg-brand-border"></div>
            </div>
          </div>
          
          <div className="flex-grow overflow-auto min-h-[300px]">
            {error && (
              <div className="p-6 bg-red-500/5 text-red-400 text-sm italic border-b border-red-500/20 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
            
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-brand-border bg-slate-800/50 backdrop-blur-md text-brand-muted font-mono uppercase text-[10px]">
                  <th className="px-6 py-4 font-semibold">ID</th>
                  <th className="px-6 py-4 font-semibold">Action Item Description</th>
                  <th className="px-6 py-4 font-semibold">Responsible Owner</th>
                  <th className="px-6 py-4 font-semibold">File References</th>
                  <th className="px-6 py-4 font-semibold">Priority</th>
                  <th className="px-6 py-4 font-semibold text-center">Distribute</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                <AnimatePresence mode="popLayout">
                  {tasks.length === 0 && !isProcessing ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-24 text-center text-brand-muted italic">
                        <div className="flex flex-col items-center opacity-40">
                          <Sparkles className="w-10 h-10 mb-4" />
                          <p className="font-mono text-xs uppercase tracking-widest">No meeting data captured</p>
                          <p className="text-[10px] mt-1 not-italic">Start live capture to begin real-time task extraction</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task, i) => (
                      <motion.tr 
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="hover:bg-brand-accent/5 transition-colors group border-b border-brand-border/10"
                      >
                        <td className="px-6 py-4 text-brand-muted font-mono text-xs">#{(i + 1).toString().padStart(3, '0')}</td>
                        <td className="px-6 py-4">
                          <div className="max-w-md truncate font-medium text-white" title={task.task}>
                            {task.task}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-[10px] font-bold">
                                  {task.owner.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="text-slate-200">{task.owner}</span>
                              </div>
                              <span className="text-[10px] text-brand-muted font-mono ml-8">{task.ownerEmail}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2 text-indigo-300 italic text-xs">
                              {task.files !== 'None' ? (
                                <>
                                  <FileText className="w-3 h-3 text-indigo-500" />
                                  <span className="underline underline-offset-4 decoration-indigo-500/30">{task.files}</span>
                                </>
                              ) : (
                                <span className="text-slate-500 not-italic">--</span>
                              )}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold tracking-widest",
                            task.priority === 'High' ? "bg-red-500/10 text-red-400" :
                            task.priority === 'Medium' ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"
                          )}>
                            {task.priority.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <button 
                            onClick={() => sendTaskToOwner(task)}
                            className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 hover:bg-indigo-500 text-white transition-all"
                            title={`Send email to ${task.ownerEmail}`}
                           >
                              <Mail className="w-4 h-4" />
                           </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                  {isProcessing && (
                    <tr className="bg-brand-accent/5 animate-pulse">
                      <td className="px-6 py-4 text-brand-accent font-mono text-xs">***</td>
                      <td colSpan={5} className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-4 h-4 animate-spin text-brand-accent" />
                          <span className="text-brand-accent font-mono text-xs uppercase tracking-widest font-bold italic">
                            Analyzing Meeting Context & Extracting Assets...
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-800/30 px-6 py-3 border-t border-brand-border text-[11px] text-brand-muted flex items-center justify-between font-mono">
            <span className="flex items-center gap-2 italic">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               Auto-sync enabled with Microsoft Excel Preview
            </span>
            <span>Uptime: {formatTime(Math.floor(performance.now() / 1000))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

