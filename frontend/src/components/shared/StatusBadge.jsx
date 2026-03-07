import React from 'react';
import Badge from '../ui/Badge';

const StatusBadge = ({ status, className = '' }) => {
  const getBadgeVariant = (s) => {
    switch (s?.toUpperCase()) {
      case 'APPROVED':
      case 'ACTIVE':
      case 'PAID':
      case 'ENROLLED':
      case 'GRADUATED':
        return 'success';
      case 'PENDING':
      case 'UNDER_REVIEW':
      case 'PARTIAL_PAYMENT':
        return 'warning';
      case 'REJECTED':
      case 'DROPPED':
      case 'FAILED':
      case 'UNPAID':
        return 'error';
      case 'ON_LEAVE':
      case 'INC':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const formatStatus = (s) => {
    if (!s) return 'Unknown';
    return s.replace(/_/g, ' ').toLowerCase();
  };

  return (
    <Badge variant={getBadgeVariant(status)} className={className}>
      {formatStatus(status)}
    </Badge>
  );
};

export default StatusBadge;
