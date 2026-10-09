import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Mic,
  MicOff,
  Globe,
  ExternalLink,
  BookOpen,
  Calendar,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Deadline, Course } from '../types/deadline';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; uri: string }[];
  timestamp: string;
}

interface AiStudyCoachModalProps {
  isOpen: boolean;
  deadlines: Deadline[];
  courses: Course[];
  onClose: () => void;
  onAddDeadlineToApp?: (title: string, courseId: string, dueDate: string) => void;
}

export const AiStudyCoachModal: React.FC<AiStudyCoachModalProps> = ({
  isOpen,
  deadlines,
  courses,
  onClose,
  onAddDeadlineToApp,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome_1',
      role: 'assistant',
      content: `👋 Hi! I'm your **DuePulse AI Study Coach** powered by Gemini.

I can help you:
- **Build study roadmaps** & milestone schedules for upcoming exams
- **Search current academic facts & sources** using Google Search
- **Transcribe your voice questions** or spoken lecture thoughts
- **Plan your weekly study workload** so you never submit late

What assignment or subject are you working on today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Audio recording cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  // Active student deadlines summary for context
  const getDeadlinesContext = () => {
    const active = deadlines.filter((d) => d.status !== 'completed');
    if (active.length === 0) return 'No current active deadlines.';
    return active
      .map((d) => {
        const c = courses.find((course) => course.id === d.courseId);
        return `- ${d.title} (${c?.code || 'Course'}), Due: ${new Date(d.dueDate).toLocaleString()}, Priority: ${d.priority}, Est. Hours: ${d.estimatedHours || 2}`;
      })
      .join('\n');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          useSearch: useSearchGrounding,
          context: getDeadlinesContext(),
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Failed to get AI coach response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_reply`,
        role: 'assistant',
        content: data.text || "I'm sorry, I couldn't generate a response. Please try again.",
        sources: data.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      const errorMessage: Message = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: `⚠️ Error: ${err.message || 'Unable to connect to AI study coach.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Microphone recording with gemini-3.5-transcribe
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingDuration(0);
        setIsRecording(false);

        // Process audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        if (audioBlob.size < 1000) return; // Too short

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            const res = await fetch('/api/ai/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType: mediaRecorder.mimeType || 'audio/webm',
              }),
            });

            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Transcription failed');
            }

            const data = await res.json();
            if (data.transcription) {
              setInput((prev) => (prev ? `${prev} ${data.transcription}` : data.transcription));
            }
            setIsTranscribing(false);
          };
        } catch (err: any) {
          console.error(err);
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied or unavailable', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const clearChatHistory = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        content: "Chat cleared! How can I help you tackle your assignments today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const quickPrompts = [
    'How should I pace study for my upcoming high-priority deadlines?',
    'Give me a 3-day breakdown for writing a 6-page research paper',
    'Tips to avoid cramming the night before an exam',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="w-full max-w-lg h-[90vh] max-h-[720px] rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-linear-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-md">
              <Bot className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">DuePulse AI Coach</h3>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-500/40 text-indigo-100 font-semibold border border-indigo-400/30">
                  Gemini 3.5
                </span>
              </div>
              <p className="text-[11px] text-indigo-200">
                Multi-turn study strategist & deadline companion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={clearChatHistory}
              className="p-1.5 text-indigo-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Clear conversation history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-indigo-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feature Toggles Strip: Search Grounding & Audio Transcribe status */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs shrink-0">
          <button
            onClick={() => setUseSearchGrounding(!useSearchGrounding)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all ${
              useSearchGrounding
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-slate-200/70 text-slate-500'
            }`}
            title="When active, queries fetch verified facts & source links via Google Search Grounding"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>Search Grounding: {useSearchGrounding ? 'ON' : 'OFF'}</span>
          </button>

          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Mic className="w-3 h-3 text-indigo-500" />
            Voice Transcription Ready
          </span>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 hide-scrollbar bg-slate-50/30">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-2 shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Grounding web sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-slate-700">
                      <Globe className="w-3 h-3 text-blue-500" />
                      Google Search Sources:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.slice(0, 4).map((source, idx) => (
                        <a
                          key={idx}
                          href={source.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 truncate max-w-xs transition-colors"
                        >
                          <span className="truncate">{source.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`text-[10px] text-right ${
                    msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 items-center text-xs text-slate-500">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                Analyzing your study schedule and formulating guidance...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions Chips */}
        {messages.length <= 2 && (
          <div className="p-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto hide-scrollbar text-[11px] shrink-0">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-medium whitespace-nowrap transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Recording active banner */}
        {isRecording && (
          <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 flex items-center justify-between text-xs text-rose-700 animate-pulse shrink-0">
            <span className="font-semibold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              Recording audio ({recordingDuration}s)... speak your question
            </span>
            <button
              onClick={stopRecording}
              className="px-2.5 py-0.5 rounded-lg bg-rose-600 text-white font-bold text-[11px]"
            >
              Done & Transcribe
            </button>
          </div>
        )}

        {isTranscribing && (
          <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-200 flex items-center gap-2 text-xs text-indigo-700 shrink-0">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span>Transcribing audio with Gemini 3.5 Transcribe...</span>
          </div>
        )}

        {/* Input Bar with Mic button & Send */}
        <div className="p-3 border-t border-slate-200 bg-white shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Audio transcription mic button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2.5 rounded-2xl transition-all ${
                isRecording
                  ? 'bg-rose-600 text-white ring-2 ring-rose-300'
                  : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600'
              }`}
              title={isRecording ? 'Stop recording' : 'Speak to transcribe (gemini-3.5-transcribe)'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              placeholder={isRecording ? 'Listening...' : 'Ask your study coach or brainstorm an assignment...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || isRecording}
              className="flex-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 transition-all placeholder:text-slate-400"
            />

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
