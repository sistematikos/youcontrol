import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let listaFiltrada = [];
let indiceSeleccionado = -1;

const buscador = document.getElementById('buscador-prod');
const listaResultados = document.getElementById('lista-resultados');

// 1. CARGAR DEPARTAMENTOS
async function cargarDepartamentos() {
    const deptoSelect = document.getElementById('prod-depto');
    try {
        const snap = await getDocs(collection(db, "usuarios", USER_ID, "departamentos"));
        deptoSelect.innerHTML = '<option value="GENERAL">GENERAL</option>';
        snap.forEach(d => {
            const data = d.data();
            deptoSelect.innerHTML += `<option value="${data.nombre.toUpperCase()}">${data.nombre.toUpperCase()}</option>`;
        });
    } catch(e) { console.error("Error cargando deptos", e); }
}

document.addEventListener('DOMContentLoaded', cargarDepartamentos);

// 2. CÁLCULOS
window.calcularPrecio = function() {
    const costo = parseFloat(document.getElementById('prod-costo').value) || 0;
    const ganancia = parseFloat(document.getElementById('prod-ganancia').value) || 0;
    const nuevoPrecio = costo + (costo * (ganancia / 100));
    document.getElementById('prod-precio').value = nuevoPrecio.toFixed(2);
};

// 3. BÚSQUEDA INTELIGENTE
buscador.addEventListener('input', async (e) => {
    const term = e.target.value.toLowerCase();
    if (term.length < 2) { listaResultados.style.display = 'none'; return; }
    const snap = await getDocs(collection(db, "usuarios", USER_ID, "productos"));
    listaFiltrada = [];
    snap.forEach(d => {
        const data = d.data();
        if (data.nombre?.toLowerCase().includes(term) || data.sku?.toLowerCase().includes(term)) {
            listaFiltrada.push({ id: d.id, ...data });
        }
    });
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

buscador.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && indiceSeleccionado < listaFiltrada.length - 1) { indiceSeleccionado++; renderizarLista(); }
    else if (e.key === 'ArrowUp' && indiceSeleccionado > 0) { indiceSeleccionado--; renderizarLista(); }
    else if (e.key === 'Enter' && indiceSeleccionado > -1) { e.preventDefault(); window.seleccionarProducto(indiceSeleccionado); }
});

window.seleccionarProducto = (i) => {
    const p = listaFiltrada[i];
    document.getElementById('prod-sku').value = p.sku || "";
    document.getElementById('prod-nombre').value = p.nombre || "";
    document.getElementById('prod-barras').value = p.barras || "";
    document.getElementById('prod-costo').value = p.costo || 0;
    document.getElementById('prod-ganancia').value = p.ganancia || 0;
    document.getElementById('prod-precio').value = p.precio || 0;
    document.getElementById('prod-stock').value = p.stock || 0;
    document.getElementById('prod-depto').value = p.departamento?.toUpperCase() || "GENERAL";
    listaResultados.style.display = 'none';
    indiceSeleccionado = -1;
};

// 4. GUARDAR
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
        alert("¡Producto guardado correctamente!");
        buscador.value = "";
    } catch (e) { alert("Error: " + e.message); }
};
