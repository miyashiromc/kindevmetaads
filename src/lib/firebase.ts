import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'kindevmetaads',
  appId: '1:180204990500:web:1275e0b3070d8583b328b1',
  storageBucket: 'kindevmetaads.firebasestorage.app',
  apiKey: 'AIzaSyDXrSYbXOKVeTabU-YVj0xcQLG0nlPbLoI',
  authDomain: 'kindevmetaads.firebaseapp.com',
  messagingSenderId: '180204990500'
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const db: Firestore = getFirestore(app);
