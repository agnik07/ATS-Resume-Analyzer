import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { User, Mail, Building, Shield, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">Account Profile</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            View your verified platform credentials and account permissions.
          </p>
        </motion.div>

        <div className="glass-card rounded-2xl p-8 border border-border space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-border">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-primary-foreground text-2xl font-bold">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{user?.full_name || 'User Profile'}</h2>
              <span className="text-xs uppercase font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl border border-border bg-background/50 flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <span className="text-xs text-muted-foreground block">Email Address</span>
                <strong className="text-foreground">{user?.email || 'user@example.com'}</strong>
              </div>
            </div>

            {user?.company_name && (
              <div className="p-4 rounded-xl border border-border bg-background/50 flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground block">Organization</span>
                  <strong className="text-foreground">{user.company_name}</strong>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl border border-border bg-background/50 flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <span className="text-xs text-muted-foreground block">Role Authority</span>
                <strong className="text-foreground capitalize">{role} Access</strong>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button variant="destructive" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
