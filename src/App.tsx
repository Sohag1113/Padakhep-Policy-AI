import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { PolicyDocument, ChatMessage, UserRole, UserProfile, CompanySettings } from './types';
import { askPolicyQuestion } from './services/geminiService';
import Header from './components/Header';
import Footer from './components/Footer';
import ChatInterface from './components/ChatInterface';
import AdminDashboard from './components/AdminDashboard';
import { Shield, LogIn, Loader2, AlertCircle, MessageSquare, X } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: "PADAKHEP",
  companyShortName: "PADAKHEP",
  companyAddress: "House-548, Road-10, Baitul Aman Housing Society, Adabor, Dhaka-1207",
  companyContact: "+880 2-58151113",
  companyEmail: "support@padakhep.org",
  logoUrl: ""
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [policies, setPolicies] = useState<PolicyDocument[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginProcessing, setIsLoginProcessing] = useState(false);
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch or create user profile
        const path = `users/${firebaseUser.uid}`;
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            // Default role is user, except for the specific admin email
            const role: UserRole = firebaseUser.email === "shohagsarker1113@gmail.com" ? 'admin' : 'user';
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              role,
              displayName: firebaseUser.displayName || ""
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
              setUserProfile(newProfile);
            } catch (setErr) {
              handleFirestoreError(setErr, OperationType.WRITE, path);
            }
          }
        } catch (err) {
          if (err instanceof Error && err.message.includes('Firestore Error')) {
            setError("Permission denied. Your account might not be authorized yet.");
          } else {
            handleFirestoreError(err, OperationType.GET, path);
          }
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Policies Listener
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'policies'), orderBy('uploadDate', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PolicyDocument));
      setPolicies(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'policies');
    });

    return () => unsubscribe();
  }, [user]);

  // Settings Listener
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'company'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as CompanySettings);
      } else {
        // Initialize settings if they don't exist
        setSettings(DEFAULT_SETTINGS);
      }
    }, (err) => {
      console.warn("Settings fetch failed (likely not initialized):", err);
    });

    return () => unsubscribe();
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    // Restriction: Only @padakhep.org emails allowed
    if (!email.toLowerCase().endsWith('@padakhep.org')) {
      setError("Only @padakhep.org emails are authorized to login.");
      return;
    }

    // Default password check
    if (password !== "pmuk@2026") {
      setError("Invalid password. Please use the default company password.");
      return;
    }

    setIsLoginProcessing(true);
    try {
      try {
        // Try to sign in
        await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: any) {
        // If sign in fails, try to create the account (auto-registration)
        // We check for common error codes that suggest the user doesn't exist
        if (signInErr.code === 'auth/user-not-found' || 
            signInErr.code === 'auth/invalid-credential' || 
            signInErr.code === 'auth/invalid-login-credentials') {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
          } catch (createErr: any) {
            // If creation fails because user already exists, then the original sign-in error was likely something else
            if (createErr.code === 'auth/email-already-in-use') {
              throw signInErr;
            }
            throw createErr;
          }
        } else {
          throw signInErr;
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("Email/Password login is not enabled in Firebase. Please enable it in the Firebase Console under Authentication > Sign-in method.");
      } else {
        setError(err.message || "Failed to login. Please try again.");
      }
    } finally {
      setIsLoginProcessing(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setError(null);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        console.log("Login popup closed by user");
        return;
      }
      console.error("Login error:", err);
      setError("Failed to login with Google.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMessages([]);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleSendMessage = async (content: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const answer = await askPolicyQuestion(content, policies);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answer,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleUploadPolicy = async (name: string, content: string, department: string) => {
    if (!user) return;
    
    const policyRef = doc(collection(db, 'policies'));
    const newPolicy: PolicyDocument = {
      id: policyRef.id,
      name,
      content,
      department,
      uploadDate: new Date().toISOString(),
      uploadedBy: user.uid
    };

    try {
      await setDoc(policyRef, newPolicy);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `policies/${policyRef.id}`);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'policies', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `policies/${id}`);
    }
  };

  const handleUpdateSettings = async (newSettings: CompanySettings) => {
    try {
      await setDoc(doc(db, 'settings', 'company'), newSettings);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/company');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-[#312e81]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#312e81] relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/10 rounded-full blur-[120px]" />
        
        <Header settings={settings} />
        
        <main className="flex-1 flex items-center justify-center p-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-sm w-full bg-white/95 backdrop-blur-sm p-6 rounded-[2rem] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] border border-white/20 text-center"
          >
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner overflow-hidden">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.companyName} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <Shield className="w-8 h-8 text-[#312e81]" />
              )}
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 mb-1">{settings.companyShortName || settings.companyName} Policy AI</h2>
            <p className="text-gray-500 mb-4 font-medium text-xs">Secure access to company policies.</p>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 text-xs font-medium border border-red-100"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-3 text-left">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@padakhep.org"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#312e81] outline-none transition-all font-medium text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter company password"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#312e81] outline-none transition-all font-medium text-sm"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoginProcessing}
                className="w-full flex items-center justify-center gap-2 bg-[#312e81] text-white py-3 rounded-xl font-bold text-base hover:bg-[#3730a3] transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
              >
                {isLoginProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                {isLoginProcessing ? 'Authenticating...' : 'Login to Portal'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Or Admin Access</p>
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 py-2 px-4 rounded-xl font-bold text-xs border border-gray-200 hover:bg-gray-50 transition-all active:scale-[0.98] group"
              >
                <div className="bg-white p-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                Admin Login with Google
              </button>
            </div>
            
            <p className="mt-4 text-[10px] text-gray-400 font-medium leading-tight">
              By logging in, you agree to comply with the company's data protection and security policies.
            </p>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 relative">
      {!isChatOpen && <Header userEmail={user.email || ""} onLogout={handleLogout} settings={settings} />}
      
      <main className={cn(
        "flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 transition-all",
        isChatOpen ? "p-0 md:p-4 max-w-none" : ""
      )}>
        <AnimatePresence mode="wait">
          {isChatOpen ? (
            <motion.div
              key="chat-page"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-[calc(100vh-32px)] md:h-[calc(100vh-80px)] flex flex-col bg-white rounded-none md:rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative"
            >
              {/* Minimal Close Button */}
              <button 
                onClick={() => setIsChatOpen(false)}
                className="absolute top-4 right-4 z-[110] p-3 bg-white/80 backdrop-blur-md hover:bg-white rounded-2xl shadow-xl border border-gray-100 transition-all group active:scale-95"
                title="Close Chat"
              >
                <X className="w-6 h-6 text-gray-400 group-hover:text-red-500 transition-colors" />
              </button>

              <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50">
                <div className="p-4 md:p-6 bg-white border-b border-gray-100 flex-shrink-0 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#312e81]"></div>
                  <h4 className="text-2xl md:text-3xl font-black text-gray-900">{settings.companyName} Policy AI</h4>
                  <p className="text-gray-500 font-medium mt-1">Intelligent Policy Assistant</p>
                </div>
                <div className="flex-1 min-h-0">
                  <ChatInterface 
                    messages={messages} 
                    onSendMessage={handleSendMessage} 
                    isLoading={isChatLoading} 
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="main-content"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-12">
                  <AdminDashboard 
                    policies={policies} 
                    onUpload={handleUploadPolicy} 
                    onDelete={handleDeletePolicy} 
                    role={userProfile?.role || 'user'}
                    onOpenChat={() => setIsChatOpen(true)}
                    settings={settings}
                    onUpdateSettings={handleUpdateSettings}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer settings={settings} />
    </div>
  );
}
