import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, ArrowRight } from 'lucide-react';
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

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-900/40 backdrop-blur-md relative z-50 p-4">
      {/* Background is handled by the parent Landing page usually, but if hit directly, this ensures a dark backdrop */}

      {/* Close Button / Back to Home */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-8 right-8 text-white/80 hover:text-white transition-colors"
      >
        <span className="sr-only">Close</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
      </button>

      {/* Modal Container */}
      <div className="w-full max-w-[480px] bg-white rounded-[32px] p-10 md:p-12 shadow-2xl relative animate-scale-in">

        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-8">
          {/* Logo */}
          <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center text-white mb-6 shadow-md">
            <Brain className="w-6 h-6" />
          </div>

          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">
            {isRegistering ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-gray-500 text-sm">
            {isRegistering ? 'Start summarizing your notes in seconds.' : 'Continue your learning journey.'}
          </p>
        </div>

        {/* Social Login Stub */}
        <button
          type="button"
          className="w-full h-12 rounded-full bg-[#1A1A1A] hover:bg-[#2a2a2a] text-white flex items-center justify-center gap-3 font-medium transition-all mb-6 relative group"
          onClick={() => toast.info('Google login simulation only')}
        >
          {/* Simple Google 'G' Icon SVG */}
          <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-400">Or continue with email</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <input
              type="text"
              name="name"
              placeholder="Your name"
              value={formData.name}
              onChange={handleChange}
              className="w-full h-12 rounded-full border border-gray-200 px-5 text-sm outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] transition-all bg-white text-[#1A1A1A] placeholder:text-gray-400"
              required
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="Your email"
            value={formData.email}
            onChange={handleChange}
            className="w-full h-12 rounded-full border border-gray-200 px-5 text-sm outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] transition-all bg-white text-[#1A1A1A] placeholder:text-gray-400"
            required
          />

          <input
            type="password"
            name="password"
            placeholder={isRegistering ? "Create a password" : "Your password"}
            value={formData.password}
            onChange={handleChange}
            className="w-full h-12 rounded-full border border-gray-200 px-5 text-sm outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] transition-all bg-white text-[#1A1A1A] placeholder:text-gray-400"
            required
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#1A1A1A] font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-gray-400 border-t-black rounded-full animate-spin" />
            ) : (
              <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
            )}
          </button>
        </form>

        {/* Toggle Login/Register */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setFormData({ name: '', email: '', password: '' });
            }}
            className="text-sm text-[#1A1A1A] font-medium hover:underline decoration-2 underline-offset-4"
          >
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}
          </button>
        </div>

        {/* Legal */}
        <p className="mt-8 text-center text-xs text-gray-400 leading-relaxed px-4">
          By signing up, you agree to the <a href="#" className="hover:text-gray-600 underline">Terms of Service</a> and <a href="#" className="hover:text-gray-600 underline">Privacy Policy</a>.
        </p>

      </div>
    </div>
  );
};

export default Auth;