import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Brain, BookOpen, Sparkles, Search, FileText, Zap, ArrowRight, GraduationCap, Library, Lightbulb } from 'lucide-react';
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
    <div className="min-h-screen bg-scholarly-light font-sans overflow-x-hidden relative selection:bg-amber-100">
      
      {/* Noise Texture Overlay */}
      <div className="noise-texture" />

      {/* Background Gradient Accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-amber-500/5 rounded-full blur-[150px]" />
        <div className="absolute top-[40%] -left-[20%] w-[50%] h-[50%] bg-ink-200/10 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <header className="relative z-10 container mx-auto px-6 lg:px-12 py-6">
        <nav className="flex items-center justify-between">
          {/* Logo - Left aligned */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-ink-900 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-display font-bold tracking-tight text-ink-900">Study Assistant</span>
              <span className="text-xs font-mono text-ink-400 tracking-wider">AI-POWERED RESEARCH</span>
            </div>
          </div>

          {/* Nav Links (Desktop) - Right side */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors">
              How it works
            </a>
            <Button
              onClick={() => navigate('/auth')}
              className="rounded-lg bg-ink-900 hover:bg-ink-800 text-paper-warm px-6 py-5 text-sm font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              data-testid="header-get-started-btn"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Mobile CTA */}
          <Button
            onClick={() => navigate('/auth')}
            className="md:hidden rounded-lg bg-ink-900 hover:bg-ink-800 text-paper-warm px-4 py-2 text-sm font-medium"
            data-testid="header-get-started-btn-mobile"
          >
            Get Started
          </Button>
        </nav>
      </header>

      {/* Hero Section - LEFT ALIGNED */}
      <section className="relative z-10 container mx-auto px-6 lg:px-12 pt-16 pb-20 md:pt-24 md:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left: Text Content */}
          <div className="text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 text-sm font-medium mb-8 animate-fade-in-up">
              <Sparkles className="w-4 h-4" />
              <span>AI-Powered Academic Research</span>
            </div>

            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-ink-900 mb-6 leading-[1.1] animate-fade-in-up stagger-1"
              data-testid="hero-heading"
            >
              Research smarter,<br />
              <span className="gradient-text">not harder.</span>
            </h1>

            <p className="text-lg md:text-xl text-ink-500 mb-10 leading-relaxed max-w-xl animate-fade-in-up stagger-2">
              Upload academic papers, get AI-generated summaries, and search across your research library with semantic understanding.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in-up stagger-3">
              <Button
                onClick={() => navigate('/auth')}
                className="rounded-lg bg-amber-500 hover:bg-amber-600 text-ink-900 px-8 py-6 text-base font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 glow-amber"
                data-testid="hero-cta-btn"
              >
                Start Free Today
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="rounded-lg border-2 border-ink-200 text-ink-700 hover:bg-ink-50 px-8 py-6 text-base font-medium"
              >
                See How It Works
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-8 border-t border-ink-100 animate-fade-in-up stagger-4">
              <div>
                <div className="text-2xl font-display font-bold text-ink-900">Fast</div>
                <div className="text-sm text-ink-400 font-mono">SUMMARIZATION</div>
              </div>
              <div>
                <div className="text-2xl font-display font-bold text-ink-900">Smart</div>
                <div className="text-sm text-ink-400 font-mono">SEMANTIC SEARCH</div>
              </div>
              <div>
                <div className="text-2xl font-display font-bold text-ink-900">Secure</div>
                <div className="text-sm text-ink-400 font-mono">YOUR DATA</div>
              </div>
            </div>
          </div>

          {/* Right: Visual Element */}
          <div className="relative animate-fade-in-up stagger-2 hidden lg:block">
            {/* Main Card */}
            <div className="scholarly-card p-6 rounded-2xl relative z-10 transform rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="font-display font-semibold text-ink-900">Research Paper</div>
                  <div className="text-sm text-ink-400 font-mono">quantum-computing.pdf</div>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-2 w-full bg-ink-100 rounded" />
                <div className="h-2 w-[85%] bg-ink-100 rounded" />
                <div className="h-2 w-[90%] bg-ink-100 rounded" />
              </div>
              <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
                <Zap className="w-4 h-4" />
                <span>AI Summary Generated</span>
              </div>
            </div>

            {/* Floating Cards */}
            <div className="absolute -top-4 -right-4 scholarly-card p-4 rounded-xl transform -rotate-3 animate-float z-0">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-ink-400" />
                <span className="text-sm text-ink-500 font-mono">semantic search...</span>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-6 scholarly-card p-4 rounded-xl transform rotate-2 animate-float z-20" style={{ animationDelay: '1s' }}>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-ink-700">98% Relevance</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Asymmetric Grid */}
      <section id="features" className="relative z-10 container mx-auto px-6 lg:px-12 py-24 scroll-mt-20">
        <div className="mb-16 animate-fade-in-up">
          <span className="text-sm font-mono text-amber-600 tracking-wider uppercase mb-4 block">FEATURES</span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-ink-900 mb-4">
            Everything you need for<br />academic excellence
          </h2>
          <p className="text-ink-500 max-w-2xl">
            A complete toolkit designed specifically for researchers, students, and academics.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Feature 1: PDF Upload - Large */}
          <div
            className="group scholarly-card p-8 rounded-2xl lg:col-span-2 flex flex-col justify-between min-h-[300px] hover:-translate-y-1 transition-all duration-300 animate-fade-in-up stagger-1"
            data-testid="feature-card-1"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-display font-bold text-ink-900 mb-2">Upload & Process PDFs</h3>
              <p className="text-ink-500 max-w-md">
                Drop your research papers, textbooks, or lecture notes. Our AI extracts and indexes all content for intelligent retrieval.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <div className="px-3 py-1.5 bg-ink-100 rounded-full text-xs font-mono text-ink-600">PDF</div>
              <div className="px-3 py-1.5 bg-ink-100 rounded-full text-xs font-mono text-ink-600">TXT</div>
              <div className="px-3 py-1.5 bg-ink-100 rounded-full text-xs font-mono text-ink-600">DOC</div>
            </div>
          </div>

          {/* Feature 2: AI Summaries */}
          <div
            className="group scholarly-card p-8 rounded-2xl flex flex-col justify-between min-h-[300px] hover:-translate-y-1 transition-all duration-300 animate-fade-in-up stagger-2"
            data-testid="feature-card-2"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-ink-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-ink-900 mb-2">AI Summaries</h3>
              <p className="text-ink-500">
                Get instant, accurate summaries powered by advanced language models. Understand papers in minutes.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-amber-600 font-medium text-sm">
              <Zap className="w-4 h-4" />
              <span>Powered by Groq & BART</span>
            </div>
          </div>

          {/* Feature 3: Semantic Search */}
          <div
            className="group scholarly-card p-8 rounded-2xl flex flex-col justify-between min-h-[300px] hover:-translate-y-1 transition-all duration-300 animate-fade-in-up stagger-3"
            data-testid="feature-card-3"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Search className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-display font-bold text-ink-900 mb-2">Semantic Search</h3>
              <p className="text-ink-500">
                Search by meaning, not just keywords. Find relevant passages across all your documents instantly.
              </p>
            </div>
            <div className="mt-6 p-3 bg-ink-50 rounded-lg">
              <div className="text-xs font-mono text-ink-400 mb-1">Query:</div>
              <div className="text-sm text-ink-700">"quantum entanglement applications"</div>
            </div>
          </div>

          {/* Feature 4: Knowledge Library */}
          <div
            className="group scholarly-card p-8 rounded-2xl lg:col-span-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 min-h-[200px] hover:-translate-y-1 transition-all duration-300 animate-fade-in-up stagger-4"
            data-testid="feature-card-4"
          >
            <div className="flex-1">
              <div className="w-12 h-12 rounded-xl bg-ink-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Library className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-ink-900 mb-2">Your Knowledge Library</h3>
              <p className="text-ink-500 max-w-md">
                All your research in one place. Organize, tag, and access your academic materials effortlessly.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-amber-600" />
              </div>
              <div className="w-12 h-12 rounded-lg bg-ink-100 flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-ink-600" />
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Brain className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 bg-ink-900 py-24 scroll-mt-20">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-16 animate-fade-in-up">
            <span className="text-sm font-mono text-amber-400 tracking-wider uppercase mb-4 block">HOW IT WORKS</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-paper-warm mb-4">
              Three steps to smarter research
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Upload', desc: 'Drop your PDFs, papers, or documents into Study Assistant', icon: FileText },
              { step: '02', title: 'Process', desc: 'Our AI analyzes, indexes, and creates searchable embeddings', icon: Brain },
              { step: '03', title: 'Discover', desc: 'Search semantically and get instant AI-powered summaries', icon: Lightbulb },
            ].map((item, i) => (
              <div key={item.step} className={`text-center animate-fade-in-up stagger-${i + 1}`}>
                <div className="w-16 h-16 rounded-2xl bg-ink-800 flex items-center justify-center mx-auto mb-6 border border-ink-700">
                  <item.icon className="w-8 h-8 text-amber-400" />
                </div>
                <div className="text-amber-400 font-mono text-sm mb-2">{item.step}</div>
                <h3 className="text-xl font-display font-bold text-paper-warm mb-2">{item.title}</h3>
                <p className="text-ink-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-6 lg:px-12 py-24">
        <div className="scholarly-card p-12 md:p-16 rounded-3xl text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px]" />
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-ink-900 mb-4 animate-fade-in-up">
              Ready to transform your research?
            </h2>
            <p className="text-ink-500 mb-8 max-w-xl mx-auto animate-fade-in-up stagger-1">
              Join researchers and students using AI to accelerate their academic journey.
            </p>
            <Button
              onClick={() => navigate('/auth')}
              className="rounded-lg bg-amber-500 hover:bg-amber-600 text-ink-900 px-10 py-6 text-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 glow-amber animate-fade-in-up stagger-2"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-ink-100 py-12">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-ink-900 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-amber-400" />
              </div>
              <span className="font-display font-bold text-ink-900">Study Assistant AI</span>
            </div>
            <div className="text-sm text-ink-400 font-mono">
              © 2024 Study Assistant. Built for academics.
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Landing;