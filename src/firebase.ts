import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC0pGItbC228Z3ySVXeuJmVnbOS_FPkYkE",
  authDomain: "puppals-456c7.firebaseapp.com",
  projectId: "puppals-456c7",
  storageBucket: "puppals-456c7.firebasestorage.app",
  messagingSenderId: "13710676551",
  appId: "1:13710676551:web:7b9bd774c5e70958c45762",
  measurementId: "G-S5N02BHKEL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
