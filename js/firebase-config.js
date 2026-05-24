import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "youcontrol-1d60a.firebaseapp.com",
    projectId: "youcontrol-1d60a",
    storageBucket: "youcontrol-1d60a.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
// Exportar la base de datos para usarla en otros archivos
export const db = getFirestore(app);

