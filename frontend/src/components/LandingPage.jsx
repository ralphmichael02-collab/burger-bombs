// frontend/src/components/LandingPage.jsx
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const apps = [
    { title: 'Customer Store', desc: 'Mobile ordering & tracking', path: '/store', icon: '🛍️', color: 'bg-blue-500' },
    { title: 'Kiosk Mode', desc: 'Self-service tablet ordering', path: '/kiosk', icon: '📱', color: 'bg-purple-500' },
    { title: 'Cashier POS', desc: 'Point of Sale system', path: '/pos', icon: '💵', color: 'bg-yellow-500' },
    { title: 'Kitchen Display', desc: 'Real-time order tickets', path: '/kitchen', icon: '👨‍🍳', color: 'bg-red-500' },
    { title: 'Rider App', desc: 'Delivery dashboard & GPS', path: '/rider', icon: '🛵', color: 'bg-green-500' },
    { title: 'Admin Dashboard', desc: 'Management & Analytics', path: '/admin', icon: '📊', color: 'bg-gray-800' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4 tracking-tight">Burger Bombs 🍔</h1>
          <p className="text-xl text-gray-400">Hybrid Cloud POS & E-Commerce Architecture</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <Link 
              key={app.title} 
              to={app.path}
              className="bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-gray-500 transition transform hover:-translate-y-1 hover:shadow-2xl group"
            >
              <div className={`w-12 h-12 ${app.color} rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition`}>
                {app.icon}
              </div>
              <h2 className="text-xl font-bold mb-1">{app.title}</h2>
              <p className="text-sm text-gray-400">{app.desc}</p>
            </Link>
          ))}
        </div>
        
        <p className="text-center text-gray-500 text-sm mt-12">
          Local-First Architecture powered by Docker, EnvKit, Neon, and Vercel.
        </p>
      </div>
    </div>
  );
}