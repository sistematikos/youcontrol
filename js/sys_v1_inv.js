import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, updateDoc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id') || "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
const cuerpoTabla = document.getElementById('cuerpo-tabla');
let tasaActual = 1.00;

// --- FILTRO DE DEPARTAMENTOS CORREGIDO ---
window.filtrarPorDepto = () => {
    const val = document.getElementById('filtro-depto').value.toLowerCase();
    const filas = document.querySelectorAll('#cuerpo-tabla tr');
    
    filas.forEach(tr => {
        const deptoFila = tr.cells[3].innerText.trim().toLowerCase();
        tr.style.display = (val === "todos" || deptoFila === val) ? '' : 'none';
    });
};

// --- BUSCADOR ---
document.getElementById('buscador-inv').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#cuerpo-tabla tr').forEach(tr => {
        tr.style.display = tr.innerText.toLowerCase().includes(term) ? '' : 'none';
    });
});

// --- ACTUALIZACIÓN DE STOCK ---
window.actualizarSoloStock = async (id, nuevoStock) => {
    try {
        await updateDoc(doc(db, "usuarios", USER_ID, "productos", id), { stock: parseInt(nuevoStock) || 0 });
    } catch (e) { alert("Error al guardar: " + e.message); }
};

// --- INICIALIZACIÓN ---
async function init() {
    const userDoc = await getDoc(doc(db, "usuarios", USER_ID));
    if (userDoc.exists()) tasaActual = parseFloat(userDoc.data().tasa_bcv) || 1.00;

    // Cargar Departamentos
    const deptoSnap = await getDocs(collection(db, "usuarios", USER_ID, "departamentos"));
    const select = document.getElementById('filtro-depto');
    
    deptoSnap.forEach(d => {
        const nombre = d.data().nombre;
        select.innerHTML += `<option value="${nombre.toLowerCase()}">${nombre.toUpperCase()}</option>`;
    });

    // Renderizar Productos
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
        cuerpoTabla.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            cuerpoTabla.innerHTML += `
                <tr>
                    <td>${p.barras || ''}</td>
                    <td>${p.sku || ''}</td>
                    <td>${p.nombre || ''}</td>
                    <td>${p.departamento || 'GENERAL'}</td>
                    <td>$${parseFloat(p.costo || 0).toFixed(2)}</td>
                    <td>${p.ganancia || 0}%</td>
                    <td>$${parseFloat(p.precio || 0).toFixed(2)}</td>
                    <td>$${(parseFloat(p.precio || 0) * tasaActual).toFixed(2)} Bs</td>
                    <td><input type="number" class="input-stock" value="${p.stock || 0}" 
                        onchange="window.actualizarSoloStock('${d.id}', this.value)"></td>
                </tr>`;
        });
    });
}

document.addEventListener('DOMContentLoaded', init);
