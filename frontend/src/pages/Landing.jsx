import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Brain, Zap, BookOpen, Sparkles } from 'lucide-react';
import { isAuthenticated } from '../App';
import { useEffect } from 'react';

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">StudyAI</span>
          </div>
          <Button 
            onClick={() => navigate('/auth')} 
            variant="outline"
            className="animate-fade-in delay-100"
            data-testid="header-login-btn"
          >
            Sign In
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6 animate-slide-up">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Powered by GPT-4o</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 animate-slide-up delay-100" data-testid="hero-heading">
            Transform Your Notes Into
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Knowledge</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto animate-slide-up delay-200">
            AI-powered summarization and flashcard generation to help you study smarter, not harder.
          </p>
          
          <div className="flex gap-4 justify-center animate-slide-up delay-300">
            <Button 
              onClick={() => navigate('/auth')} 
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
              data-testid="get-started-btn"
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all animate-scale-in delay-100" data-testid="feature-summarize">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Instant Summaries</h3>
            <p className="text-gray-600">
              Paste your class notes and get AI-generated summaries in seconds.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all animate-scale-in delay-200" data-testid="feature-flashcards">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Smart Flashcards</h3>
            <p className="text-gray-600">
              Automatically generate flashcards to reinforce your learning.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all animate-scale-in delay-300" data-testid="feature-save">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Save & Organize</h3>
            <p className="text-gray-600">
              Keep all your summaries and flashcards in one organized place.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 text-center shadow-2xl animate-scale-in">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Study Smarter?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join students who are transforming their learning with AI.
          </p>
          <Button 
            onClick={() => navigate('/auth')} 
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            data-testid="cta-get-started-btn"
          >
            Get Started Now
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;