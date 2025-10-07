import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Twitter, Linkedin, Facebook } from 'lucide-react';

const Footer = () => {
  const sections = {
    'Product': [
      { name: 'Home', path: '/' },
      { name: 'Tools', path: '/tools' },
      { name: 'Pricing', path: '/pricing' },
      { name: 'FAQ', path: '/faq' },
    ],
    'Company': [
      { name: 'About Us', path: '/about' },
      { name: 'Contact Us', path: '/contact' },
      { name: 'Blog', path: '/blog' },
      { name: 'Press Release', path: '/press' },
    ],
    'Legal': [
      { name: 'Security', path: '/security' },
      { name: 'Privacy Policy', path: '/privacy' },
      { name: 'Terms & Conditions', path: '/terms' },
      { name: 'Cookies Policy', path: '/cookies' },
    ],
  };

  return (
    <footer className="bg-white/50 backdrop-blur-lg border-t border-purple-200/50 text-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold gradient-text">PDF Pro</span>
            </Link>
            <p className="text-sm text-gray-600">The ultimate toolkit for all your PDF needs. Edit, convert, sign, and manage documents with ease.</p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-500 hover:text-purple-600"><Twitter /></a>
              <a href="#" className="text-gray-500 hover:text-purple-600"><Linkedin /></a>
              <a href="#" className="text-gray-500 hover:text-purple-600"><Facebook /></a>
            </div>
          </div>

          {Object.entries(sections).map(([title, links]) => (
            <div key={title}>
              <p className="font-semibold text-gray-900 mb-4">{title}</p>
              <ul className="space-y-3">
                {links.map(link => (
                  <li key={link.name}>
                    <Link to={link.path} className="text-sm text-gray-600 hover:text-purple-600 transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8 text-center">
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} PDF Pro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;