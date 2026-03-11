import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User
} from 'firebase/auth';
import { auth } from '../firebase';
import { API_BASE } from '../AppDev/costanti';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  needsConsent: boolean;
  credits: number;
  shields: number;
  subscription: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  markConsentGiven: () => void;
  refreshWallet: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [credits, setCredits] = useState(0);
  const [shields, setShields] = useState(0);
  const [subscription, setSubscription] = useState<string | null>(null);

  const checkConsent = useCallback(async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`${API_BASE}/user-consent/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNeedsConsent(!data.accepted);
      } else {
        setNeedsConsent(true);
      }
    } catch {
      setNeedsConsent(true);
    }
  }, []);

  const fetchWallet = useCallback(async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`${API_BASE}/wallet/balance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits ?? 0);
        setShields(data.shields ?? 0);
        setSubscription(data.subscription ?? null);
      }
    } catch {
      // Silenzioso — il saldo resta a 0
    }
  }, []);

  const refreshWallet = useCallback(async () => {
    if (user) await fetchWallet(user);
  }, [user, fetchWallet]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        checkConsent(firebaseUser);
        fetchWallet(firebaseUser);
      } else {
        setNeedsConsent(false);
        setCredits(0);
        setShields(0);
        setSubscription(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [checkConsent, fetchWallet]);

  useEffect(() => {
    const handler = () => { refreshWallet(); };
    window.addEventListener('wallet-changed', handler);
    return () => window.removeEventListener('wallet-changed', handler);
  }, [refreshWallet]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    return user.getIdToken();
  };

  const markConsentGiven = () => {
    setNeedsConsent(false);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, needsConsent, credits, shields, subscription,
      login, signup, loginWithGoogle, logout, getIdToken, markConsentGiven, refreshWallet
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere usato dentro AuthProvider');
  }
  return context;
}
