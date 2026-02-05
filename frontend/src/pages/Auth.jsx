import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, ArrowLeft, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

const Auth = () => {
  const navigate = useNavigate();
  const { login, register, isAuthenticated } = useAuth();
  const [isRegistering, setIsRegistering] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  // Password validation state
  const [passwordErrors, setPasswordErrors] = useState([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    // Live password validation
    if (e.target.name === 'password' && isRegistering) {
      validatePassword(e.target.value);
    }
  };

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('One digit');
    setPasswordErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate inputs
    if (isRegistering && !formData.name) {
      toast.error("Name is required");
      setIsLoading(false);
      return;
    }
    if (!formData.email || !formData.password) {
      toast.error("Email and Password are required");
      setIsLoading(false);
      return;
    }
    
    // Client-side password validation for registration
    if (isRegistering && !validatePassword(formData.password)) {
      toast.error("Please fix password requirements");
      setIsLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        await register(formData.name, formData.email, formData.password);
        toast.success('Account created successfully!');
      } else {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      }
      navigate('/dashboard');
    } catch (error) {
      // Handle FastAPI validation errors (422)
      const errorData = error.response?.data;
      let errorMessage = 'Authentication failed';
      
      if (errorData?.detail) {
        if (Array.isArray(errorData.detail)) {
          // Pydantic validation errors come as an array
          errorMessage = errorData.detail
            .map(err => err.msg || err.message || String(err))
            .join('. ');
        } else if (typeof errorData.detail === 'object') {
          // Single error object
          errorMessage = errorData.detail.msg || errorData.detail.message || JSON.stringify(errorData.detail);
        } else {
          // String error
          errorMessage = String(errorData.detail);
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-scholarly-dark relative overflow-hidden">
      {/* Noise Texture */}
      <div className="noise-texture" />
      
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-ink-400/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-ink-400 hover:text-paper-warm transition-colors group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 xl:px-24 relative z-10">
        <div className="animate-fade-in-up">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-ink-800 border border-ink-700 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <span className="text-2xl font-display font-bold text-paper-warm">Study Assistant</span>
              <div className="text-xs font-mono text-ink-400 tracking-wider">AI-POWERED RESEARCH</div>
            </div>
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-display font-bold text-paper-warm leading-tight mb-6">
            Research smarter,<br />
            <span className="gradient-text">not harder.</span>
          </h1>
          
          <p className="text-lg text-ink-300 max-w-md leading-relaxed mb-8">
            Upload papers, get AI summaries, and search semantically across your entire research library.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {[
              'AI-powered paper summarization',
              'Semantic search across documents',
              'Build your knowledge library'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-ink-300 animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-16 relative z-10">
        <div className="w-full max-w-[440px] bg-ink-800/60 backdrop-blur-xl border border-ink-700/50 rounded-2xl p-8 lg:p-10 shadow-2xl animate-fade-in-up stagger-1">

          {/* Header */}
          <div className="mb-8">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-ink-700 border border-ink-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-xl font-display font-bold text-paper-warm">Study Assistant</span>
            </div>

            <h2 className="text-2xl font-display font-bold text-paper-warm mb-2">
              {isRegistering ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-ink-400">
              {isRegistering ? 'Start your research journey today.' : 'Continue where you left off.'}
            </p>
          </div>

          {/* Google Login */}
          <button
            type="button"
            className="w-full h-12 rounded-xl bg-paper-warm hover:bg-white text-ink-900 flex items-center justify-center gap-3 font-medium transition-all mb-6 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            onClick={() => toast.info('Google login coming soon')}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-ink-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-ink-800 px-3 text-ink-500 font-mono">Or continue with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
                <input
                  type="text"
                  name="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full h-12 rounded-xl border border-ink-600 bg-ink-700/50 pl-12 pr-4 text-sm text-paper-warm placeholder:text-ink-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
              <input
                type="email"
                name="email"
                placeholder="Your email"
                value={formData.email}
                onChange={handleChange}
                className="w-full h-12 rounded-xl border border-ink-600 bg-ink-700/50 pl-12 pr-4 text-sm text-paper-warm placeholder:text-ink-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
              <input
                type="password"
                name="password"
                placeholder={isRegistering ? "Create a password" : "Your password"}
                value={formData.password}
                onChange={handleChange}
                className="w-full h-12 rounded-xl border border-ink-600 bg-ink-700/50 pl-12 pr-4 text-sm text-paper-warm placeholder:text-ink-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                required
              />
            </div>

            {/* Password Requirements */}
            {isRegistering && formData.password && passwordErrors.length > 0 && (
              <div className="bg-ink-700/50 border border-ink-600 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-medium mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Password requirements:
                </div>
                {passwordErrors.map((error, i) => (
                  <div key={i} className="flex items-center gap-2 text-ink-400 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-ink-500" />
                    {error}
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-ink-900 font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-2 glow-amber disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-ink-900/30 border-t-ink-900 rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setFormData({ name: '', email: '', password: '' });
                setPasswordErrors([]);
              }}
              className="text-sm text-ink-300 hover:text-amber-400 font-medium transition-colors"
            >
              {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* Legal */}
          <p className="mt-6 text-center text-xs text-ink-500 leading-relaxed">
            By signing up, you agree to our{' '}
            <a href="#" className="text-ink-400 hover:text-amber-400 underline">Terms</a>
            {' '}and{' '}
            <a href="#" className="text-ink-400 hover:text-amber-400 underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;