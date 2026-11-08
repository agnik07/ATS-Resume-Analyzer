import React, { useState } from 'react';
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
  Zap,
  Menu,
  X,
  Users,
  Search,
} from 'lucide-react';

export default function Navbar() {
  const { user, role, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer shrink-0"
            onClick={() => navigate(role === 'recruiter' ? '/recruiter/dashboard' : role === 'admin' ? '/admin/dashboard' : '/dashboard')}
          >
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
                SkillGap <span className="text-primary">AI</span>
                {role === 'recruiter' && (
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Recruiter
                  </span>
                )}
                {role === 'admin' && (
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          {isAuthenticated && (
            <div className="hidden lg:flex items-center gap-1">
              {role === 'student' && (
                <>
                  <Link to="/dashboard">
                    <Button variant={isActive('/dashboard') ? 'secondary' : 'ghost'} size="sm" className="gap-2 text-xs font-semibold">
                      <Layers className="h-4 w-4" /> Dashboard
                    </Button>
                  </Link>
                  <Link to="/upload-resume">
                    <Button
                      variant={isActive('/upload-resume') || isActive('/career-readiness') ? 'secondary' : 'ghost'}
                      size="sm"
                      className="gap-2 text-xs font-semibold"
                    >
                      <Zap className="h-4 w-4" /> Career Readiness
                    </Button>
                  </Link>
                  <Link to="/jobs">
                    <Button variant={isActive('/jobs') ? 'secondary' : 'ghost'} size="sm" className="gap-2 text-xs font-semibold">
                      <Briefcase className="h-4 w-4" /> Jobs
                    </Button>
                  </Link>
                  <Link to="/dsa-tracker">
                    <Button variant={isActive('/dsa-tracker') ? 'secondary' : 'ghost'} size="sm" className="gap-2 text-xs font-semibold">
                      <Code2 className="h-4 w-4" /> DSA Tracker
                    </Button>
                  </Link>
                  <Link to="/news">
                    <Button variant={isActive('/news') || isActive('/hiring-intelligence') ? 'secondary' : 'ghost'} size="sm" className="gap-2 text-xs font-semibold">
                      <Newspaper className="h-4 w-4" /> Hiring Intelligence
                    </Button>
                  </Link>
                </>
              )}

              {role === 'recruiter' && (
                <>
                  <Link to="/recruiter/dashboard">
                    <Button variant={isActive('/recruiter/dashboard') ? 'secondary' : 'ghost'} size="sm" className="gap-2 text-xs font-semibold">
                      <Layers className="h-4 w-4" /> Dashboard
                    </Button>
                  </Link>
                  <Link to="/recruiter/jobs">
                    <Button variant={isActive('/recruiter/jobs') ? 'secondary' : 'ghost'} size="sm" className="gap-2 text-xs font-semibold">
                      <Briefcase className="h-4 w-4" /> Manage Jobs
                    </Button>
                  </Link>
                  <Link to="/recruiter/pipeline">
                    <Button variant={isActive('/recruiter/pipeline') ? 'secondary' : 'ghost'} size="sm" className="gap-2 text-xs font-semibold">
                      <Users className="h-4 w-4" /> Candidate Pipeline
                    </Button>
                  </Link>
                  <Link to="/recruiter/candidates">
                    <Button variant={isActive('/recruiter/candidates') ? 'secondary' : 'ghost'} size="sm" className="gap-2 text-xs font-semibold">
                      <Search className="h-4 w-4" /> Candidate Intelligence
                    </Button>
                  </Link>
                </>
              )}

              {role === 'admin' && (
                <>
                  <Link to="/admin/dashboard">
                    <Button variant={isActive('/admin/dashboard') ? 'secondary' : 'ghost'} size="sm" className="gap-2 text-xs font-semibold">
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
                  className="rounded-xl gap-2 text-xs font-semibold hidden sm:flex"
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  <span className="max-w-[100px] truncate">{user?.full_name?.split(' ')[0] || 'Profile'}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="rounded-xl text-destructive hover:bg-destructive/10 hidden sm:flex"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>

                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden rounded-xl"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => navigate('/auth')} className="rounded-xl font-semibold text-xs">
                Sign In
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isAuthenticated && mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border space-y-2">
            {role === 'student' && (
              <>
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={isActive('/dashboard') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2 text-xs">
                    <Layers className="h-4 w-4" /> Dashboard
                  </Button>
                </Link>
                <Link to="/upload-resume" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={isActive('/upload-resume') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2 text-xs">
                    <Zap className="h-4 w-4" /> Career Readiness
                  </Button>
                </Link>
                <Link to="/jobs" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={isActive('/jobs') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2 text-xs">
                    <Briefcase className="h-4 w-4" /> Jobs
                  </Button>
                </Link>
                <Link to="/dsa-tracker" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={isActive('/dsa-tracker') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2 text-xs">
                    <Code2 className="h-4 w-4" /> DSA Tracker
                  </Button>
                </Link>
                <Link to="/news" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={isActive('/news') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2 text-xs">
                    <Newspaper className="h-4 w-4" /> Hiring Intelligence
                  </Button>
                </Link>
              </>
            )}

            {role === 'recruiter' && (
              <>
                <Link to="/recruiter/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={isActive('/recruiter/dashboard') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2 text-xs">
                    <Layers className="h-4 w-4" /> Dashboard
                  </Button>
                </Link>
                <Link to="/recruiter/jobs" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={isActive('/recruiter/jobs') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2 text-xs">
                    <Briefcase className="h-4 w-4" /> Manage Jobs
                  </Button>
                </Link>
                <Link to="/recruiter/pipeline" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={isActive('/recruiter/pipeline') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2 text-xs">
                    <Users className="h-4 w-4" /> Candidate Pipeline
                  </Button>
                </Link>
                <Link to="/recruiter/candidates" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={isActive('/recruiter/candidates') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2 text-xs">
                    <Search className="h-4 w-4" /> Candidate Intelligence
                  </Button>
                </Link>
              </>
            )}

            <div className="pt-2 border-t border-border flex items-center justify-between px-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/profile');
                }}
                className="rounded-xl gap-2 text-xs"
              >
                <UserIcon className="h-3.5 w-3.5" /> Profile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="rounded-xl text-destructive hover:bg-destructive/10 text-xs gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
