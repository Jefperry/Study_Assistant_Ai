import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Brain, BookOpen, Sparkles, Mic, FileText, Video, Link as LinkIcon, ArrowRight } from 'lucide-react';
import { isAuthenticated } from '../services/api';
import { useEffect } from 'react';

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#F9F9F9] text-[#1A1A1A] font-sans overflow-x-hidden relative selection:bg-blue-100">

      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-purple-200/20 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <header className="relative z-10 container mx-auto px-6 py-6">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-black rounded-xl flex items-center justify-center text-white">
              <Brain className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1A1A]">NoteMind AI</span>
          </div>

          {/* Center Links (Desktop) */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How it works', 'Pricing', 'Blog'].map((item) => (
              <a key={item} href="#" className="text-sm font-medium text-gray-500 hover:text-[#1A1A1A] transition-colors">
                {item}
              </a>
            ))}
          </div>

          {/* CTA Button */}
          <Button
            onClick={() => navigate('/auth')}
            className="rounded-full bg-[#4F46E5] hover:bg-[#4338ca] text-white px-6 md:px-8 py-2 md:py-6 text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
            data-testid="header-get-started-btn"
          >
            Get Started Free
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-32 text-center">
        <div className="max-w-4xl mx-auto">
          <h1
            className="text-5xl md:text-7xl font-bold tracking-tight text-[#1A1A1A] mb-6 leading-[1.1]"
            data-testid="hero-heading"
          >
            Capture. Summarize. <br className="hidden md:block" /> Understand.
          </h1>

          <p className="text-lg md:text-xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            Transform messy lectures, meetings, and documents into clear, actionable summaries instantly with AI.
          </p>

          {/* Progress Indicator Visualization */}
          <div className="flex items-center justify-center gap-4 md:gap-8 mb-16 opacity-80">
            {/* Step 1: Input */}
            <div className="flex flex-col items-center gap-3 group cursor-default">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:border-blue-100 transition-all">
                <Mic className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Input</span>
            </div>

            {/* Connector */}
            <div className="w-12 h-[2px] bg-gray-200" />

            {/* Step 2: Processing */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[#1A1A1A] text-white shadow-lg flex items-center justify-center relative overflow-hidden">
                <Sparkles className="w-6 h-6 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20" />
              </div>
              <span className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">AI Process</span>
            </div>

            {/* Connector */}
            <div className="w-12 h-[2px] bg-gray-200" />

            {/* Step 3: Output */}
            <div className="flex flex-col items-center gap-3 group cursor-default">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 group-hover:text-green-500 group-hover:border-green-100 transition-all">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Result</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid - Bento Grid Style */}
      <section className="relative z-10 container mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">

          {/* Card 1: Instant Clarity */}
          <div
            className="group bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] flex flex-col justify-between h-[400px] overflow-hidden relative"
            data-testid="feature-card-1"
          >
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">Smart Condensing</h3>
              <p className="text-sm text-gray-500">Turn hours of recordings into a 5-minute read.</p>
            </div>

            {/* Visual: Chaos to Order */}
            <div className="absolute inset-x-0 bottom-0 top-20 p-6 flex items-center justify-center bg-gradient-to-t from-gray-50/50 to-transparent">
              <div className="flex items-center gap-4 w-full">
                {/* Left: Chaos */}
                <div className="flex-1 opacity-30 scale-90">
                  <div className="h-2 w-full bg-gray-800 rounded mb-2 rotate-1" />
                  <div className="h-2 w-[80%] bg-gray-800 rounded mb-2 -rotate-1" />
                  <div className="h-2 w-[90%] bg-gray-800 rounded mb-2 rotate-2" />
                  <div className="h-2 w-[60%] bg-gray-800 rounded rotate-1" />
                </div>
                {/* Arrow */}
                <div className="text-blue-500">
                  <ArrowRight className="w-6 h-6" />
                </div>
                {/* Right: Order */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-4 scale-105">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <div className="h-2 w-full bg-gray-200 rounded" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <div className="h-2 w-[80%] bg-gray-200 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <div className="h-2 w-[60%] bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Multi-Modal Ingestion */}
          <div
            className="group bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] flex flex-col justify-between h-[400px] overflow-hidden relative"
            data-testid="feature-card-2"
          >
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">Multi-Modal Ingestion</h3>
              <p className="text-sm text-gray-500">Audio, text, or video—we summarize it all.</p>
            </div>

            {/* Visual: Central Hub */}
            <div className="absolute inset-0 top-20 flex items-center justify-center">
              <div className="relative">
                {/* Center Brain */}
                <div className="w-16 h-16 bg-[#1A1A1A] rounded-2xl flex items-center justify-center text-white relative z-10 shadow-xl">
                  <Brain className="w-8 h-8" />
                </div>

                {/* Orbiting Icons */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-gray-100 rounded-full -z-0" />

                <div className="absolute -top-12 -left-8 w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center shadow-sm animate-bounce duration-[3000ms]">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="absolute -top-12 -right-8 w-10 h-10 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center shadow-sm animate-bounce duration-[3000ms] delay-75">
                  <Video className="w-5 h-5" />
                </div>
                <div className="absolute -bottom-16 left-0 w-10 h-10 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center shadow-sm animate-bounce duration-[3000ms] delay-150">
                  <Mic className="w-5 h-5" />
                </div>
                <div className="absolute -bottom-12 -right-6 w-10 h-10 bg-green-50 text-green-500 rounded-lg flex items-center justify-center shadow-sm animate-bounce duration-[3000ms] delay-300">
                  <LinkIcon className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Active Recall */}
          <div
            className="group bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] flex flex-col justify-between h-[400px] overflow-hidden relative"
            data-testid="feature-card-3"
          >
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">Study & Interact</h3>
              <p className="text-sm text-gray-500">Generate flashcards and chat with your notes.</p>
            </div>

            {/* Visual: Flashcards & Chat */}
            <div className="absolute inset-x-0 bottom-0 p-6 space-y-3">
              {/* Flashcard Mock */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 transform -rotate-2 origin-bottom-left transition-transform group-hover:rotate-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Concept</span>
                  <BookOpen className="w-3 h-3 text-indigo-400" />
                </div>
                <div className="h-2 w-3/4 bg-indigo-200/50 rounded mb-1" />
                <div className="h-2 w-1/2 bg-indigo-200/50 rounded" />
              </div>

              {/* Chat Bubble Mock */}
              <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm transform translate-x-2 transition-transform group-hover:translate-x-0">
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-2 w-[90%] bg-gray-100 rounded" />
                    <div className="h-2 w-[60%] bg-gray-100 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};

export default Landing;