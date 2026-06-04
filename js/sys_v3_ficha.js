import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let listaProductosGlobal = [];

async function iniciarFicha() {
    if (!USER_ID) return;

    // 1. Cargar Departamentos
    const deptoSelect = document.getElementById('prod-depto');
    const snapDeptos = await getDocs(query(collection(db, "usuarios", USER_ID, "departamentos")));
    
    deptoSelect.innerHTML = '<option value="GENERAL">GENERAL</option>';
    snapDeptos.forEach(d => {
        deptoSelect.innerHTML += `<option value="${d.id}">${d.data().nombre.toUpperCase()}</option>`;
    });

    // 2. Cargar Productos
    const snapProds = await getDocs(collection(db, "usuarios", USER_ID, "productos"));
    listaProductosGlobal = snapProds.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log("Productos cargados:", listaProductosGlobal.length);
}

document.getElementById('buscador-prod').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const lista = document.getElementById('lista-resultados');
    if (term.length < 2) { lista.style.display = 'none'; return; }

    // Filtro único por ID para evitar duplicados
    const filtrados = Array.from(new Set(listaProductosGlobal.map(p => p.id)))
        .map(id => listaProductosGlobal.find(p => p.id === id))
        .filter(p => p.nombre?.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term));

    lista.style.display = 'block';
    lista.innerHTML = filtrados.map(p => `
        <div class="item-res" onclick="window.cargarProducto('${p.id}')">
            ${p.nombre || "Sin nombre"} (SKU: ${p.sku || "Sin SKU"})
        </div>
    `).join('');
});

// Función global para que el onclick funcione
window.cargarProducto = (id) => {
    const p = listaProductosGlobal.find(x => x.id === id);
    if (!p) return;

    document.getElementById('prod-sku').value = p.sku || "";
    document.getElementById('prod-nombre').value = p.nombre || "";
    document.getElementById('prod-barras').value = p.barras || "";
    document.getElementById('prod-costo').value = p.costo || 0;
    document.getElementById('prod-ganancia').value = p.ganancia || 0;
    document.getElementById('prod-precio').value = p.precio || 0;
    document.getElementById('prod-stock').value = p.stock || 0;
    
    // Intento de asignar departamento
    const sel = document.getElementById('prod-depto');
    sel.value = p.departamento || "GENERAL";
    
    document.getElementById('lista-resultados').style.display = 'none';
};

document.addEventListener('DOMContentLoaded', iniciarFicha);
