import { auth, getUserRef, db } from './firebase-config.js';
import { addDoc, getDocs, query, orderBy, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variable para saber qué producto estamos editando
let editandoID = null;

// --- FUNCIÓN PARA ABRIR EL MODO EDICIÓN ---
window.prepararEdicion = async (id) => {
    editandoID = id;
    const user = auth.currentUser;
    const docRef = doc(db, "usuarios", user.uid, "productos", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const p = docSnap.data();
        // Llenamos el modal con los datos actuales
        document.getElementById('p-nombre').value = p.nombre;
        document.getElementById('p-stock').value = p.stock;
        document.getElementById('p-precio').value = p.precio;
        
        // Cambiamos el título y botón del modal
        document.querySelector('#modal-prod h2').innerText = "Editar Producto";
        document.querySelector('#form-nuevo-producto button[type="submit"]').innerText = "ACTUALIZAR CAMBIOS";
        
        document.getElementById('modal-prod').style.display = 'flex';
    }
};

// --- MODIFICACIÓN DEL EVENTO SUBMIT ---
const formProducto = document.getElementById('form-nuevo-producto');
formProducto.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const datos = {
        nombre: document.getElementById('p-nombre').value,
        stock: Number(document.getElementById('p-stock').value),
        precio: Number(document.getElementById('p-precio').value),
        ultima_modificacion: new Date()
    };

    try {
        if (editandoID) {
            // MODO EDICIÓN
            const docRef = doc(db, "usuarios", auth.currentUser.uid, "productos", editandoID);
            await updateDoc(docRef, datos);
            editandoID = null; // Limpiamos el ID
        } else {
            // MODO NUEVO
            await addDoc(getUserRef("productos"), { ...datos, fecha_creacion: new Date() });
        }

        // Resetear interfaz
        document.getElementById('modal-prod').style.display = 'none';
        formProducto.reset();
        document.querySelector('#modal-prod h2').innerText = "Nuevo Artículo";
        document.querySelector('#form-nuevo-producto button[type="submit"]').innerText = "GUARDAR EN NUBE";
        cargarInventario();
        
    } catch (error) {
        console.error("Error:", error);
        alert("No se pudo procesar la solicitud.");
    }
});

// --- ACTUALIZACIÓN DEL RENDERIZADO (Tabla) ---
// Asegúrate de que en tu función cargarInventario(), el botón de la tabla sea así:
/*
    <button class="btn-primary" style="padding: 6px 10px; font-size: 11px; background: var(--navy);" onclick="prepararEdicion('${doc.id}')">
        <i class="fas fa-edit"></i> EDITAR
    </button>
*/
