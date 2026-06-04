import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let listaProductosGlobal = [];

async function iniciarFicha() {
    if (!USER_ID) return console.error("No hay ID de empresa");

    // 1. Cargar Departamentos
    const deptoSelect = document.getElementById('prod-depto');
    const snapDeptos = await getDocs(query(collection(db, "usuarios", USER_ID, "departamentos")));
    
    deptoSelect.innerHTML = '<option value="GENERAL">GENERAL</option>';
    snapDeptos.forEach(d => {
        const data = d.data();
        // Guardamos el ID del doc como value (ej: 020)
        deptoSelect.innerHTML += `<option value="${d.id}">${data.nombre.toUpperCase()}</option>`;
    });

    // 2. Cargar Productos Globales
    const snapProds = await getDocs(collection(db, "usuarios", USER_ID, "productos"));
    listaProductosGlobal = snapProds.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log("Productos cargados:", listaProductosGlobal.length);
}

// Búsqueda simple
document.getElementById('buscador-prod').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const lista = document.getElementById('lista-resultados');
    if (term.length < 2) { lista.style.display = 'none'; return; }

    const filtrados = listaProductosGlobal.filter(p => 
        p.nombre?.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term)
    );

    lista.style.display = 'block';
    lista.innerHTML = filtrados.map(p => `
        <div class="item-res" onclick="window.seleccionar('${p.id}')">
            ${p.nombre} (SKU: ${p.sku})
        </div>
    `).join('');
});

window.seleccionar = (id) => {
    const p = listaProductosGlobal.find(x => x.id === id);
    document.getElementById('prod-sku').value = p.sku;
    document.getElementById('prod-nombre').value = p.nombre;
    document.getElementById('prod-depto').value = p.departamento; // Esto pondrá 020
    document.getElementById('lista-resultados').style.display = 'none';
};

document.addEventListener('DOMContentLoaded', iniciarFicha);
