/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Completo: Ficha de Producto unificada
 */

import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, query, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let listaProductosGlobal = [];
let indiceRes = -1;
let tasaBCV = 1.00;

async function iniciarFicha() {
    if (!USER_ID) return;
    
    // Cargar Tasa BCV desde el documento del usuario
    try {
        const userDoc = await getDoc(doc(db, "usuarios", USER_ID));
        if (userDoc.exists()) {
            tasaBCV = parseFloat(userDoc.data().tasa_bcv) || 1.00;
        }
    } catch (e) {
        console.error("Error cargando tasa:", e);
    }

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

window.actualizarPrecioBs = function(precioUsd) {
    const totalBs = precioUsd * tasaBCV;
    const inputBs = document.getElementById('prod-precio-bs');
    if(inputBs) {
        inputBs.value = totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
};

window.calcularPrecio = function() {
    let costo = evaluarCalculo(document.getElementById('prod-costo').value);
    let ganancia = evaluarCalculo(document.getElementById('prod-ganancia').value);
    let precio = costo + (costo * (ganancia / 100));
    document.getElementById('prod-precio').value = precio.toFixed(2);
    window.actualizarPrecioBs(precio);
};

// Lógica de Enter
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

// Cálculo inverso (Precio -> Ganancia)
window.procesarCalculoPrecioManual = function(input) {
    const p = evaluarCalculo(input.value);
    const c = evaluarCalculo(document.getElementById('prod-costo').value);
    if (c > 0) {
        const ganancia = ((p - c) / c) * 100;
        document.getElementById('prod-ganancia').value = ganancia.toFixed(1);
    }
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
            barras: document.getElementById('prod-barras').value,
            costo: parseFloat(document.getElementById('prod-costo').value || 0),
            ganancia: parseFloat(document.getElementById('prod-ganancia').value || 0),
            precio: parseFloat(document.getElementById('prod-precio').value || 0),
            stock: parseInt(document.getElementById('prod-stock').value || 0),
            departamento: document.getElementById('prod-depto').value
        });
        alert("¡Producto guardado!");
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
    document.getElementById('prod-precio-bs').value = "";
    document.getElementById('prod-stock').value = "";
    document.getElementById('prod-depto').value = "GENERAL";
    document.getElementById('lista-resultados').style.display = 'none
