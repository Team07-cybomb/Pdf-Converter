
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Zap, 
  TrendingUp, 
  Users,
  Download,
  Upload,
  FileCheck,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalFiles: 0,
    conversions: 0,
    compressions: 0,
    signatures: 0
  });

  useEffect(() => {
    const files = JSON.parse(localStorage.getItem(`pdfpro_files_${user?.id}`) || '[]');
    setStats({
      totalFiles: files.length,
      conversions: user?.usage?.conversions || 0,
      compressions: user?.usage?.compressions || 0,
      signatures: user?.usage?.signatures || 0
    });
  }, [user]);

  const statCards = [
    { 
      label: 'Total Files', 
      value: stats.totalFiles, 
      icon: FileText, 
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50'
    },
    { 
      label: 'Conversions', 
      value: stats.conversions, 
      icon: Zap, 
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50'
    },
    { 
      label: 'Compressions', 
      value: stats.compressions, 
      icon: Download, 
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50'
    },
    { 
      label: 'Signatures', 
      value: stats.signatures, 
      icon: FileCheck, 
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50'
    },
  ];

  const recentActivity = [
    { action: 'Converted PDF to Word', time: '2 hours ago', icon: Zap },
    { action: 'Compressed 3 files', time: '5 hours ago', icon: Download },
    { action: 'Merged 2 PDFs', time: '1 day ago', icon: FileText },
    { action: 'Added signature', time: '2 days ago', icon: FileCheck },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-4xl font-bold gradient-text">Welcome back, {user?.name}! 👋</h1>
        <p className="text-gray-600">Here's what's happening with your PDFs today</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-effect rounded-2xl p-6 hover-lift"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-effect rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            Recent Activity
          </h2>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex items-center gap-4 p-3 rounded-xl hover:bg-purple-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-500">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-effect rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Quick Stats
          </h2>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Storage Used</span>
                <span className="text-sm font-bold text-blue-600">2.4 GB / 10 GB</span>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                <div className="h-full w-1/4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">API Calls This Month</span>
                <span className="text-sm font-bold text-purple-600">847 / 1000</span>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                <div className="h-full w-4/5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Plan Limit</span>
                <span className="text-sm font-bold text-green-600">{user?.plan === 'free' ? 'Free' : user?.plan === 'pro' ? 'Pro' : 'Business'}</span>
              </div>
              <p className="text-xs text-gray-600">
                {user?.plan === 'free' ? '10 conversions/day' : user?.plan === 'pro' ? 'Unlimited conversions' : 'Enterprise features'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
  