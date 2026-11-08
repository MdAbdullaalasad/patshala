import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCdLKQ94-U_RZUuByWk-qVYpeNEoQbYL9E",
  authDomain: "patshala-66f34.firebaseapp.com",
  projectId: "patshala-66f34",
  storageBucket: "patshala-66f34.firebasestorage.app",
  messagingSenderId: "678483194356",
  appId: "1:678483194356:web:fdd7fb6382fcc77be809a1",
  measurementId: "G-74J3KBE60T"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();