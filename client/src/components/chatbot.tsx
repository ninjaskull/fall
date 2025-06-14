import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, MessageCircle, Send } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ContactData {
  name: string;
  email: string;
  mobile: string;
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

type ChatStep = 'welcome' | 'name' | 'email' | 'mobile' | 'submitting' | 'success';

export default function Chatbot({ isOpen, onClose }: ChatbotProps) {
  const [step, setStep] = useState<ChatStep>('welcome');
  const [contactData, setContactData] = useState<ContactData>({
    name: '',
    email: '',
    mobile: ''
  });
  const [currentInput, setCurrentInput] = useState('');
  const { toast } = useToast();

  const submitMutation = useMutation({
    mutationFn: async (data: ContactData) => {
      const response = await apiRequest("POST", "/api/contact", data);
      return response.json();
    },
    onSuccess: () => {
      setStep('success');
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to submit your information. Please try again.", 
        variant: "destructive" 
      });
      setStep('mobile'); // Go back to last step
    },
  });

  const handleNext = () => {
    switch (step) {
      case 'welcome':
        setStep('name');
        break;
      case 'name':
        if (currentInput.trim()) {
          setContactData(prev => ({ ...prev, name: currentInput.trim() }));
          setCurrentInput('');
          setStep('email');
        }
        break;
      case 'email':
        if (currentInput.trim() && currentInput.includes('@')) {
          setContactData(prev => ({ ...prev, email: currentInput.trim() }));
          setCurrentInput('');
          setStep('mobile');
        }
        break;
      case 'mobile':
        if (currentInput.trim()) {
          const finalData = { ...contactData, mobile: currentInput.trim() };
          setContactData(finalData);
          setStep('submitting');
          submitMutation.mutate(finalData);
        }
        break;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNext();
    }
  };

  const resetChat = () => {
    setStep('welcome');
    setContactData({ name: '', email: '', mobile: '' });
    setCurrentInput('');
  };

  const handleClose = () => {
    resetChat();
    onClose();
  };

  if (!isOpen) return null;

  const renderContent = () => {
    switch (step) {
      case 'welcome':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm">Hi there! 👋 I'm here to help you get started with our campaign management platform.</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm">I'll need a few details from you, and then our team will get back to you shortly!</p>
            </div>
            <Button onClick={handleNext} className="w-full">
              Let's Get Started
            </Button>
          </div>
        );
      
      case 'name':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm">Great! Let's start with your name. What should I call you?</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your full name"
                autoFocus
              />
            </div>
            <Button 
              onClick={handleNext} 
              disabled={!currentInput.trim()}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              Continue
            </Button>
          </div>
        );
      
      case 'email':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm">Nice to meet you, {contactData.name}! What's your email address?</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="your@email.com"
                autoFocus
              />
            </div>
            <Button 
              onClick={handleNext} 
              disabled={!currentInput.trim() || !currentInput.includes('@')}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              Continue
            </Button>
          </div>
        );
      
      case 'mobile':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm">Perfect! Last question - what's your mobile number?</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                type="tel"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="+1 (555) 123-4567"
                autoFocus
              />
            </div>
            <Button 
              onClick={handleNext} 
              disabled={!currentInput.trim()}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit
            </Button>
          </div>
        );
      
      case 'submitting':
        return (
          <div className="space-y-4 text-center">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm">Submitting your information...</p>
            </div>
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          </div>
        );
      
      case 'success':
        return (
          <div className="space-y-4 text-center">
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">Thank you, {contactData.name}! 🎉</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">We've received your information and our team will get back to you soon!</p>
            </div>
            <Button onClick={handleClose} className="w-full bg-green-600 hover:bg-green-700">
              Close
            </Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white shadow-xl animate-in slide-in-from-bottom-4 duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-lg">Let's Connect!</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}