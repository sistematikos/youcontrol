/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Completo: Ficha de Producto unificada
 */

import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let listaProductosGlobal = [];
let indiceRes = -1; // Variable necesaria para navegación con teclado

// Inicialización
async function iniciarFicha() {
    if (!USER_ID) return;
    const stockInput = document.getElementById('prod-stock');
    if (stockInput) stockInput.readOnly = true;

    const deptoSelect = document.getElementById('prod-depto');
    const snapDeptos = await getDocs(query(collection(db, "usuarios", USER_ID, "departamentos")));
    
    deptoSelect.innerHTML = '<option value="GENERAL">GENERAL</option>';
    snapDeptos.forEach(d => {
        deptoSelect.innerHTML += `<option value="${d.id}">${d.data().nombre.toUpperCase()}</option>`;
    });

    const snapProds = await getDocs(collection(db, "usuarios", USER_ID, "productos"));
    listaProductosGlobal = snapProds.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Lógica matemática
function evaluarCalculo(str) {
    let s = str.toString().replace(/,/g, '.');
    if (s.includes('+') && s.includes('%')) {
        const partes = s.split('+');
        const base = parseFloat(partes[0]);
        const porcentaje = parseFloat(partes[1].replace('%', ''));
        return base + (base * (porcentaje / 100));
    }
    try { return eval(s); } catch (e) { return parseFloat(s) || 0; }
}

// Funciones de Cálculo
window.actualizarPrecioBs = function(precioUsd) {
    const tasa = parseFloat(localStorage.getItem('tasa_bcv') || 1);
    document.getElementById('prod-precio-bs').value = (precioUsd * tasa).toLocaleString('es-VE', {minimumFractionDigits: 2});
};

window.calcularPrecio = function() {
    let costo = evaluarCalculo(document.getElementById('prod-costo').value);
    let ganancia = evaluarCalculo(document.getElementById('prod-ganancia').value);
    let precio = costo + (costo * (ganancia / 100));
    document.getElementById('prod-precio').value = precio.toFixed(2);
    window.actualizarPrecioBs(precio);
};

window.procesarCalculoCosto = function(input) {
    input.value = evaluarCalculo(input.value).toFixed(2);
    window.calcularPrecio();
    document.getElementById('prod-ganancia').focus();
};

window.procesarCalculoGanancia = function(input) {
    input.value = evaluarCalculo(input.value).toFixed(1);
    window.calcularPrecio();
    document.getElementById('prod-precio').focus();
};

// Acciones principales
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
        await iniciarFicha();
        window.limpiarFormulario();
    } catch (e) { alert("Error: " + e.message); }
};

window.limpiarFormulario = () => {
    document.getElementById('buscador-prod').value = "";
    document.getElementById('prod-sku').value = "";
    document.getElementById('prod-nombre').value = "";
    document.getElementById('prod-barras').value = "";
    document.getElementById('prod-costo').value = "";
    document.getElementById('prod-ganancia').value = "";
    document.getElementById('prod-precio').value = "";
    document.getElementById('prod-stock').value = "";
    document.getElementById('prod-depto').value = "GENERAL";
    document.getElementById('lista-resultados').style.display = 'none';
};

// Buscador Inteligente
document.getElementById('buscador-prod').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const lista = document.getElementById('lista-resultados');
    indiceRes = -1;
    if (term.length < 2) { lista.style.display = 'none'; return; }

    const filtrados = Array.from(new Set(listaProductosGlobal.map(p => p.id)))
        .map(id => listaProductosGlobal.find(p => p.id === id))
        .filter(p => p.nombre?.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term));

    lista.style.display = 'block';
    lista.innerHTML = filtrados.map((p, i) => `
        <div class="item-res" id="res-${i}" onclick="window.cargarProducto('${p.id}')">
            ${p.nombre || "Sin nombre"} (SKU: ${p.sku || "Sin SKU"})
        </div>
    `).join('');
});

// Navegación con teclado en el buscador
document.getElementById('buscador-prod').addEventListener('keydown', (e) => {
    const lista = document.getElementById('lista-resultados');
    const items = lista.querySelectorAll('.item-res');
    if (e.key === 'ArrowDown' && indiceRes < items.length - 1) {
        indiceRes++;
        actualizarSeleccion(items);
    } else if (e.key === 'ArrowUp' && indiceRes > 0) {
        indiceRes--;
        actualizarSeleccion(items);
    } else if (e.key === 'Enter' && indiceRes >= 0 && items[indiceRes]) {
        e.preventDefault();
        items[indiceRes].click();
    }
});

function actualizarSeleccion(items) {
    items.forEach((item, idx) => {
        item.style.background = (idx === indiceRes) ? '#F1F5F9' : 'white';
    });
}

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
    document.getElementById('prod-depto').value = p.departamento || "GENERAL";
    document.getElementById('lista-resultados').style.display = 'none';
};

// Atajos globales (F9)
document.addEventListener('keydown', (e) => {
    if (e.key === 'F9') { e.preventDefault(); window.guardarProducto(); }
});

document.addEventListener('DOMContentLoaded', iniciarFicha);
