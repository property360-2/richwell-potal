import React from 'react';
import { ServerCrash } from 'lucide-react';
import Button from '../../components/ui/Button';

const ServerError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4 text-center">
      <ServerCrash size={64} className="text-red-500 mb-6" />
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Server Error</h1>
      <p className="text-slate-600 max-w-md mb-8">
        Something went wrong on our end. Please try again later or contact support if the problem persists.
      </p>
      <Button onClick={() => window.location.reload()}>
        Reload Page
      </Button>
    </div>
  );
};

export default ServerError;
