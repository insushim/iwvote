import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getFunctions, type Functions } from 'firebase/functions';


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function validateConfig(): void {
  const requiredKeys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ] as const;

  const missing = requiredKeys.filter(
    (key) => !firebaseConfig[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase configuration: ${missing.join(', ')}. ` +
      'Ensure all NEXT_PUBLIC_FIREBASE_* environment variables are set.'
    );
  }
}

validateConfig();

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);
const functions: Functions = getFunctions(app);

export { app, db, auth, functions };
