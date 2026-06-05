/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo: Ficha de Producto unificada - Versión Completa y Restaurada
 */

import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, query, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let listaProductosGlobal = [];
let indiceRes = -1;
let tasaBCV = 1.00;

async function iniciarFicha() {
    if (!USER_ID) return;
    try {
        const userDoc = await getDoc(doc(db, "usuarios", USER_ID));
        if (userDoc.exists()) tasaBCV = parseFloat(userDoc.data().tasa_bcv) || 1.00;
    } catch (e) { console.error("Error tasa:", e); }

    const snapDeptos = await getDocs(query(collection(db, "usuarios", USER_ID, "departamentos")));
    const deptoSelect = document.getElementById('prod-depto');
    deptoSelect.innerHTML = '<option value="GENERAL">GENERAL</option>';
    snapDeptos.forEach(d => {
        deptoSelect.innerHTML += `<option value="${d.id}">${d.data().nombre.toUpperCase()}</option>`;
    });

    const snapProds = await getDocs(collection(db, "usuarios", USER_ID, "productos"));
    listaProductosGlobal = snapProds.docs.map(d => ({ id: d.id, ...d.data() }));
}

function evaluarCalculo(str) {
    let s = str.toString().replace(/,/g, '.');
    if (s.includes('+') && s.includes('%')) {
        const partes = s.split('+');
        const base = parseFloat(partes[0]);
        const porcentaje = parseFloat(partes[1].replace('%', ''));
        return base + (base * (porcentaje / 100));
    }
    try { return eval(s) || 0; } catch (e) { return parseFloat(s) || 0; }
}

window.actualizarPrecioBs = function(precioUsd) {
    const inputBs = document.getElementById('prod-precio-bs');
    if (inputBs) inputBs.value = (precioUsd * tasaBCV).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
};

window.calcularPrecio = function() {
    let costo = evaluarCalculo(document.getElementById('prod-costo').value);
    let ganancia = evaluarCalculo(document.getElementById('prod-ganancia').value);
    let precio = costo + (costo * (ganancia / 100));
    document.getElementById('prod-precio').value = precio.toFixed(2);
    window.actualizarPrecioBs(precio);
};

window.procesarCalculoCosto = (input) => { 
    input.value = evaluarCalculo(input.value).toFixed(2); 
    window.calcularPrecio(); 
    document.getElementById('prod-ganancia').focus(); 
};

window.procesarCalculoGanancia = (input) => { 
    input.value = evaluarCalculo(input.value).toFixed(1); 
    window.calcularPrecio(); 
    document.getElementById('prod-precio').focus(); 
};

window.procesarCalculoPrecioManual = (input) => {
    const p = evaluarCalculo(input.value);
    const c = evaluarCalculo(document.getElementById('prod-costo').value);
    if (c > 0) document.getElementById('prod-ganancia').value = (((p - c) / c) * 100).toFixed(1);
    input.value = p.toFixed(2);
    window.actualizarPrecioBs(p);
};

window.guardarProducto = async function() {
    const sku = document.getElementById('prod-sku').value.trim();
    if (!sku) return alert("El SKU es obligatorio.");
    try {
        await setDoc(doc(db, "usuarios", USER_ID, "productos", sku), {
            sku: sku,
            nombre: document.getElementById('prod-nombre').value,
            costo: parseFloat(document.getElementById('prod-costo').value || 0),
            ganancia: parseFloat(document.getElementById('prod-ganancia').value || 0),
            precio: parseFloat(document.getElementById('prod-precio').value || 0),
            departamento: document.getElementById('prod-depto').value
        });
        alert("¡Producto guardado!");
        window.limpiarFormulario();
    } catch (e) { alert("Error: " + e.message); }
};

window.limpiarFormulario = () => {
    ["prod-sku", "prod-nombre", "prod-costo", "prod-ganancia", "prod-precio", "prod-precio-bs", "buscador-prod"].forEach(id => document.getElementById(id).value = "");
    document.getElementById('lista-resultados').style.display = 'none';
};

document.getElementById('buscador-prod').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const lista = document.getElementById('lista-resultados');
    indiceRes = -1;
    if (term.length < 2) { lista.style.display = 'none'; return; }
    const filtrados = listaProductosGlobal.filter(p => p.nombre?.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term));
    lista.style.display = 'block';
    lista.innerHTML = filtrados.map((p, i) => `<div class="item-res" id="res-${i}" onclick="window.cargarProducto('${p.id}')">${p.nombre} (SKU: ${p.sku})</div>`).join('');
});

document.getElementById('buscador-prod').addEventListener('keydown', (e) => {
    const lista = document.getElementById('lista-resultados');
    const items = lista.querySelectorAll('.item-res');
    if (e.key === 'ArrowDown' && indiceRes < items.length - 1) { indiceRes++; items.forEach((it, i) => it.style.background = (i === indiceRes) ? '#F1F5F9' : 'white'); }
    else if (e.key === 'ArrowUp' && indiceRes > 0) { indiceRes--; items.forEach((it, i) => it.style.background = (i === indiceRes) ? '#F1F5F9' : 'white'); }
    else if (e.key === 'Enter' && indiceRes >= 0) { e.preventDefault(); items[indiceRes].click(); }
});

window.cargarProducto = (id) => {
    const p = listaProductosGlobal.find(x => x.id === id);
    if (!p) return;
    document.getElementById('prod-sku').value = p.sku || "";
    document.getElementById('prod-nombre').value = p.nombre || "";
    document.getElementById('prod-costo').value = p.costo || 0;
    document.getElementById('prod-ganancia').value = p.ganancia || 0;
    document.getElementById('prod-precio').value = p.precio || 0;
    document.getElementById('prod-depto').value = p.departamento || "GENERAL";
    window.actualizarPrecioBs(p.precio || 0);
    document.getElementById('lista-resultados').style.display = 'none';
};

document.addEventListener('DOMContentLoaded', iniciarFicha);
