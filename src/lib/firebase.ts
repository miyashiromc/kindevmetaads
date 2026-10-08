import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  type Firestore 
} from 'firebase/firestore';

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

// Configuración de Firestore con persistencia IndexedDB multiventana
// Evita volver a leer toda la colección de 134 leads en cada F5 o visita móvil, protegiendo la cuota gratuita (Spark)
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  firestoreDb = getFirestore(app);
}

export const db: Firestore = firestoreDb;

/**
 * Elimina propiedades undefined para evitar errores fatales en Firestore SDK (Unsupported field value: undefined)
 */
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

