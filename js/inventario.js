import { auth, getUserRef } from './firebase-config.js';
import { addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const listaContainer = document.getElementById('lista-productos');
const formProducto = document.getElementById('form-nuevo-producto');

// Cargar y Renderizar
async function cargarInventario() {
    const ref = getUserRef("productos");
    if (!ref) return;

    const snap = await getDocs(query(ref, orderBy("nombre", "asc")));
    listaContainer.innerHTML = "";

    snap.forEach((doc) => {
        const p = doc.data();
        const stockClase = p.stock > 5 ? 'ok' : 'low';
        
        listaContainer.innerHTML += `
            <tr>
                <td style="font-weight: 700; color: var(--navy);">${p.nombre}</td>
                <td><span class="badge ${stockClase}">${p.stock} Unidades</span></td>
                <td style="font-weight: 700; color: var(--electric);">$${p.precio}</td>
                <td>
                    <button class="btn-primary" style="padding: 6px 12px; font-size: 12px; box-shadow: none;">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// Evento Guardar
if (formProducto) {
    formProducto.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await addDoc(getUserRef("productos"), {
                nombre: document.getElementById('p-nombre').value,
                stock: Number(document.getElementById('p-stock').value),
                precio: Number(document.getElementById('p-precio').value),
                fecha: new Date()
            });
            document.getElementById('modal-prod').style.display = 'none';
            formProducto.reset();
            cargarInventario();
        } catch (error) {
            alert("Error al guardar: " + error.message);
        }
    });
}

// Logout
document.getElementById('btn-logout').onclick = () => signOut(auth);

// Monitoreo de sesión
auth.onAuthStateChanged(user => { if(user) cargarInventario(); });
