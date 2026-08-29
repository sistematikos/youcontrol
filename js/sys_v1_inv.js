import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, updateDoc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Obtener dinámicamente el ID de la empresa activa desde el navegador
const USER_ID = localStorage.getItem('youcontrol_empresa_id');

if (!USER_ID) {
    alert("Sesión no encontrada o expirada. Inicie sesión nuevamente.");
    window.location.href = 'index.html';
}

const cuerpoTabla = document.getElementById('cuerpo-tabla');
const mapaDeptos = {};
let tasaBCV = 1.00;

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

// --- GUARDAR STOCK ---
window.actualizarSoloStock = async (id, val) => {
    try {
        await updateDoc(doc(db, "usuarios", USER_ID, "productos", id), { stock: parseInt(val) || 0 });
    } catch (error) {
        console.error("Error al actualizar stock:", error);
        alert("No se pudo actualizar el stock.");
    }
};

// --- INICIALIZACIÓN ---
async function init() {
    try {
        // 1. Obtener tasa y Departamentos del documento de la empresa
        const userDoc = await getDoc(doc(db, "usuarios", USER_ID));
        if (userDoc.exists()) {
            tasaBCV = parseFloat(userDoc.data().tasa_bcv) || 1.00;
        }

        const deptoSnap = await getDocs(collection(db, "usuarios", USER_ID, "departamentos"));
        const select = document.getElementById('filtro-depto');
        
        // Limpiamos y dejamos la opción base con value="todos" en minúsculas para que coincida con el filtro
        select.innerHTML = `<option value="todos">TODOS LOS DEPARTAMENTOS</option>`;

        deptoSnap.forEach(d => {
            const dataDepto = d.data();
            const nombre = dataDepto.nombre || dataDepto.descripcion || 'Sin nombre';
            mapaDeptos[d.id] = nombre;
            select.innerHTML += `<option value="${d.id}">${nombre.toUpperCase()}</option>`;
        });

        // 2. Cargar Productos en tiempo real con onSnapshot
        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
            cuerpoTabla.innerHTML = "";
            
            if (snap.empty) {
                cuerpoTabla.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748B;">No hay productos registrados.</td></tr>`;
                return;
            }

            snap.forEach(d => {
                const p = d.data();
                const precioUSD = parseFloat(p.precio || 0);
                const precioBs = (precioUSD * tasaBCV).toFixed(2);
                
                const tr = document.createElement('tr');
                tr.dataset.deptoId = p.departamento || ''; 
                
                const nombreDeptoMostrado = mapaDeptos[tr.dataset.deptoId] || 'GENERAL';
                
                tr.innerHTML = `
                    <td>${p.nombre || p.descripcion || 'Sin nombre'}</td>
                    <td>${nombreDeptoMostrado}</td>
                    <td>$${parseFloat(p.costo || 0).toFixed(2)}</td>
                    <td style="color: #6366f1; font-weight: bold;">${p.ganancia || p.porcentaje || 0}%</td>
                    <td>$${precioUSD.toFixed(2)} / <b>${precioBs} Bs</b></td>
                    <td><input type="number" class="input-stock" value="${p.stock || 0}" 
                        onchange="window.actualizarSoloStock('${d.id}', this.value)"></td>
                `;
                cuerpoTabla.appendChild(tr);
            });
        });
    } catch (error) {
        console.error("Error al inicializar inventario:", error);
    }
}

document.addEventListener('DOMContentLoaded', init);
