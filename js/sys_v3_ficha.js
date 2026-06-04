import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let listaFiltrada = [];
let indiceSeleccionado = -1;

const buscador = document.getElementById('buscador-prod');
const listaResultados = document.getElementById('lista-resultados');

// BUSCAR AL ESCRIBIR
buscador.addEventListener('input', async (e) => {
    const term = e.target.value.toLowerCase();
    if (term.length < 2) { listaResultados.style.display = 'none'; return; }

    const querySnapshot = await getDocs(collection(db, "usuarios", USER_ID, "productos"));
    listaFiltrada = [];
    querySnapshot.forEach(d => {
        const data = d.data();
        if (data.nombre.toLowerCase().includes(term) || (data.sku && data.sku.toLowerCase().includes(term))) {
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

// NAVEGACIÓN CON TECLADO
buscador.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && indiceSeleccionado < listaFiltrada.length - 1) {
        indiceSeleccionado++;
        renderizarLista();
    } else if (e.key === 'ArrowUp' && indiceSeleccionado > 0) {
        indiceSeleccionado--;
        renderizarLista();
    } else if (e.key === 'Enter' && indiceSeleccionado > -1) {
        e.preventDefault();
        window.seleccionarProducto(indiceSeleccionado);
    }
});

window.seleccionarProducto = (i) => {
    const p = listaFiltrada[i];
    document.getElementById('prod-sku').value = p.sku;
    document.getElementById('prod-nombre').value = p.nombre;
    document.getElementById('prod-precio').value = p.precio;
    document.getElementById('prod-stock').value = p.stock;
    document.getElementById('prod-depto').value = p.departamento;
    listaResultados.style.display = 'none';
    indiceSeleccionado = -1;
};

// GUARDAR
window.guardarProducto = async function() {
    const sku = document.getElementById('prod-sku').value.trim();
    if (!sku) return alert("El SKU es obligatorio.");

    try {
        await setDoc(doc(db, "usuarios", USER_ID, "productos", sku), {
            sku: sku,
            nombre: document.getElementById('prod-nombre').value,
            precio: parseFloat(document.getElementById('prod-precio').value || 0),
            stock: parseInt(document.getElementById('prod-stock').value || 0),
            departamento: document.getElementById('prod-depto').value.toUpperCase()
        });
        alert("¡Producto guardado!");
        buscador.value = "";
    } catch (e) { alert("Error: " + e.message); }
};
