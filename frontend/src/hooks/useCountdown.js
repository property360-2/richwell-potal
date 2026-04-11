/**
 * Richwell Portal — useCountdown Hook
 * 
 * Provides a standardized way to handle deadline-based timers across the application.
 * Returns the time remaining in milliseconds and a formatted string.
 */

import { useState, useEffect, useCallback } from 'react';

const useCountdown = (deadlineDate) => {
  const [timeLeft, setTimeLeft] = useState(null);

  /**
   * Calculates the difference between the deadline and now.
   * Logic: (Deadline Timestamp) - (Current Timestamp)
   */
  const calculateTimeLeft = useCallback(() => {
    if (!deadlineDate) return null;
    
    const deadline = new Date(deadlineDate).getTime();
    const now = new Date().getTime();
    const diff = deadline - now;
    
    return diff > 0 ? diff : 0;
  }, [deadlineDate]);

  useEffect(() => {
    const initialTime = calculateTimeLeft();
    setTimeLeft(initialTime);

    if (initialTime === null || initialTime <= 0) return;

    const timer = setInterval(() => {
      const diff = calculateTimeLeft();
      setTimeLeft(diff);
      
      if (diff <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  /**
   * Formats milliseconds into a human-readable string (e.g., "2d 5h 30m 15s")
   * 
   * @param {number} ms - Milliseconds to format
   * @returns {string|null} - Formatted string or null if ms is null
   */
  const formatCountdown = (ms) => {
    if (ms === null) return null;
    if (ms <= 0) return "Expired";
    
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((ms % (1000 * 60)) / 1000);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    
    return parts.join(' ');
  };

  return {
    timeLeft,
    formattedTime: formatCountdown(timeLeft),
    isExpired: timeLeft !== null && timeLeft <= 0
  };
};

export default useCountdown;
