import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Button from '../../components/ui/Button';

const Forbidden = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4 text-center">
      <ShieldAlert size={64} className="text-red-500 mb-6" />
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Access Denied</h1>
      <p className="text-slate-600 max-w-md mb-8">
        You don't have permission to access this page. If you believe this is a mistake, please contact the system administrator.
      </p>
      <div className="flex gap-4">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go Back
        </Button>
        <Button onClick={() => navigate('/')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default Forbidden;
