import { db } from './firebase-config.js'; 
import { collection, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id') || "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const statusBar = document.getElementById('status-bar-inv');
const buscadorInv = document.getElementById('buscador-inv');

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
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        let listaProductos = [];
        snapshot.forEach(doc => listaProductos.push({ id: doc.id, ...doc.data() }));
        renderizarTabla(listaProductos);
        mostrarStatusBar(`Total: ${snapshot.size} productos`, "success");
    });
}

function renderizarTabla(productos) {
    if (!cuerpoTabla) return;
    cuerpoTabla.innerHTML = productos.map(p => `
        <tr>
            <td>${p.barras || 'N/A'}</td>
            <td>${p.sku || 'N/A'}</td>
            <td>${p.nombre || 'Sin nombre'}</td>
            <td>$ ${parseFloat(p.costo || 0).toFixed(2)}</td>
            <td>${p.ganancia || 0}%</td>
            <td>$ ${parseFloat(p.precio || 0).toFixed(2)}</td>
            <td>${p.stock || 0}</td>
            <td><button onclick="window.eliminarProducto('${p.id}', '${p.nombre}')">🗑️</button></td>
        </tr>
    `).join('');
}

window.eliminarProducto = async (id, nombre) => {
    if (confirm(`¿Eliminar ${nombre}?`)) {
        await deleteDoc(doc(db, "usuarios", USER_ID, "productos", id));
    }
};

document.addEventListener('DOMContentLoaded', inicializarInventario);
