import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Sparkles, Briefcase, GraduationCap, ArrowRight, Loader2, Lock, Mail, User, Building } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState('student'); // 'student' or 'recruiter'
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (!isLogin && !fullName) {
      toast.error('Please enter your full name.');
      return;
    }

    if (!isLogin && selectedRole === 'recruiter' && !companyName) {
      toast.error('Please enter your organization or company name.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const user = await login(email, password);
        toast.success(`Welcome back, ${user.full_name}!`);
        if (user.role === 'recruiter') {
          navigate('/recruiter/dashboard');
        } else if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from);
        }
      } else {
        const user = await register(fullName, email, password, selectedRole, companyName);
        toast.success('Account created successfully! Welcome to SkillGap AI.');
        if (user.role === 'recruiter') {
          navigate('/recruiter/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      const detail = err.response?.data?.detail || 'Authentication failed. Please check your credentials.';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
      {/* Header */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            SkillGap <span className="text-primary">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Role Tabs */}
          <div className="grid grid-cols-2 p-1 bg-muted/60 backdrop-blur-sm rounded-xl mb-6 border border-border">
            <button
              type="button"
              onClick={() => setSelectedRole('student')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                selectedRole === 'student'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              Student / Candidate
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('recruiter')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                selectedRole === 'recruiter'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Recruiter / Employer
            </button>
          </div>

          {/* Form Card */}
          <div className="glass-card rounded-2xl p-8 border border-border shadow-xl backdrop-blur-xl">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold tracking-tight">
                {isLogin ? 'Sign in to your account' : 'Create your account'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {selectedRole === 'student'
                  ? isLogin
                    ? 'Access your ATS reports, skill roadmaps, and career intelligence.'
                    : 'Get started with instant ATS scoring and personalized roadmaps.'
                  : isLogin
                  ? 'Manage candidate pipelines, post jobs, and rank applications.'
                  : 'Hire top tech talent using deterministic ATS screening and AI insights.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="Alex Mercer"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10"
                          required={!isLogin}
                        />
                      </div>
                    </div>

                    {selectedRole === 'recruiter' && (
                      <div className="space-y-1.5">
                        <Label htmlFor="companyName">Company / Organization</Label>
                        <div className="relative">
                          <Building className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="companyName"
                            type="text"
                            placeholder="Stripe, Google, Startup Inc."
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="pl-10"
                            required={!isLogin && selectedRole === 'recruiter'}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full mt-6 py-5 rounded-xl text-base font-semibold shadow-lg shadow-primary/20">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait...
                  </>
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? "Don't have an account yet?" : 'Already have an account?'}
              </span>{' '}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-semibold hover:underline"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-muted-foreground">
        © 2026 SkillGap AI • Unified AI-Powered Recruitment & Career Intelligence Platform
      </footer>
    </div>
  );
}
