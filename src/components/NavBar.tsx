import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UserCircle2, Home, CreditCard } from 'lucide-react';

export function NavBar() {
  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center py-4">
        <div className="flex items-center">
          <Link to="/" className="text-xl font-bold text-primary mr-8">How2</Link>
          
          <div className="hidden md:flex space-x-1">
            <Link to="/">
              <Button variant="ghost" className="flex gap-2 items-center">
                <Home size={18} />
                Home
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="ghost" className="flex gap-2 items-center">
                <CreditCard size={18} />
                Pricing
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium">
            10 videos left
          </div>
          
          <Link to="/profile">
            <Button variant="ghost" className="flex gap-2 items-center">
              <UserCircle2 size={20} />
              <span className="hidden md:inline">Profile</span>
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
} 