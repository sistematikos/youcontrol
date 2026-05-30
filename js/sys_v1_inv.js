import { db } from './firebase-config.js'; 
import { collection, onSnapshot, doc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id') || "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const statusBar = document.getElementById('status-bar-inv');
const buscadorInv = document.getElementById('buscador-inv');

let tasaActual = 1.00; // Variable para almacenar la tasa

// --- BUSCADOR ---
buscadorInv.addEventListener('input', (e) => {
    const termino = e.target.value.toLowerCase();
    const filas = document.querySelectorAll('#cuerpo-tabla tr');
    filas.forEach(fila => {
        fila.style.display = fila.textContent.toLowerCase().includes(termino) ? '' : 'none';
    });
});

function mostrarStatusBar(msg, tipo) { 
    if (statusBar) {
        statusBar.innerText = msg;
        statusBar.style.display = 'block';
        statusBar.style.backgroundColor = (tipo === 'error') ? '#f8d7da' : '#d4edda';
        statusBar.style.color = (tipo === 'error') ? '#721c24' : '#155724';
    }
}

async function inicializarInventario() {
    // 1. Obtener la tasa desde el perfil del usuario
    try {
        const userDoc = await getDoc(doc(db, "usuarios", USER_ID));
        if (userDoc.exists()) {
            tasaActual = parseFloat(userDoc.data().tasa_bcv) || 1.00;
        }
    } catch (e) {
        console.error("Error al obtener tasa:", e);
    }

    // 2. Escuchar productos
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        let listaProductos = [];
        snapshot.forEach(doc => listaProductos.push({ id: doc.id, ...doc.data() }));
        renderizarTabla(listaProductos);
        mostrarStatusBar(`Total: ${snapshot.size} productos | Tasa: ${tasaActual}`, "success");
    });
}

function renderizarTabla(productos) {
    if (!cuerpoTabla) return;
    cuerpoTabla.innerHTML = productos.map(p => {
        return `
        <tr data-id="${p.id}">
            <td>${p.barras || 'N/A'}</td>
            <td>${p.sku || 'N/A'}</td>
            <td>${p.nombre || 'Sin nombre'}</td>
            <td>$ ${parseFloat(p.costo || 0).toFixed(2)}</td>
            <td>${p.ganancia || 0}%</td>
            <td>$ ${parseFloat(p.precio || 0).toFixed(2)}</td>
            <td>${p.stock || 0}</td>
            <td>
                <button onclick="window.editarProducto('${p.id}', '${p.nombre}', ${p.precio}, ${p.stock})">✏️</button>
                <button onclick="window.eliminarProducto('${p.id}', '${p.nombre}')">🗑️</button>
            </td>
        </tr>
    `}).join('');
}

window.editarProducto = (id, nombre, precio, stock) => {
    const fila = document.querySelector(`tr[data-id="${id}"]`);
    fila.innerHTML = `
        <td>${fila.cells[0].innerText}</td>
        <td>${fila.cells[1].innerText}</td>
        <td>${fila.cells[2].innerText}</td>
        <td>${fila.cells[3].innerText}</td>
        <td>${fila.cells[4].innerText}</td>
        <td><input type="number" id="edit-precio-${id}" value="${precio}"></td>
        <td><input type="number" id="edit-stock-${id}" value="${stock}"></td>
        <td><button onclick="window.guardarEdicion('${id}')">💾</button></td>
    `;
};

// Función para guardar cambios
window.guardarEdicion = async (id) => {
    const nuevoPrecio = document.getElementById(`edit-precio-${id}`).value;
    const nuevoStock = document.getElementById(`edit-stock-${id}`).value;
    
    await updateDoc(doc(db, "usuarios", USER_ID, "productos", id), {
        precio: parseFloat(nuevoPrecio),
        stock: parseInt(nuevoStock)
    });
    alert("Producto actualizado");
};

window.eliminarProducto = async (id, nombre) => {
    if (confirm(`¿Eliminar ${nombre}?`)) {
        await deleteDoc(doc(db, "usuarios", USER_ID, "productos", id));
    }
};

document.addEventListener('DOMContentLoaded', inicializarInventario);
