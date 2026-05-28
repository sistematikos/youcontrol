import { db } from './firebase-config.js'; 
import { collection, onSnapshot, doc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
        const precioUsd = parseFloat(p.precio || 0);
        const precioBs = (precioUsd * tasaActual).toFixed(2).replace('.', ',');
        
        return `
        <tr>
            <td>${p.barras || 'N/A'}</td>
            <td>${p.sku || 'N/A'}</td>
            <td>${p.nombre || 'Sin nombre'}</td>
            <td>$ ${parseFloat(p.costo || 0).toFixed(2)}</td>
            <td>${p.ganancia || 0}%</td>
            <td>$ ${precioUsd.toFixed(2)}<br><small style="color:gray;">${precioBs} Bs</small></td>
            <td>${p.stock || 0}</td>
            <td><button onclick="window.eliminarProducto('${p.id}', '${p.nombre}')">🗑️</button></td>
        </tr>
    `}).join('');
}

window.eliminarProducto = async (id, nombre) => {
    if (confirm(`¿Eliminar ${nombre}?`)) {
        await deleteDoc(doc(db, "usuarios", USER_ID, "productos", id));
    }
};

document.addEventListener('DOMContentLoaded', inicializarInventario);
