/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Completo: Ficha de Producto con Cálculos Automáticos
 */

import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let listaProductosGlobal = [];

// Inicialización de la Ficha
async function iniciarFicha() {
    if (!USER_ID) return;
    
    // Configurar el campo de stock como solo lectura
    const stockInput = document.getElementById('prod-stock');
    if (stockInput) stockInput.readOnly = true;

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
}

// Lógica matemática inteligente
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

// Procesar campos con Enter
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

// Guardar
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

// Buscador
document.getElementById('buscador-prod').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const lista = document.getElementById('lista-resultados');
    if (term.length < 2) { lista.style.display = 'none'; return; }

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

// Teclado
document.addEventListener('keydown', (e) => {
    if (e.key === 'F9') { e.preventDefault(); window.guardarProducto(); }
});

document.addEventListener('DOMContentLoaded', iniciarFicha);
