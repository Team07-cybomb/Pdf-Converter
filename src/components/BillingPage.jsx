import React from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const BillingPage = () => {
  const { user, updateUser } = useAuth();

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      icon: Zap,
      color: 'from-gray-500 to-slate-600',
      features: [
        '10 conversions per day',
        '5 MB max file size',
        'Basic PDF tools',
        'Email support',
        '1 GB storage'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$12',
      period: 'per month',
      icon: Crown,
      color: 'from-purple-500 to-pink-500',
      popular: true,
      features: [
        'Unlimited conversions',
        '100 MB max file size',
        'All PDF tools',
        'Priority support',
        '50 GB storage',
        'Batch processing',
        'API access',
        'No watermarks'
      ]
    },
    {
      id: 'business',
      name: 'Business',
      price: '$49',
      period: 'per month',
      icon: Building2,
      color: 'from-blue-600 to-indigo-600',
      features: [
        'Everything in Pro',
        'Unlimited file size',
        'Team collaboration',
        'SSO & SAML',
        '500 GB storage',
        'Advanced API',
        'Custom workflows',
        'Dedicated support',
        'SLA guarantee'
      ]
    }
  ];

  const handleUpgrade = (planId) => {
    if (planId === user?.plan) {
      toast({
        title: "Already subscribed",
        description: `You're currently on the ${planId} plan`,
      });
      return;
    }

    updateUser({ plan: planId });
    toast({
      title: "Plan updated! 🎉",
      description: `You've successfully upgraded to the ${planId} plan`,
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2 text-center"
      >
        <h1 className="text-4xl md:text-5xl font-bold gradient-text">Pricing & Plans 💳</h1>
        <p className="text-gray-600 text-lg">Choose the perfect plan for your needs</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
        {plans.map((plan, index) => {
          const Icon = plan.icon;
          const isCurrentPlan = user?.plan === plan.id;
          
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-effect rounded-2xl p-8 flex flex-col hover-lift relative ${
                plan.popular ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                <Icon className="h-7 w-7 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-600 ml-2">/ {plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrentPlan}
                className={`w-full ${
                  isCurrentPlan
                    ? 'bg-gray-300 cursor-not-allowed'
                    : `bg-gradient-to-r ${plan.color}`
                }`}
              >
                {isCurrentPlan ? 'Current Plan' : 'Upgrade Now'}
              </Button>
            </motion.div>
          );
        })}
      </div>

      {user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-effect rounded-2xl p-6 mt-12"
        >
          <h2 className="text-xl font-bold mb-4">Current Usage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50">
              <p className="text-sm text-gray-600 mb-1">Conversions This Month</p>
              <p className="text-2xl font-bold text-blue-600">{user?.usage?.conversions || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50">
              <p className="text-sm text-gray-600 mb-1">Compressions</p>
              <p className="text-2xl font-bold text-purple-600">{user?.usage?.compressions || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50">
              <p className="text-sm text-gray-600 mb-1">Signatures</p>
              <p className="text-2xl font-bold text-green-600">{user?.usage?.signatures || 0}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default BillingPage;