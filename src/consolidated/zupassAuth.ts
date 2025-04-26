import { useEffect, useState } from 'react';
import { useZuAuth } from 'zuauth';
import { EdDSATicketFieldsToReveal } from "@pcd/zk-eddsa-event-ticket-pcd";

// Configuration
const ZUPASS_URL = "https://zupass.org";

// Default fields to reveal in the ticket
const defaultTicketFields: EdDSATicketFieldsToReveal = {
  revealTicketId: false,
  revealEventId: true,
  revealProductId: true,
  revealTimestampConsumed: false,
  revealTimestampSigned: false,
  revealAttendeeSemaphoreId: false,
  revealIsConsumed: false,
  revealIsRevoked: false,
  revealTicketCategory: false,
  revealAttendeeEmail: true,
  revealAttendeeName: false
};

export function useZupassAuth() {
  const { authenticate, pcd } = useZuAuth();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle PCD updates
  useEffect(() => {
    if (pcd) {
      handleLogin(pcd);
    }
  }, [pcd]);

  // Login function
  const login = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get nonce from server
      const response = await fetch('/api/auth', {
        method: 'GET'
      });
      const { nonce } = await response.json();

      // Trigger Zupass authentication
      authenticate(defaultTicketFields, nonce);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login with PCD
  const handleLogin = async (pcd: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pcd }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const { user } = await response.json();
      setUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify authentication');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await fetch('/api/auth', {
        method: 'DELETE'
      });

      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to logout');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    login,
    logout,
    isLoading,
    error
  };
} 