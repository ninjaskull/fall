import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Code, Smartphone, Shield, TrendingUp, Settings, Rocket } from "lucide-react";
import PasswordModal from "@/components/password-modal";

export default function Landing() {
  const [clickCount, setClickCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleYearClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount >= 5) {
      setShowPasswordModal(true);
      setClickCount(0);
    }
  };

  const services = [
    {
      icon: Code,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      title: "Full-Stack Development",
      description: "End-to-end web application development using modern frameworks like React, Node.js, and cloud technologies.",
      features: ["React & Next.js Frontend", "Node.js & Express Backend", "Database Design & Integration"]
    },
    {
      icon: Smartphone,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      title: "Responsive Design",
      description: "Mobile-first design approach ensuring your application looks perfect on all devices and screen sizes.",
      features: ["Mobile-First Approach", "Cross-Browser Compatibility", "Performance Optimization"]
    },
    {
      icon: Shield,
      color: "text-green-600",
      bgColor: "bg-green-50",
      title: "Security & Performance",
      description: "Enterprise-grade security implementation with performance optimization for scalable applications.",
      features: ["Data Encryption & Security", "Load Testing & Optimization", "Cloud Infrastructure"]
    },
    {
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      title: "Analytics & Insights",
      description: "Comprehensive analytics integration to track user behavior and optimize your application's performance.",
      features: ["User Behavior Tracking", "Performance Monitoring", "Custom Dashboards"]
    },
    {
      icon: Settings,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      title: "API Development",
      description: "RESTful API design and development with comprehensive documentation and testing.",
      features: ["RESTful API Design", "Documentation & Testing", "Third-party Integrations"]
    },
    {
      icon: Rocket,
      color: "text-green-500",
      bgColor: "bg-green-50",
      title: "Deployment & DevOps",
      description: "Streamlined deployment processes with CI/CD pipelines and cloud infrastructure management.",
      features: ["CI/CD Pipeline Setup", "Cloud Deployment", "Monitoring & Maintenance"]
    }
  ];

  const portfolioItems = [
    {
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
      category: "E-commerce",
      tech: "React",
      title: "Modern E-commerce Platform",
      description: "Full-featured online store with advanced filtering, payment integration, and admin dashboard."
    },
    {
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
      category: "SaaS",
      tech: "Dashboard",
      title: "Analytics Dashboard",
      description: "Comprehensive analytics platform with real-time data visualization and reporting tools."
    },
    {
      image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
      category: "Mobile",
      tech: "React Native",
      title: "Mobile Application",
      description: "Cross-platform mobile app with native performance and seamless user experience."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      title: "CEO, TechStart Inc.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&face",
      content: "Acme Web Agency transformed our online presence completely. The team delivered a stunning, high-performance website that exceeded our expectations."
    },
    {
      name: "Michael Chen",
      title: "CTO, DataFlow Solutions",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&face",
      content: "Outstanding work! The dashboard they built for us has streamlined our operations and improved our team's productivity significantly."
    },
    {
      name: "Emily Rodriguez",
      title: "Founder, GrowthLab",
      image: "https://images.unsplash.com/photo-1494790108755-2616b332db29?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&face",
      content: "Professional, reliable, and incredibly talented. They took our complex requirements and delivered a solution that works perfectly."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Code className="text-white text-sm" />
              </div>
              <span className="text-xl font-bold text-slate-900">Acme Web Agency</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-slate-600 hover:text-slate-900 transition-colors">Services</a>
              <a href="#portfolio" className="text-slate-600 hover:text-slate-900 transition-colors">Portfolio</a>
              <a href="#testimonials" className="text-slate-600 hover:text-slate-900 transition-colors">Testimonials</a>
              <Button>Get Started</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-20 sm:py-32">
        <div className="absolute inset-0 bg-grid-slate-100"></div>
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-slate-900 mb-6">
              Build <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Amazing</span> Web Experiences
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              We craft cutting-edge web applications and digital experiences that drive results for your business. From concept to deployment, we've got you covered.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="px-8 py-4">Start Your Project</Button>
              <Button variant="outline" size="lg" className="px-8 py-4">View Our Work</Button>
            </div>
          </div>
          
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur-3xl transform rotate-6"></div>
            <img 
              src="https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=600" 
              alt="Modern web development workspace" 
              className="relative rounded-2xl shadow-2xl w-full max-w-4xl mx-auto" 
            />
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Our Services</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              We offer comprehensive web development solutions tailored to your business needs
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8">
                  <div className={`w-12 h-12 ${service.bgColor} rounded-xl flex items-center justify-center mb-6`}>
                    <service.icon className={`${service.color} text-xl`} />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{service.title}</h3>
                  <p className="text-slate-600 mb-4">{service.description}</p>
                  <ul className="text-sm text-slate-500 space-y-1">
                    {service.features.map((feature, idx) => (
                      <li key={idx}>• {feature}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Section */}
      <section id="portfolio" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Our Portfolio</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Discover some of our recent projects and the innovative solutions we've delivered
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {portfolioItems.map((item, index) => (
              <Card key={index} className="group cursor-pointer overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-48 object-cover" 
                />
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">{item.category}</span>
                    <span className="px-2 py-1 bg-green-100 text-green-600 text-xs font-medium rounded-full">{item.tech}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-600 text-sm">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button variant="ghost" className="text-blue-600 font-semibold hover:text-blue-700">
              View All Projects →
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">What Our Clients Say</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Don't just take our word for it - hear from the businesses we've helped grow
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-slate-50 border-slate-200">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    <div className="flex text-yellow-400 text-sm">
                      {'★'.repeat(5)}
                    </div>
                  </div>
                  <blockquote className="text-slate-700 mb-6">
                    "{testimonial.content}"
                  </blockquote>
                  <div className="flex items-center">
                    <img 
                      src={testimonial.image} 
                      alt={testimonial.name} 
                      className="w-12 h-12 rounded-full object-cover" 
                    />
                    <div className="ml-4">
                      <div className="font-semibold text-slate-900">{testimonial.name}</div>
                      <div className="text-slate-600 text-sm">{testimonial.title}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Code className="text-white text-sm" />
                </div>
                <span className="text-xl font-bold">Acme Web Agency</span>
              </div>
              <p className="text-slate-400 mb-6 max-w-md">
                Building the future of web development, one project at a time. We create digital experiences that drive results.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Web Development</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mobile Apps</a></li>
                <li><a href="#" className="hover:text-white transition-colors">UI/UX Design</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Consulting</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-400">
              © <span 
                className="cursor-pointer hover:text-white transition-colors select-none"
                onClick={handleYearClick}
              >
                2025
              </span> Acme Web Agency
            </p>
            <p className="text-slate-400 text-sm mt-4 md:mt-0">
              Privacy Policy • Terms of Service
            </p>
          </div>
        </div>
      </footer>

      <PasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </div>
  );
}
