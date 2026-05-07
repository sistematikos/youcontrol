import { auth, getUserRef } from './firebase-config.js';
import { addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const tabla = document.getElementById('tabla-body');
const form = document.getElementById('form-inv');

async function cargar() {
    const ref = getUserRef("productos");
    if(!ref) return;
    const snap = await getDocs(ref);
    tabla.innerHTML = "";
    snap.forEach(doc => {
        const p = doc.data();
        tabla.innerHTML += `<tr><td>${p.nombre}</td><td>${p.stock}</td><td>$${p.precio}</td></tr>`;
    });
}

if(form){
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await addDoc(getUserRef("productos"), {
            nombre: document.getElementById('nom').value,
            stock: document.getElementById('cant').value,
            precio: document.getElementById('pre').value
        });
        document.getElementById('modal').style.display='none';
        cargar();
    });
}

document.getElementById('btn-logout').onclick = () => signOut(auth);
auth.onAuthStateChanged(user => { if(user) cargar(); });