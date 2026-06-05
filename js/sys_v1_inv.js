import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "YC-2026-001"; 
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const mapaDeptos = {}; // Diccionario para guardar ID -> Nombre

// --- FILTRO ---
window.filtrarPorDepto = () => {
    const select = document.getElementById('filtro-depto');
    const valorFiltro = select.value.trim().toLowerCase();
    
    document.querySelectorAll('#cuerpo-tabla tr').forEach(tr => {
        const deptoFila = (tr.dataset.deptoId || "").trim().toLowerCase();
        tr.style.display = (valorFiltro === "todos" || deptoFila === valorFiltro) ? '' : 'none';
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
    // 1. Cargar Departamentos y llenar el mapa
    const deptoSnap = await getDocs(collection(db, "usuarios", USER_ID, "departamentos"));
    const select = document.getElementById('filtro-depto');
    
    deptoSnap.forEach(d => {
        const nombre = d.data().nombre;
        mapaDeptos[d.id] = nombre; // Guardamos en el diccionario
        select.innerHTML += `<option value="${d.id}">${nombre.toUpperCase()}</option>`;
    });

    // 2. Cargar Productos
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
        cuerpoTabla.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            const tr = document.createElement('tr');
            
            const deptoId = p.departamento || '';
            tr.dataset.deptoId = deptoId; 
            
            // Usamos el mapa para mostrar el nombre bonito en la celda
            const nombreDeptoMostrado = mapaDeptos[deptoId] || 'GENERAL';
            
            tr.innerHTML = `
                <td>${p.nombre || 'Sin nombre'}</td>
                <td>${nombreDeptoMostrado}</td>
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
