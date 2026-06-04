import { db } from './firebase-config.js';
import { doc, setDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let listaFiltrada = [];
let indiceSeleccionado = -1;

const buscador = document.getElementById('buscador-prod');
const listaResultados = document.getElementById('lista-resultados');

// 1. CARGAR DEPARTAMENTOS (AHORA USA CÓDIGOS)
async function cargarDepartamentos() {
    const deptoSelect = document.getElementById('prod-depto');
    try {
        // Ordenamos por código para que sea más organizado
        const q = query(collection(db, "usuarios", USER_ID, "departamentos"), orderBy("codigo"));
        const snap = await getDocs(q);
        
        deptoSelect.innerHTML = '<option value="GENERAL">GENERAL</option>';
        snap.forEach(d => {
            const data = d.data();
            // El VALUE es el código (d.id), el texto es el nombre (data.nombre)
            deptoSelect.innerHTML += `<option value="${d.id}">${data.nombre.toUpperCase()}</option>`;
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

// ... (BÚSQUEDA INTELIGENTE: Mantenla igual que tenías) ...

window.seleccionarProducto = (i) => {
    const p = listaFiltrada[i];
    document.getElementById('prod-sku').value = p.sku || "";
    document.getElementById('prod-nombre').value = p.nombre || "";
    document.getElementById('prod-barras').value = p.barras || "";
    document.getElementById('prod-costo').value = p.costo || 0;
    document.getElementById('prod-ganancia').value = p.ganancia || 0;
    document.getElementById('prod-precio').value = p.precio || 0;
    document.getElementById('prod-stock').value = p.stock || 0;
    
    // Al seleccionar, asignamos el código del departamento
    document.getElementById('prod-depto').value = p.departamento || "GENERAL";
    listaResultados.style.display = 'none';
    indiceSeleccionado = -1;
};

// 4. GUARDAR (AHORA GUARDA EL CÓDIGO)
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
            // AQUÍ GUARDA EL CÓDIGO SELECCIONADO EN EL SELECT
            departamento: document.getElementById('prod-depto').value 
        });
        alert("¡Producto guardado correctamente!");
        buscador.value = "";
    } catch (e) { alert("Error: " + e.message); }
};
