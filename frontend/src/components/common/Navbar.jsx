import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../ThemeToggle';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Briefcase,
  Brain,
  Code2,
  Newspaper,
  LogOut,
  User as UserIcon,
  Shield,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function Navbar() {
  const { user, role, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(role === 'recruiter' ? '/recruiter/dashboard' : '/dashboard')}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
                SkillGap <span className="text-primary">AI</span>
                {role === 'recruiter' && (
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    Recruiter
                  </span>
                )}
                {role === 'admin' && (
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              {role === 'student' && (
                <>
                  <Link to="/dashboard">
                    <Button variant={isActive('/dashboard') ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                      <Layers className="h-4 w-4" /> Dashboard
                    </Button>
                  </Link>
                  <Link to="/upload-resume">
                    <Button variant={isActive('/upload-resume') ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                      <FileText className="h-4 w-4" /> ATS Scorer
                    </Button>
                  </Link>
                  <Link to="/skill-analysis">
                    <Button variant={isActive('/skill-analysis') ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                      <Brain className="h-4 w-4" /> Skill Gap
                    </Button>
                  </Link>
                  <Link to="/jobs">
                    <Button variant={isActive('/jobs') ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                      <Briefcase className="h-4 w-4" /> Jobs
                    </Button>
                  </Link>
                  <Link to="/dsa-tracker">
                    <Button variant={isActive('/dsa-tracker') ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                      <Code2 className="h-4 w-4" /> DSA Tracker
                    </Button>
                  </Link>
                  <Link to="/news">
                    <Button variant={isActive('/news') ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                      <Newspaper className="h-4 w-4" /> News
                    </Button>
                  </Link>
                </>
              )}

              {role === 'recruiter' && (
                <>
                  <Link to="/recruiter/dashboard">
                    <Button variant={isActive('/recruiter/dashboard') ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                      <Layers className="h-4 w-4" /> Dashboard
                    </Button>
                  </Link>
                  <Link to="/recruiter/jobs">
                    <Button variant={isActive('/recruiter/jobs') ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                      <Briefcase className="h-4 w-4" /> Job Postings
                    </Button>
                  </Link>
                </>
              )}

              {role === 'admin' && (
                <>
                  <Link to="/admin/dashboard">
                    <Button variant={isActive('/admin/dashboard') ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                      <Shield className="h-4 w-4" /> Admin Console
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Right Action Icons & Theme Toggle */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/profile')}
                  className="rounded-lg gap-2 text-xs"
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  <span className="max-w-[100px] truncate">{user?.full_name?.split(' ')[0] || 'Profile'}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="rounded-lg text-destructive hover:bg-destructive/10"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => navigate('/auth')} className="rounded-lg">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
