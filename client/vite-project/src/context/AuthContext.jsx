import { createContext, useContext, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '../api/http';

const AuthContext = createContext(null);

async function fetchCurrentUser() {
  const { data } = await http.get('/auth/me');
  return data?.user ?? null;
}

export function AuthProvider({ children }) {
  const qc = useQueryClient();

  const {
    data: user = null,
    isPending,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const { data } = await http.post('/auth/login', { email, password });
      return data?.user ?? null;
    },
    onSuccess: (nextUser) => {
      qc.setQueryData(['auth', 'me'], nextUser);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await http.post('/auth/logout');
    },
    onSuccess: () => {
      qc.setQueryData(['auth', 'me'], null);
    },
  });

  const loginAsync = loginMutation.mutateAsync;
  const logoutAsync = logoutMutation.mutateAsync;
  const isLoggingIn = loginMutation.isPending;
  const isLoggingOut = logoutMutation.isPending;

  const value = useMemo(
    () => ({
      user,
      isLoading: isPending || isFetching,
      error,
      login: loginAsync,
      logout: logoutAsync,
      isLoggingIn,
      isLoggingOut,
    }),
    [
      user,
      isPending,
      isFetching,
      error,
      loginAsync,
      logoutAsync,
      isLoggingIn,
      isLoggingOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
