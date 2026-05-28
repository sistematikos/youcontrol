/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Completo de Entrada de Mercancía (sys_v3_comp.js)
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id'); 

let productosLocales = [];
let listaTemporal = []; 
let tasaActual = 1.00;

// Vinculación DOM
const buscador = document.getElementById('buscador-dinamico');
const dropdown = document.getElementById('dropdown-resultados');
const aviso = document.getElementById('aviso-no-registrado');
const inputSku = document.getElementById('comp-sku');
const inputNombre = document.getElementById('comp-nombre');
const inputCosto = document.getElementById('comp-costo');
const inputGanancia = document.getElementById('comp-ganancia');
const inputPrecio = document.getElementById('comp-precio');
const inputPrecioBs = document.getElementById('comp-precio-bs');
const inputCantidad = document.getElementById('comp-cantidad');
const inputBarras = document.getElementById('comp-barras');

// 1. INICIALIZACIÓN Y DATOS
async function cargarConfiguracion() {
    if (!USER_ID) return;
    try {
        const userSnap = await getDoc(doc(db, "usuarios", USER_ID));
        if (userSnap.exists()) {
            tasaActual = parseFloat(userSnap.data().tasa_bcv) || 1.00;
        }
        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
            productosLocales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
    } catch (e) { console.error("Error al cargar:", e); }
}

document.addEventListener('DOMContentLoaded', cargarConfiguracion);

// 2. BUSCADOR INTELIGENTE
buscador.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    if (!val) { dropdown.style.display = 'none'; return; }
    const filtrados = productosLocales.filter(p => p.sku?.toLowerCase().includes(val) || p.nombre?.toLowerCase().includes(val));
    
    dropdown.innerHTML = filtrados.map(p => `<div class="search-item" onclick="window.seleccionar('${p.sku}')">${p.nombre} (SKU: ${p.sku})</div>`).join('');
    dropdown.style.display = filtrados.length ? 'block' : 'none';
});

buscador.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const criterio = buscador.value.trim();
        const prod = productosLocales.find(p => p.sku === criterio || p.barras === criterio);
        
        if (!prod) {
            aviso.style.display = 'block';
            inputSku.value = criterio;
            buscador.value = '';
            inputNombre.focus();
        } else {
            aviso.style.display = 'none';
            window.seleccionar(prod.sku);
        }
    }
});

window.seleccionar = (sku) => {
    const prod = productosLocales.find(p => p.sku === sku);
    if (prod) {
        inputSku.value = prod.sku;
        inputNombre.value = prod.nombre;
        inputCosto.value = prod.costo || 0;
        inputGanancia.value = prod.ganancia || 0;
        inputPrecio.value = prod.precio || 0;
        aviso.style.display = 'none';
        dropdown.style.display = 'none';
        window.calcularPreciosCompra();
    }
};

// 3. MATEMÁTICA Y CÁLCULOS
window.calcularPreciosCompra = () => {
    const c = parseFloat(inputCosto.value) || 0;
    const g = parseFloat(inputGanancia.value) || 0;
    const p = c + (c * (g / 100));
    inputPrecio.value = p.toFixed(2);
    inputPrecioBs.value = (p * tasaActual).toFixed(2).replace('.', ',') + " Bs.";
};

window.calcularDesdeBs = () => {
    const vBs = parseFloat(inputPrecioBs.value.replace(',', '.')) || 0;
    if (tasaActual > 0 && vBs > 0) {
        const pUsd = vBs / tasaActual;
        inputPrecio.value = pUsd.toFixed(2);
        const c = parseFloat(inputCosto.value) || 0;
        if (c > 0) inputGanancia.value = (((pUsd - c) / c) * 100).toFixed(1);
    }
};

// 4. GESTIÓN DE LISTA Y GUARDADO
window.agregarALista = () => {
    const item = {
        sku: inputSku.value, nombre: inputNombre.value,
        cant: parseInt(inputCantidad.value) || 0,
        precio: parseFloat(inputPrecio.value) || 0,
        costo: inputCosto.value, ganancia: inputGanancia.value
    };
    if (!item.sku || !item.nombre) return alert("Faltan datos");
    listaTemporal.push(item);
    renderizarTabla();
    limpiarFormulario();
};

function renderizarTabla() {
    const tbody = document.getElementById('tabla-items-compra');
    tbody.innerHTML = listaTemporal.map((item, i) => `
        <tr><td>${item.sku}</td><td>${item.nombre}</td><td>${item.cant}</td><td>$${item.precio}</td>
        <td><button onclick="listaTemporal.splice(${i},1); renderizarTabla()">X</button></td></tr>
    `).join('');
}

window.procesarIngresoMercancia = async () => {
    for (const item of listaTemporal) {
        const prodActual = productosLocales.find(p => p.sku === item.sku);
        await setDoc(doc(db, "usuarios", USER_ID, "productos", item.sku), {
            ...item,
            stock: (prodActual?.stock || 0) + item.cant
        }, { merge: true });
    }
    alert("Operación Exitosa");
    listaTemporal = [];
    renderizarTabla();
};

function limpiarFormulario() {
    inputSku.value = ''; inputNombre.value = ''; inputCantidad.value = '0';
    inputCosto.value = '0.00'; inputPrecio.value = '0.00'; inputPrecioBs.value = '';
    buscador.focus();
}
