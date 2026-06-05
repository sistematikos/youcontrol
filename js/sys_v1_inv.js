import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, updateDoc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CAMBIADO PARA QUE APUNTE A TU ESTRUCTURA REAL
const USER_ID = "YC-2026-001"; 
const cuerpoTabla = document.getElementById('cuerpo-tabla');

window.filtrarPorDepto = () => {
    // Obtenemos el valor seleccionado
    const select = document.getElementById('filtro-depto');
    const val = select.value.trim().toLowerCase();
    
    // Obtenemos todas las filas
    const filas = document.querySelectorAll('#cuerpo-tabla tr');
    
    console.log("Filtrando por:", val); // Para depurar en consola (F12)

    filas.forEach(tr => {
        // Obtenemos el depto guardado en el dataset de la fila
        const deptoFila = (tr.dataset.depto || "").trim().toLowerCase();
        
        console.log("Comparando fila:", deptoFila, "con filtro:", val);

        // Si es "todos" o coinciden, mostramos; si no, ocultamos
        if (val === "todos" || deptoFila === val) {
            tr.style.display = '';
        } else {
            tr.style.display = 'none';
        }
    });
};

// --- BUSCADOR ---
document.getElementById('buscador-inv').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#cuerpo-tabla tr').forEach(tr => {
        tr.style.display = tr.innerText.toLowerCase().includes(term) ? '' : 'none';
    });
});

// --- GUARDAR ---
window.actualizarSoloStock = async (id, val) => {
    await updateDoc(doc(db, "usuarios", USER_ID, "productos", id), { stock: parseInt(val) || 0 });
};

// --- INICIALIZACIÓN ---
async function init() {
    // 1. Cargar Departamentos
    const deptoSnap = await getDocs(collection(db, "usuarios", USER_ID, "departamentos"));
    const select = document.getElementById('filtro-depto');
    deptoSnap.forEach(d => {
        const nombre = d.data().nombre;
        select.innerHTML += `<option value="${nombre}">${nombre.toUpperCase()}</option>`;
    });

    // 2. Cargar Productos
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
        cuerpoTabla.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            const tr = document.createElement('tr');
            tr.dataset.depto = p.departamento || 'GENERAL';
            tr.innerHTML = `
                <td>${p.nombre || 'Sin nombre'}</td>
                <td>${tr.dataset.depto}</td>
                <td>$${parseFloat(p.costo || 0).toFixed(2)}</td>
                <td>$${parseFloat(p.precio || 0).toFixed(2)}</td>
                <td><input type="number" class="input-stock" value="${p.stock || 0}" 
                    onchange="window.actualizarSoloStock('${d.id}', this.value)"></td>
            `;
            cuerpoTabla.appendChild(tr);
        });
    });
}

document.addEventListener('DOMContentLoaded', init);
