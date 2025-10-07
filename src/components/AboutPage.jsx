import React from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, Users, Sparkles } from 'lucide-react';

const AboutPage = () => {
  const team = [
    { name: 'Jane Doe', role: 'CEO & Founder', img: 'https://i.pravatar.cc/150?img=4' },
    { name: 'John Smith', role: 'CTO', img: 'https://i.pravatar.cc/150?img=5' },
    { name: 'Emily White', role: 'Head of Product', img: 'https://i.pravatar.cc/150?img=6' },
    { name: 'Michael Brown', role: 'Lead Engineer', img: 'https://i.pravatar.cc/150?img=7' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-20">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-5xl font-bold gradient-text">About PDF Pro</h1>
        <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
          We're on a mission to make document management simple, secure, and accessible for everyone.
        </p>
      </motion.section>

      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold mb-4">Our Story</h2>
          <p className="text-gray-700 space-y-4">
            <span>Founded in 2023, PDF Pro started with a simple idea: working with PDFs shouldn't be complicated. Frustrated by clunky, expensive software, our founders set out to build a single, intuitive platform that could handle every PDF task imaginable.</span>
            <span>From a small team of passionate developers, we've grown into a global service trusted by millions of individuals and businesses. Our focus remains unchanged: to deliver powerful, user-friendly tools that streamline workflows and boost productivity.</span>
          </p>
        </div>
        <div className="w-full h-80 rounded-2xl overflow-hidden">
          <img className="w-full h-full object-cover" alt="Modern office space with people collaborating" src="https://images.unsplash.com/photo-1681184025442-1517cb9319c1" />
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-8 text-center">
        <div className="glass-effect p-8 rounded-2xl">
          <Target className="h-12 w-12 mx-auto text-purple-600 mb-4" />
          <h3 className="text-2xl font-semibold mb-2">Our Mission</h3>
          <p className="text-gray-600">To empower users with a comprehensive and intuitive suite of tools for all their document needs.</p>
        </div>
        <div className="glass-effect p-8 rounded-2xl">
          <Eye className="h-12 w-12 mx-auto text-purple-600 mb-4" />
          <h3 className="text-2xl font-semibold mb-2">Our Vision</h3>
          <p className="text-gray-600">To be the world's most trusted and user-friendly platform for digital document management.</p>
        </div>
        <div className="glass-effect p-8 rounded-2xl">
          <Sparkles className="h-12 w-12 mx-auto text-purple-600 mb-4" />
          <h3 className="text-2xl font-semibold mb-2">Our Values</h3>
          <p className="text-gray-600">Simplicity, Security, Innovation, and Customer-Centricity drive everything we do.</p>
        </div>
      </section>

      <section className="text-center">
        <h2 className="text-4xl font-bold mb-10">Meet the Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {team.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <img className="w-32 h-32 rounded-full mx-auto mb-4 shadow-lg" alt={`Portrait of ${member.name}`} src="https://images.unsplash.com/photo-1589132012505-a2d7a7a39589" />
              <h4 className="text-lg font-semibold">{member.name}</h4>
              <p className="text-purple-600">{member.role}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AboutPage;