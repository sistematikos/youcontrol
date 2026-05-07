import { db } from './firebase-config.js';
import { 
    collection, getDocs, doc, getDoc, onSnapshot, deleteDoc, updateDoc, addDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const UID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 1;

// 1. MONITOR DE TASA EN TIEMPO REAL
function inicializarMonitorTasa() {
    const tasaRef = doc(db, "usuarios", UID, "configuracion", "tasa");
    onSnapshot(tasaRef, (snapshot) => {
        if (snapshot.exists()) {
            tasaActual = snapshot.data().valor;
            const display = document.getElementById('tasa-actual');
            if (display) display.innerText = tasaActual.toLocaleString('es-VE');
            cargarProductos();
        }
    });
}

// 2. CARGAR LISTA DE PRODUCTOS
async function cargarProductos() {
    const tabla = document.getElementById('tabla-productos');
    if (!tabla) return;

    try {
        const snap = await getDocs(collection(db, "usuarios", UID, "productos"));
        tabla.innerHTML = "";

        snap.forEach((docSnap) => {
            const p = docSnap.data();
            const id = docSnap.id;
            const totalBs = (p.precio * tasaActual).toLocaleString('es-VE');

            tabla.innerHTML += `
                <tr>
                    <td><b>${p.nombre}</b></td>
                    <td><span class="badge-stock ${p.stock <= 5 ? 'stock-low' : 'stock-ok'}">${p.stock}</span></td>
                    <td>$${p.precio.toFixed(2)}</td>
                    <td style="color: #15803D; font-weight: 800;">Bs. ${totalBs}</td>
                    <td>
                        <button class="btn-accion btn-edit" onclick="prepararEdicion('${id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-accion btn-delete" onclick="confirmarEliminacion('${id}', '${p.nombre}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
}

// 3. FUNCIONES DE MODIFICACIÓN (AGREGADAS NUEVAMENTE)

window.abrirModalProducto = async () => {
    const nombre = prompt("Nombre del nuevo producto:");
    if (!nombre) return;
    const precio = parseFloat(prompt("Precio en Dólares ($):", "0"));
    const stock = parseInt(prompt("Stock inicial:", "0"));

    try {
        await addDoc(collection(db, "usuarios", UID, "productos"), {
            nombre: nombre,
            precio: precio,
            stock: stock
        });
        alert("Producto agregado con éxito");
    } catch (e) { alert("Error: " + e.message); }
};

window.prepararEdicion = async (id) => {
    const docRef = doc(db, "usuarios", UID, "productos", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        const p = docSnap.data();
        const nuevoNombre = prompt("Editar nombre:", p.nombre);
        const nuevoPrecio = parseFloat(prompt("Editar precio ($):", p.precio));
        const nuevoStock = parseInt(prompt("Editar stock:", p.stock));

        if (nuevoNombre) {
            await updateDoc(docRef, {
                nombre: nuevoNombre,
                precio: nuevoPrecio,
                stock: nuevoStock
            });
            alert("Producto actualizado");
        }
    }
};

window.abrirModalTasa = async () => {
    const nuevaTasa = parseFloat(prompt("Ingrese la nueva tasa del día (Bs.):", tasaActual));
    if (nuevaTasa) {
        try {
            await updateDoc(doc(db, "usuarios", UID, "configuracion", "tasa"), {
                valor: nuevaTasa
            });
            alert("Tasa actualizada correctamente");
        } catch (e) { alert("Error al actualizar tasa"); }
    }
};

window.confirmarEliminacion = async (id, nombre) => {
    if (confirm(`¿Eliminar ${nombre}?`)) {
        await deleteDoc(doc(db, "usuarios", UID, "productos", id));
        cargarProductos();
    }
};

inicializarMonitorTasa();
