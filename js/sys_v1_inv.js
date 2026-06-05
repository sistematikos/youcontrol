import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "YC-2026-001"; 
const cuerpoTabla = document.getElementById('cuerpo-tabla');

// --- FILTRO CORREGIDO ---
window.filtrarPorDepto = () => {
    const select = document.getElementById('filtro-depto');
    const valorFiltro = select.value.trim().toLowerCase(); // Usamos el VALUE ("001")
    
    document.querySelectorAll('#cuerpo-tabla tr').forEach(tr => {
        const deptoFila = (tr.dataset.deptoId || "").trim().toLowerCase();
        
        console.log("Comparando fila:", deptoFila, "con filtro:", valorFiltro);

        if (valorFiltro === "todos" || deptoFila === valorFiltro) {
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
        // Asumimos que el documento tiene un ID (001, 002) y un nombre
        const id = d.id; 
        const nombre = d.data().nombre;
        select.innerHTML += `<option value="${id}">${nombre}</option>`;
    });

    // 2. Cargar Productos
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
        cuerpoTabla.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            const tr = document.createElement('tr');
            
            // Aquí es donde vinculamos el ID del depto a la fila
            tr.dataset.deptoId = p.departamento || ''; 
            
            // ... dentro de onSnapshot, en el bucle snap.forEach ...
            tr.innerHTML = `
               <td>${p.nombre || 'Sin nombre'}</td>
               <td>${tr.dataset.deptoId || 'GENERAL'}</td>
               <td>$${parseFloat(p.costo || 0).toFixed(2)}</td>
               <td style="color: #10B981; font-weight: bold;">${p.ganancia || 0}%</td>
               <td>$${parseFloat(p.precio || 0).toFixed(2)}</td>
               <td><input type="number" class="input-stock" value="${p.stock || 0}" 
                   onchange="window.actualizarSoloStock('${d.id}', this.value)"></td>
            `;
            cuerpoTabla.appendChild(tr);
        });
    });
}
document.addEventListener('DOMContentLoaded', init);
