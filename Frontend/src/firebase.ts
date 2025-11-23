// src/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber as fbSignInWithPhoneNumber,
  signInWithPopup as fbSignInWithPopup,
  type UserCredential,
} from "firebase/auth";

/**
 * NOTE: verify your storageBucket value if you use Storage (common value: "<project>.appspot.com")
 */
const firebaseConfig = {
  apiKey: "AIzaSyDXc8ses6TEXsPkP2iytX6yVO4iIfS4foc",
  authDomain: "coinsphere-9f342.firebaseapp.com",
  projectId: "coinsphere-9f342",
  storageBucket: "coinsphere-9f342.appspot.com",
  messagingSenderId: "1046339437819",
  appId: "1:1046339437819:web:5d9137daec76d33a7bdc5e",
  measurementId: "G-N4RH8C8QXV",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Re-export the original firebase/auth functions (keep original signatures)
export const Recaptcha = RecaptchaVerifier;
export const signInWithPhoneNumber = fbSignInWithPhoneNumber; // signature: (auth, phoneNumber, appVerifier)
export const signInWithPopup = fbSignInWithPopup; // signature: (auth, provider): Promise<UserCredential>

export default app;
