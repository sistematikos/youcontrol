import { db } from './firebase-config.js';
import { doc, setDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let listaProductosGlobal = []; // <-- LISTA GLOBAL PARA BUSCAR RÁPIDO
let listaFiltrada = [];
let indiceSeleccionado = -1;

const buscador = document.getElementById('buscador-prod');
const listaResultados = document.getElementById('lista-resultados');

// 1. CARGA INICIAL: Cargamos TODO una sola vez
async function cargarDatosIniciales() {
    // Cargar Departamentos
    const deptoSelect = document.getElementById('prod-depto');
    const snapDeptos = await getDocs(query(collection(db, "usuarios", USER_ID, "departamentos"), orderBy("codigo")));
    deptoSelect.innerHTML = '<option value="GENERAL">GENERAL</option>';
    snapDeptos.forEach(d => {
        deptoSelect.innerHTML += `<option value="${d.id}">${d.data().nombre.toUpperCase()}</option>`;
    });

    // Cargar Productos en memoria
    const snapProds = await getDocs(collection(db, "usuarios", USER_ID, "productos"));
    listaProductosGlobal = snapProds.docs.map(d => ({ id: d.id, ...d.data() }));
}

document.addEventListener('DOMContentLoaded', cargarDatosIniciales);

// 2. BÚSQUEDA LOCAL (Mucho más rápida)
buscador.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    if (term.length < 2) { listaResultados.style.display = 'none'; return; }
    
    listaFiltrada = listaProductosGlobal.filter(p => 
        p.nombre?.toLowerCase().includes(term) || 
        p.sku?.toLowerCase().includes(term)
    );
    
    renderizarLista();
});

function renderizarLista() {
    listaResultados.style.display = listaFiltrada.length ? 'block' : 'none';
    listaResultados.innerHTML = listaFiltrada.map((p, i) => `
        <div class="item-res ${i === indiceSeleccionado ? 'selected' : ''}" 
             onclick="window.seleccionarProducto(${i})">
            ${p.nombre} (SKU: ${p.sku})
        </div>
    `).join('');
}

window.seleccionarProducto = (i) => {
    const p = listaFiltrada[i];
    document.getElementById('prod-sku').value = p.sku || "";
    document.getElementById('prod-nombre').value = p.nombre || "";
    document.getElementById('prod-barras').value = p.barras || "";
    document.getElementById('prod-costo').value = p.costo || 0;
    document.getElementById('prod-ganancia').value = p.ganancia || 0;
    document.getElementById('prod-precio').value = p.precio || 0;
    document.getElementById('prod-stock').value = p.stock || 0;
    document.getElementById('prod-depto').value = p.departamento || "GENERAL";
    
    listaResultados.style.display = 'none';
    indiceSeleccionado = -1;
};

// 3. CÁLCULOS Y GUARDADO
window.calcularPrecio = function() {
    const costo = parseFloat(document.getElementById('prod-costo').value) || 0;
    const ganancia = parseFloat(document.getElementById('prod-ganancia').value) || 0;
    const nuevoPrecio = costo + (costo * (ganancia / 100));
    document.getElementById('prod-precio').value = nuevoPrecio.toFixed(2);
};

window.guardarProducto = async function() {
    const sku = document.getElementById('prod-sku').value.trim();
    if (!sku) return alert("El SKU es obligatorio.");
    try {
        await setDoc(doc(db, "usuarios", USER_ID, "productos", sku), {
            sku: sku,
            nombre: document.getElementById('prod-nombre').value,
            barras: document.getElementById('prod-barras').value,
            costo: parseFloat(document.getElementById('prod-costo').value || 0),
            ganancia: parseFloat(document.getElementById('prod-ganancia').value || 0),
            precio: parseFloat(document.getElementById('prod-precio').value || 0),
            stock: parseInt(document.getElementById('prod-stock').value || 0),
            departamento: document.getElementById('prod-depto').value
        });
        alert("¡Producto guardado!");
        // Actualizar lista global tras guardar
        await cargarDatosIniciales();
        buscador.value = "";
    } catch (e) { alert("Error: " + e.message); }
};
