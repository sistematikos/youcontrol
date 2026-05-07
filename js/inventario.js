import { auth, getUserRef, db } from './firebase-config.js';
import { addDoc, getDocs, query, orderBy, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let tasaDia = 1;
let editandoID = null; // Variable clave para la integridad

// 1. OBTENER TASA Y REFRESCAR
async function obtenerTasa() {
    const user = auth.currentUser;
    if (!user) return;
    const tasaRef = doc(db, "usuarios", user.uid, "configuracion", "tasa");
    const docSnap = await getDoc(tasaRef);
    if (docSnap.exists()) { tasaDia = docSnap.data().valor; }
    document.getElementById('tasa-actual').innerText = tasaDia.toFixed(2);
    cargarInventario();
}

// 2. CAMBIAR TASA DIARIA
window.cambiarTasa = async () => {
    const nueva = prompt("Ingrese la tasa de hoy (Bs.):", tasaDia);
    if (nueva && !isNaN(nueva)) {
        await setDoc(doc(db, "usuarios", auth.currentUser.uid, "configuracion", "tasa"), { 
            valor: Number(nueva), 
            fecha: new Date() 
        });
        obtenerTasa();
    }
};

// 3. PREPARAR EDICIÓN (Cargar datos en el modal)
window.prepararEdicion = async (id) => {
    editandoID = id;
    const docRef = doc(db, "usuarios", auth.currentUser.uid, "productos", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const p = docSnap.data();
        document.getElementById('p-nombre').value = p.nombre;
        document.getElementById('p-stock').value = p.stock;
        document.getElementById('p-precio').value = p.precio;
        
        // Cambios visuales para modo edición
        document.querySelector('#modal-prod h2').innerText = "Editar Producto";
        document.querySelector('#form-nuevo-producto button[type="submit"]').innerText = "ACTUALIZAR ARTÍCULO";
        document.getElementById('modal-prod').style.display = 'flex';
    }
};

// 4. CARGAR INVENTARIO (Renderizado de Tabla)
async function cargarInventario() {
    const ref = getUserRef("productos");
    if (!ref) return;
    const snap = await getDocs(query(ref, orderBy("nombre", "asc")));
    const listaContainer = document.getElementById('lista-productos');
    listaContainer.innerHTML = "";

    snap.forEach((doc) => {
        const p = doc.data();
        const stockClase = p.stock > 5 ? 'ok' : 'low';
        const precioBs = (p.precio * tasaDia).toLocaleString('es-VE', { minimumFractionDigits: 2 });

        listaContainer.innerHTML += `
            <tr>
                <td style="font-weight: 700; color: var(--navy);">${p.nombre}</td>
                <td><span class="badge ${stockClase}">${p.stock}</span></td>
                <td style="font-weight: 700; color: var(--text);">$${p.precio}</td>
                <td style="font-weight: 800; color: #15803D; background: rgba(21,128,61,0.05);">Bs. ${precioBs}</td>
                <td>
                    <button class="btn-primary" style="padding: 6px 12px; font-size: 11px; background: var(--navy); box-shadow: none;" 
                            onclick="prepararEdicion('${doc.id}')">
                        <i class="fas fa-edit"></i> EDITAR
                    </button>
                </td>
            </tr>
        `;
    });
}

// 5. CERRAR MODAL Y LIMPIAR
window.cerrarModal = () => {
    editandoID = null;
    document.getElementById('modal-prod').style.display = 'none';
    document.getElementById('form-nuevo-producto').reset();
    document.querySelector('#modal-prod h2').innerText = "Nuevo Artículo";
    document.querySelector('#form-nuevo-producto button[type="submit"]').innerText = "GUARDAR EN NUBE";
};

// 6. GUARDAR / ACTUALIZAR
document.getElementById('form-nuevo-producto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = {
        nombre: document.getElementById('p-nombre').value,
        stock: Number(document.getElementById('p-stock').value),
        precio: Number(document.getElementById('p-precio').value),
        actualizado: new Date()
    };

    try {
        if (editandoID) {
            await updateDoc(doc(db, "usuarios", auth.currentUser.uid, "productos", editandoID), datos);
        } else {
            await addDoc(getUserRef("productos"), { ...datos, creado: new Date() });
        }
        cerrarModal();
        cargarInventario();
    } catch (err) { alert("Error al procesar: " + err.message); }
});

// SESIÓN Y LOGOUT
auth.onAuthStateChanged(user => { if (user) obtenerTasa(); else window.location.assign("index.html"); });
document.getElementById('btn-logout').onclick = () => signOut(auth);
