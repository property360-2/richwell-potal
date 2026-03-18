import React from 'react';
import Modal from './Modal';
import Button from './Button';

const SessionWarning = ({ isOpen, onExtend, onLogout, timeLeft }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onLogout}
      title="Session Expiring"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onLogout}>Logout</Button>
          <Button variant="primary" onClick={onExtend}>Stay Logged In</Button>
        </div>
      }
    >
      <div className="text-center py-4">
        <p className="text-slate-600 mb-2">
          Your session will expire in about <strong>{timeLeft}</strong> minutes due to inactivity.
        </p>
        <p className="text-sm text-slate-500">
          Would you like to extend your session?
        </p>
      </div>
    </Modal>
  );
};

export default SessionWarning;
