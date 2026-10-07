import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.assign("index_inventario.html");
        } catch (error) {
            alert("Error: Usuario o contraseña incorrectos");
        }
    });
}

// Protector de rutas
onAuthStateChanged(auth, (user) => {
    const isLogin = window.location.pathname.includes("index.html") || window.location.pathname.endsWith("/");
    if (user && isLogin) {
        window.location.assign("index_inventario.html");
    } else if (!user && !isLogin) {
        window.location.assign("index.html");
    }
});