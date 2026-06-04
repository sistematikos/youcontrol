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
        deptoSelect.innerHTML += `<option value="${d.id}">${data.nombre.toUpperCase()}</option>`;
    });

    // 2. Cargar Productos Globales
    const snapProds = await getDocs(collection(db, "usuarios", USER_ID, "productos"));
    listaProductosGlobal = snapProds.docs.map(d => ({ id: d.id, ...d.data() }));
}

// 3. Búsqueda segura (Sin duplicados)
document.getElementById('buscador-prod').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const lista = document.getElementById('lista-resultados');
    if (term.length < 2) { lista.style.display = 'none'; return; }

    const vistos = {};
    const filtrados = listaProductosGlobal.filter(p => {
        const coincide = p.nombre?.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term);
        if (coincide && !vistos[p.id]) {
            vistos[p.id] = true;
            return true;
        }
        return false;
    });

    lista.style.display = 'block';
    lista.innerHTML = filtrados.map(p => `
        <div class="item-res" onclick="window.seleccionar('${p.id}')">
            ${p.nombre} (SKU: ${p.sku})
        </div>
    `).join('');
});

// 4. SELECCIONAR (Carga TODOS los campos correctamente)
window.seleccionar = (id) => {
    const p = listaProductosGlobal.find(x => x.id === id);
    if (!p) return;

    document.getElementById('prod-sku').value = p.sku || "";
    document.getElementById('prod-nombre').value = p.nombre || "";
    document.getElementById('prod-barras').value = p.barras || "";
    document.getElementById('prod-costo').value = p.costo || 0;
    document.getElementById('prod-ganancia').value = p.ganancia || 0;
    document.getElementById('prod-precio').value = p.precio || 0;
    document.getElementById('prod-stock').value = p.stock || 0;
    document.getElementById('prod-depto').value = p.departamento || "GENERAL";
    
    document.getElementById('lista-resultados').style.display = 'none';
    document.getElementById('buscador-prod').value = ""; // Limpiar buscador
};

// 5. Cálculos y Guardado
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
        alert("¡Producto guardado exitosamente!");
        await iniciarFicha(); // Recargar lista tras guardar
    } catch (e) { alert("Error: " + e.message); }
};

document.addEventListener('DOMContentLoaded', iniciarFicha);
