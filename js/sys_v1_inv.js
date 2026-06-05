import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "YC-2026-001"; 
const cuerpoTabla = document.getElementById('cuerpo-tabla');

// --- FILTRO INTELIGENTE ---
window.filtrarPorDepto = () => {
    const select = document.getElementById('filtro-depto');
    const valorFiltro = select.options[select.selectedIndex].text.toLowerCase();
    
    document.querySelectorAll('#cuerpo-tabla tr').forEach(tr => {
        const deptoFila = tr.dataset.nombreDepto.toLowerCase();
        tr.style.display = (select.value === "TODOS" || deptoFila === valorFiltro) ? '' : 'none';
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
    // 1. Cargar Departamentos para el filtro
    const deptoSnap = await getDocs(collection(db, "usuarios", USER_ID, "departamentos"));
    const select = document.getElementById('filtro-depto');
    deptoSnap.forEach(d => {
        const nombre = d.data().nombre; // Asumimos que aquí dice "MOTOS"
        select.innerHTML += `<option value="${nombre}">${nombre}</option>`;
    });

    // 2. Cargar Productos
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
        cuerpoTabla.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            const tr = document.createElement('tr');
            // Guardamos el nombre del departamento en el atributo de datos
            tr.dataset.nombreDepto = p.departamento || 'GENERAL';
            
            tr.innerHTML = `
                <td>${p.nombre || 'Sin nombre'}</td>
                <td>${tr.dataset.nombreDepto}</td>
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
