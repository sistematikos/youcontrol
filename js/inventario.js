import { db } from './firebase-config.js';
import { 
    collection, getDocs, doc, getDoc, onSnapshot, deleteDoc, updateDoc, addDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const UID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 1;

// --- MONITOR DE TASA ---
function iniciarMonitor() {
    const tasaRef = doc(db, "usuarios", UID, "configuracion", "tasa");
    onSnapshot(tasaRef, (docSnap) => {
        if (docSnap.exists()) {
            tasaActual = docSnap.data().valor;
            document.getElementById('tasa-actual').innerText = tasaActual.toLocaleString('es-VE');
            cargarProductos();
        }
    });
}

// --- CARGAR TABLA ---
async function cargarProductos() {
    const tabla = document.getElementById('tabla-productos');
    if (!tabla) return;

    try {
        const snap = await getDocs(collection(db, "usuarios", UID, "productos"));
        tabla.innerHTML = "";

        snap.forEach((docSnap) => {
            const p = docSnap.data();
            const id = docSnap.id;
            const precioBs = (p.precio * tasaActual).toLocaleString('es-VE');

            tabla.innerHTML += `
                <tr>
                    <td><b style="color:var(--navy)">${p.nombre}</b></td>
                    <td><span class="badge-stock ${p.stock <= 5 ? 'stock-low' : 'stock-ok'}">${p.stock}</span></td>
                    <td style="font-weight:600">$${p.precio.toFixed(2)}</td>
                    <td style="color:#15803D; font-weight:800">Bs. ${precioBs}</td>
                    <td>
                        <button class="btn-accion btn-edit" onclick="prepararEdicion('${id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-accion btn-delete" onclick="confirmarEliminacion('${id}', '${p.nombre}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });
    } catch (e) { console.error("Error:", e); }
}

// --- FUNCIONES GLOBALES (VINCULADAS A WINDOW) ---

window.abrirModalTasa = async () => {
    const nueva = prompt("Ingrese la nueva tasa (Bs.):", tasaActual);
    if (nueva && !isNaN(nueva)) {
        await updateDoc(doc(db, "usuarios", UID, "configuracion", "tasa"), { valor: parseFloat(nueva) });
        alert("Tasa actualizada.");
    }
};

window.abrirModalProducto = async () => {
    const nombre = prompt("Nombre del producto:");
    if (!nombre) return;
    const precio = parseFloat(prompt("Precio ($):", "0"));
    const stock = parseInt(prompt("Stock inicial:", "0"));

    await addDoc(collection(db, "usuarios", UID, "productos"), {
        nombre: nombre,
        precio: precio,
        stock: stock
    });
    alert("Producto creado.");
    cargarProductos();
};

window.prepararEdicion = async (id) => {
    const docRef = doc(db, "usuarios", UID, "productos", id);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
        const p = snap.data();
        const nNombre = prompt("Nuevo nombre:", p.nombre);
        if (nNombre === null) return;
        const nPrecio = parseFloat(prompt("Nuevo precio ($):", p.precio));
        const nStock = parseInt(prompt("Nuevo stock:", p.stock));

        await updateDoc(docRef, {
            nombre: nNombre,
            precio: nPrecio,
            stock: nStock
        });
        alert("Producto modificado.");
        cargarProductos();
    }
};

window.confirmarEliminacion = async (id, nombre) => {
    if (confirm(`¿Seguro que desea eliminar ${nombre}?`)) {
        await deleteDoc(doc(db, "usuarios", UID, "productos", id));
        cargarProductos();
    }
};

// Iniciar sistema
iniciarMonitor();
