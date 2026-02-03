import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, LogOut, Home } from 'lucide-react';
import { getRoleDefaultRoute } from '@/lib/auth/navigation';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleGoHome = () => {
    if (user) {
      navigate(getRoleDefaultRoute(user.role));
    } else {
      navigate('/login');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-red-100">
              <ShieldAlert className="h-12 w-12 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleGoHome}
            className="w-full"
            variant="default"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
          <Button
            onClick={handleSignOut}
            className="w-full"
            variant="outline"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
