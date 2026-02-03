import { Loader2 } from 'lucide-react';

export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
        </div>
        <p className="text-lg font-medium text-amber-900">Loading...</p>
      </div>
    </div>
  );
}
