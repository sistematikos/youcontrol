import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, updateDoc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "YC-2026-001"; 
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const mapaDeptos = {};
let tasaBCV = 1.00; // Variable para almacenar la tasa

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
    // 1. Obtener tasa y Departamentos
    const userDoc = await getDoc(doc(db, "usuarios", USER_ID));
    if (userDoc.exists()) {
        tasaBCV = parseFloat(userDoc.data().tasa_bcv) || 1.00;
    }

    const deptoSnap = await getDocs(collection(db, "usuarios", USER_ID, "departamentos"));
    const select = document.getElementById('filtro-depto');
    
    deptoSnap.forEach(d => {
        const nombre = d.data().nombre;
        mapaDeptos[d.id] = nombre;
        select.innerHTML += `<option value="${d.id}">${nombre.toUpperCase()}</option>`;
    });

    // 2. Cargar Productos
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
        cuerpoTabla.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            const precioUSD = parseFloat(p.precio || 0);
            const precioBs = (precioUSD * tasaBCV).toFixed(2); // Cálculo del precio en Bs
            
            const tr = document.createElement('tr');
            tr.dataset.deptoId = p.departamento || ''; 
            
            const nombreDeptoMostrado = mapaDeptos[tr.dataset.deptoId] || 'GENERAL';
            
            tr.innerHTML = `
                <td>${p.nombre || 'Sin nombre'}</td>
                <td>${nombreDeptoMostrado}</td>
                <td>$${parseFloat(p.costo || 0).toFixed(2)}</td>
                <td style="color: #6366f1; font-weight: bold;">${p.ganancia || 0}%</td>
                <td>$${precioUSD.toFixed(2)} / <b>${precioBs} Bs</b></td>
                <td><input type="number" class="input-stock" value="${p.stock || 0}" 
                    onchange="window.actualizarSoloStock('${d.id}', this.value)"></td>
            `;
            cuerpoTabla.appendChild(tr);
        });
    });
}
document.addEventListener('DOMContentLoaded', init);
