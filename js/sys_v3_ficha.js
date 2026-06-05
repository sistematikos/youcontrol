/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo: Ficha de Producto (Corregido)
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
        if (userDoc.exists()) {
            tasaBCV = parseFloat(userDoc.data().tasa_bcv) || 1.00;
        }
    } catch (e) { console.error("Error tasa:", e); }

    const deptoSelect = document.getElementById('prod-depto');
    const snapDeptos = await getDocs(query(collection(db, "usuarios", USER_ID, "departamentos")));
    
    deptoSelect.innerHTML = '<option value="GENERAL">GENERAL</option>';
    snapDeptos.forEach(d => {
        deptoSelect.innerHTML += `<option value="${d.id}">${d.data().nombre.toUpperCase()}</option>`;
    });

    const snapProds = await getDocs(collection(db, "usuarios", USER_ID, "productos"));
    listaProductosGlobal = snapProds.docs.map(d => ({ id: d.id, ...d.data() }));
}

function evaluarCalculo(str) {
    let s = str.toString().replace(/,/g, '.');
    try { return eval(s) || 0; } catch (e) { return parseFloat(s) || 0; }
}

window.actualizarPrecioBs = function(precioUsd) {
    const inputBs = document.getElementById('prod-precio-bs');
    if (inputBs) {
        inputBs.value = (precioUsd * tasaBCV).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
};

window.calcularPrecio = function() {
    let costo = evaluarCalculo(document.getElementById('prod-costo').value);
    let ganancia = evaluarCalculo(document.getElementById('prod-ganancia').value);
    let precio = costo + (costo * (ganancia / 100));
    document.getElementById('prod-precio').value = precio.toFixed(2);
    window.actualizarPrecioBs(precio);
};

window.procesarCalculoCosto = (input) => { window.calcularPrecio(); document.getElementById('prod-ganancia').focus(); };
window.procesarCalculoGanancia = (input) => { window.calcularPrecio(); document.getElementById('prod-precio').focus(); };

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
        alert("¡Guardado!");
        window.location.reload();
    } catch (e) { alert("Error: " + e.message); }
};

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
